import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import * as path from 'path'
import { loadYaml } from './yaml'
import logging from '../logging'


function dropKeys<T>(input: T | string, keysToDrop: string[]): T {
  const obj = typeof input === 'string' ? JSON.parse(input) : structuredClone(input)

  for (const path of keysToDrop) {
    const segments = path.split('.')
    let target: any = obj

    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i]
      const next = isNaN(Number(key)) ? key : Number(key)

      if (target[next] === undefined) {
        target = undefined
        break
      }
      target = target[next]
    }

    if (target !== undefined) {
      const finalKey = segments[segments.length - 1]
      const final = isNaN(Number(finalKey)) ? finalKey : Number(finalKey)
      delete target[final]
    }
  }

  return obj
}


export interface GlotstackConfig {
  outputDir?: string
  sourcePath: string
  sourceLocale: string
  outputLocales: string[]
  apiOrigin?: string
  apiKey: string
  projectId?: string
}

/**
 * Recursively looks for `.glotstack.json` from the current directory up to the root.
 * @param startDir The directory to start the search from. Defaults to process.cwd().
 * @returns The absolute path to the file if found, or null if not found.
 */
export async function findGlotstackConfig(startDir: string = process.cwd()): Promise<GlotstackConfig | null> {
  let currentDir = path.resolve(startDir)
  let configPath = null

  while (true) {
    const jsonCandidate = path.join(currentDir, '.glotstack.json')
    const yamlCandidate = path.join(currentDir, '.glotstack.yaml')
    const jsonExists = existsSync(jsonCandidate)
    const yamlExists = existsSync(yamlCandidate)
    if (jsonExists && yamlExists) {
      console.error('Both .glotstack.json and .glotstack.yaml exist, please delete one\n\n  json: ', jsonCandidate, '\n  yaml: ', yamlCandidate)
      throw new Error('Two config formats cannot be used at the same time')

    } else if (jsonExists) {
      configPath = jsonCandidate
    } else if (yamlExists) {
      configPath = yamlCandidate
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break // Reached root
    }
    currentDir = parentDir
  }

  let config: GlotstackConfig

  if (configPath != null) {
    logging.info('Loading config file at ', configPath)
    try {
      const content = await readFile(configPath)
      const text = content.toString()
      if (path.parse(configPath).ext === '.yaml') {
        config = loadYaml(text) as GlotstackConfig
      } else {
        config = JSON.parse(text)
      }
      logging.info('Loaded config file', configPath, dropKeys(config, ["apiKey"]))
      return config
    } catch (err) {
      logging.warn('Could not load config', configPath)
    }
  }
  logging.warn('Could not find any .glotstack config files')
  return null
}
