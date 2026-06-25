import { Command, program } from "commander"
import path from "path"
import { promises as fs } from "fs"
import { findGlotstackConfig, GlotstackConfig } from "./util/findConfig"
import { cwd } from "process"
import { merge, unflatten } from "./util/object"
import { dumpYaml, loadYaml } from "./util/yaml"
import eslint from "eslint"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { FormData } from "undici"
import { openAsBlob } from "node:fs"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fetchGlotstack } from "./util/fetchGlotstack"
import logging from "./logging"
import { waitForFile } from "./util/waitForFile"
import { Translations } from "./types"

const DEFAULT_OPTIONS: Record<string, string> = {
  sourceDir: ".",
  sourceLocale: "en-US",
  importSourceType: "json",
  apiOrigin: "https://glotstack.ai",
  yaml: "false",
}

async function resolveSourceFile(
  sourcePath: string,
  sourceFile: string,
): Promise<{
  content: string
  path: string
  type: "yaml" | "json"
  extension: string
}> {
  let extensions = ["json", "yaml", "yml"]
  const sourceParts = sourceFile.split(".")
  if (sourceParts.length > 1) {
    sourceParts.splice(sourceParts.length - 1, 1)
  }
  const sourceName = `${sourceParts.join(".")}`

  return new Promise((resolve, reject) => {
    let finished = false

    const resolutions = extensions.map(async (extension) => {
      const absPath = path.resolve(sourcePath, `${sourceName}.${extension}`)
      if (finished) {
        return
      }
      const content = await fs.readFile(absPath, "utf-8")
      if (finished) {
        return
      }

      finished = true
      const type = extension === "json" ? "json" : "yaml"
      resolve({ content, path: absPath, type, extension })
    })

    Promise.allSettled(resolutions).finally(() => {
      if (!finished) {
        reject(Error(`Could not resolve source file: \n\n ${sourcePath}`))
      }
    })
  })
}

async function resolveConfigAndOptions(
  options: Record<string, any>,
): Promise<GlotstackConfig & { yes?: boolean; yaml?: boolean }> {
  const config = (await findGlotstackConfig(cwd())) ?? {}
  const resolved = merge<GlotstackConfig>(
    {} as GlotstackConfig,
    DEFAULT_OPTIONS,
    config,
    options,
  )

  // resolve output to source dir if left empty
  if (resolved.outputDir == null) {
    resolved.outputDir = resolved.sourceDir
  }

  if (resolved.importSourceFile == null) {
    resolved.importSourceFile = `${resolved.sourceLocale}.${resolved.importSourceType}`
  }

  if ("outputLocales" in options) {
    if ((resolved.outputLocales as string[]).includes(resolved.sourceLocale)) {
      logging.warn(
        `${resolved.sourceLocale} detected in outputLocales, removing`,
      )
      options.outputLocales = options.outputLocales.filter(
        (x: string) => x !== resolved.sourceLocale,
      )
    }
  }
  return resolved
}

async function run(args: string[]) {
  program
    .command("extract-translations")
    .description("extract translations from all compatible source files.")
    .option(
      "--source-dir [path]",
      `path directory containing [locale].json files (default=${DEFAULT_OPTIONS["sourceDir"]})`,
    )
    .option(
      "--source-locale [locale]",
      `the locale you provide "context" in, your primary locale (default=${DEFAULT_OPTIONS["sourceLocale"]})`,
    )
    .option("--yaml", "Use a .yaml source file and allow conversion to JSON")
    .option(
      "--api-origin [url]",
      `glotstack api origin (default=${DEFAULT_OPTIONS["apiOrigin"]})`,
    )
    .option(
      "--output-dir [path]",
      `path to output directory (default=<source-dir>)`,
    )
    .option("--api-key [key]", "api key for glotstack.ai")
    .option("--yes", "skip confirm checks")
    .argument("[directories...]", "Directories to scan", "./**/*")
    .action(
      async (directories: string[], inputOptions: Record<string, any>) => {
        const options = await resolveConfigAndOptions(inputOptions)
        if (!options.apiOrigin) {
          throw new Error("apiOrigin must be specified")
        }

        const linter = new eslint.ESLint({
          overrideConfigFile: path.join(
            __dirname,
            "..",
            "eslint-raw-string.mjs",
          ),
        })
        const results = await linter.lintFiles(directories)
        const filesWithIssues = results
          .filter((r) => r.errorCount + r.warningCount > 0)
          .map((r) => r.filePath)

        const rl = readline.createInterface({ input, output })
        const askToSend = async (): Promise<boolean> => {
          if (options.yes) {
            return true
          }
          const response = await rl.question(
            `Your source are going to be sent to our LLM -- they should not contain any secrets. Proceed? (yes/no):`,
          )
          if (response === "yes") {
            return true
          } else if (response !== "no") {
            logging.error("Please respond with yes or no.")
            return askToSend()
          } else {
            return false
          }
        }

        const send = await askToSend()
        if (send) {
          logging.info(
            "Sending files to generate new source and extracted strings",
          )
          let url = `${options.apiOrigin}/uploads/translations/extract`

          if (options.yaml) {
            url = `${url}?yaml=true`
          }

          const form = new FormData()

          for (let i = 0; i < filesWithIssues.length; i++) {
            const filePath = filesWithIssues[i]
            form.append(`file_${i}`, await openAsBlob(filePath), filePath)
            logging.debug(`Uploading file: ${filePath}`)
          }
          const response = await fetchGlotstack(url, options.apiKey, form)
          const data = (
            (await response.json()) as {
              data: {
                translations: {
                  name: string
                  modified_source: { url: string }
                }[]
              }
            }
          ).data
          data.translations.map((elem) =>
            logging.info(
              `Source and translations available for: ${elem.name}:\n  ${elem.modified_source.url}\n\n`,
            ),
          )
          rl.close()
        } else {
          rl.close()
        }
      },
    )

  program
    .command("get-translations")
    .description(
      "fetch translations for all [output-locals...]. Use .glotstack.json for repeatable results.",
    )
    .option(
      "--source-dir [path]",
      `path directory containing [locale].json files (default=${DEFAULT_OPTIONS["sourceDir"]})`,
    )
    .option(
      "--source-locale [locale]",
      `the locale you provide "context" in, your primary locale (default=${DEFAULT_OPTIONS["sourceLocale"]})`,
    )
    .option("--yaml", "Expect to use yaml source file")
    .option(
      "--api-origin [url]",
      `glotstack api origin (default=${DEFAULT_OPTIONS["apiOrigin"]})`,
    )
    .option(
      "--output-dir [path]",
      "path to output directory (default=<source-dir>",
    )
    .option("--api-key [key]", "api key for glotstack.ai")
    .option("--project-id [id]", "(optional) specific project to use")
    .option("--only [locale]", "(optional) only translate for this locale")
    .argument("[output-locales...]", "locales to get translations for")
    .action(
      async (
        outputLocales: string[],
        options: Record<string, any>,
        command: Command,
      ) => {
        const resolved = await resolveConfigAndOptions({
          ...options,
          outputLocales: outputLocales,
        })
        if (!resolved.sourceDir) {
          throw new Error("sourceDir must be specified")
        }
        if (!resolved.apiOrigin) {
          throw new Error("apiOrigin must be specified")
        }
        if (!resolved.outputDir) {
          throw new Error("outputDir must be specified")
        }

        const ext = options.yaml == true ? ".yaml" : ".json"
        const absPath = path.resolve(
          resolved.sourceDir,
          `${resolved.sourceLocale}${ext}`,
        )
        const fileContent = await fs.readFile(absPath, "utf-8")

        let json = null
        try {
          json = loadYaml(fileContent)
        } catch (err) {
          try {
            json = JSON.parse(fileContent)
          } catch (err) {
            logging.error("Unable to parse source file ", absPath, err)
            throw err
          }
        }
        let locales: string[] = (resolved.outputLocales as string[]).map(
          (l) => l,
        )
        if (options.only != null) {
          locales = locales.filter((l) => l === options.only)
        }

        const body = {
          locales,
          translations: json,
          usage: options.usage,
          ...{
            ...(resolved.projectId != null
              ? { projectId: resolved.projectId }
              : {}),
          },
        }

        logging.info("Getting translations for: ", locales)
        const url = `${resolved.apiOrigin}/api/translations`
        const response = await fetchGlotstack(url, resolved.apiKey, body)
        const data = await response.json()
        const urlMap = (data as { data: Record<string, { url: string }> }).data
        const translationsMap = Object.entries(urlMap)
          .map(([locale, data]): [string, Promise<any>] => {
            return [
              locale,
              waitForFile<Translations>(data.url, resolved.apiKey),
            ]
          })
          .reduce(
            (map, [locale, promise]) => {
              map[locale] = promise
              return map
            },
            {} as { [key: string]: Promise<any> },
          )

        if (options.yaml) {
          const fp = `${resolved.outputDir}/${path.parse(absPath).name}.json`
          logging.info(`Writing file ${fp}`)
          fs.writeFile(fp, JSON.stringify(json, null, 2), "utf-8")
        }

        logging.info("Waiting for translations", Object.keys(translationsMap))

        await Promise.all(
          Object.entries(translationsMap).map(async ([locale, promise]) => {
            const val = await promise
            const p = `${resolved.outputDir}/${locale}.json`
            logging.info(`Writing file ${p}`)
            await fs.writeFile(
              `${resolved.outputDir}/${locale}.json`,
              JSON.stringify(val, null, 2),
              "utf-8",
            )
          }),
        )
      },
    )

  program
    .command("yaml-to-json")
    .option(
      "--source-dir [path]",
      `path directory containing [locale].json files (default=${DEFAULT_OPTIONS["sourceDir"]})`,
    )
    .action(async (inputOptions: Record<string, any>) => {
      const options = await resolveConfigAndOptions(inputOptions)

      const absPath = path.resolve(
        options.sourceDir,
        `${options.sourceLocale}.yaml`,
      )
      const fileContent = await fs.readFile(absPath, "utf-8")
      const fp = `${options.outputDir}/${path.parse(absPath).name}.json`
      const json = loadYaml(fileContent)
      logging.info(`Writing file ${fp}`)
      fs.writeFile(fp, JSON.stringify(json, null, 2), "utf-8")
    })

  program
    .command("format-json")
    .description("format files in --source-dir [path] to nested (not flat)")
    .option(
      "--source-dir [path]",
      `path directory containing [locale].json files (default=${DEFAULT_OPTIONS["sourceDir"]})`,
    )
    .option("--yes", "skip confirm checks")
    .action(async (inputOptions: Record<string, any>) => {
      const options = await resolveConfigAndOptions(inputOptions)

      if (!options.sourceDir) {
        throw new Error("sourceDir must be specified")
      }
      const rl = readline.createInterface({ input, output })
      const askToSend = async (): Promise<boolean> => {
        if (options.yes) {
          return true
        }
        const response = await rl.question(
          `This will update your source files -- have you checked them into SCM/git? Type yes to proceed (yes/no):`,
        )
        if (response === "yes") {
          return true
        } else if (response !== "no") {
          logging.error("Please respond with yes or no.")
          return askToSend()
        } else {
          return false
        }
      }
      const yes = await askToSend()
      if (yes) {
        const files = await readdir(options.sourceDir)
        for (let i = 0; i < (await files).length; i++) {
          const fp = resolve(options.sourceDir, files[i])
          const text = await readFile(fp, "utf-8")
          const json = JSON.parse(text)
          const formatted = JSON.stringify(unflatten(json), null, 2)
          await writeFile(fp, formatted, "utf-8")
        }
        rl.close()
      }
      rl.close()
    })

  program
    .command("import-react-i18next")
    .option(
      "--source-dir [path]",
      `path of directory containing [locale].json files (default=${DEFAULT_OPTIONS["sourceDir"]})`,
    )
    .option(
      "--source-file [filename.json]",
      `path of directory containing [locale].json files (default=${DEFAULT_OPTIONS["sourceLocale"]}.json)`,
    )
    .option(
      "--output-dir [path]",
      `path of directory to write files to (default=<source-dir>`,
    )
    .option(
      "--yaml",
      `write translation files as YAML (default=${DEFAULT_OPTIONS["yaml"]})`,
      DEFAULT_OPTIONS["yaml"],
    )
    .option(
      "--source-locale [locale]",
      `the locale you provide "context" in, your primary locale (default=${DEFAULT_OPTIONS["sourceLocale"]})`,
      DEFAULT_OPTIONS["sourceLocale"],
    )
    .action(async (inputOptions: Record<string, any>) => {
      const options = await resolveConfigAndOptions(inputOptions)
      options.importSourceFile = inputOptions.sourceFile

      const { content: content, type } = await resolveSourceFile(
        options.sourceDir,
        options.importSourceFile,
      )

      const json = type === "json" ? JSON.parse(content) : loadYaml(content)
      const extension = options.yaml ? "yaml" : "json"

      const body = {
        source_locale: options.sourceLocale,
        translations: json,
        usage: options.importUsage,
      }

      const url = `${options.apiOrigin}/api/imports`
      const response = await fetchGlotstack(url, options.apiKey, body)
      const { data } = (await response.json()) as {
        data: { url: string }
        status: "ok" | "error"
      }

      console.info(data)

      const outputPath = path.join(
        options.outputDir,
        `${options.sourceLocale}.${extension}`,
      )

      const importedContent = await waitForFile(data.url, options.apiKey)
      const outputString = options.yaml
        ? dumpYaml(importedContent)
        : JSON.stringify(importedContent, null, 2)
      logging.info(`Writing file ${outputPath}`)
      fs.writeFile(outputPath, outputString, "utf-8")
    })

  await program.parseAsync(args)
}

run(process.argv)
