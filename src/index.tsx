import * as React from 'react'
import { merge } from './util/object'
import logging from './logging'

export { default as logger, setLogLevel, LogLevel } from "./logging"
export { LocaleRegion, JSONArray, Translations } from './types'

import type { LocaleRegion, TranslateFn, TranslateOptsBase, Translations, JSONArray } from './types'

export interface ContextType {
  translations: Record<string, Translations>
  locale: string | null
  loadTranslations: (locale: LocaleRegion) => Promise<Translations>
  setLocale: (locale: LocaleRegion) => void
  importMethod: (locale: LocaleRegion) => Promise<Translations>
  t: TranslateFn
}

export const GlotstackContext = React.createContext<ContextType>({
  translations: {},
  loadTranslations: () => { throw new Error('no import method set') },
  setLocale: (_locale: LocaleRegion) => { throw new Error('import method not set') },
  locale: null,
  importMethod: (_locale: LocaleRegion) => { throw new Error('import method not set') },
  t: () => { throw new Error('import method not set') },
})

interface GlotstackProviderProps {
  children: React.ReactNode
  initialTranslations?: Record<string, Translations>
  initialLocale?: LocaleRegion
  onTranslationLoaded?: (locale: LocaleRegion, translations: Translations) => void
  onLocaleChange?: (locale: LocaleRegion) => void
  importMethod: ContextType['importMethod']
  ssr?: boolean
}


export const access = (key: string, locale: LocaleRegion, translations: Translations) => {
  if (translations == null) {
    return key
  }
  const access = [...key.split('.')] as [LocaleRegion, ...string[]]
  const localeTranslations = translations?.[locale]

  if (localeTranslations == null) {
    return key
  }

  const value = access.reduce((acc: Translations[string], key) => {
    // @ts-expect-error expected
    return acc?.[key]
  }, localeTranslations)

  return (value?.value ?? key) as string
}


function isAsStringTrue(
  opts: (TranslateOptsBase & { asString?: boolean }) | undefined,
): opts is TranslateOptsBase & { asString: true } {
  return opts?.asString === true
}

function translate(
  key: string,
  opts: {
    locale?: LocaleRegion
    assigns?: Record<string, React.ReactNode>
    asString?: boolean
    glotstack: ReturnType<typeof useGlotstack>
    globalLocale: LocaleRegion
    translations: Record<LocaleRegion, Translations>
    localeRef: React.MutableRefObject<LocaleRegion>
    accessedRef: React.MutableRefObject<Record<string, Record<string, string>>>
    extractionsRef: React.MutableRefObject<
      Record<
        string,
        Record<string, ParsedSimplePlaceholder[] | undefined> | undefined
      >
    >
    outputRef: React.MutableRefObject<
      Record<string, Record<string, React.ReactNode | undefined> | undefined>
    >
  },
): string | React.ReactNode {
  const {
    glotstack,
    globalLocale,
    translations,
    localeRef,
    accessedRef,
    extractionsRef,
    outputRef,
  } = opts
  const locale = opts?.locale ?? globalLocale
  localeRef.current = locale
  glotstack.loadTranslations(localeRef.current)

  let string = ''
  if (translations != null) {
    string = access(key, locale, translations ?? {})
  }

  if (string === key) return key

  if (outputRef.current == null) {
    outputRef.current = {}
  }

  if (!outputRef.current[locale]) {
    outputRef.current[locale] = {}
  }

  if (!accessedRef.current[locale]) {
    accessedRef.current[locale] = {}
  }

  // if (
  //   outputRef.current[locale]?.[key] != null &&
  //   string === accessedRef.current[locale]?.[key]
  // ) {
  //   console.info('returning cached', key, outputRef.current[locale]![key])
  //   return outputRef.current[locale]![key]
  // }

  accessedRef.current[locale] ??= {}
  accessedRef.current[locale][key] = string

  extractionsRef.current[locale] ??= {}
  if (!extractionsRef.current[locale]![key]) {
    const newExtractions = extractSimplePlaceholders(string)
    extractionsRef.current[locale]![key]! = newExtractions
  }

  if (outputRef.current[locale] == null) {
    outputRef.current[locale] = {}
  }

  // TODO: cache assigns as part of cache key -- otherwise multiple invocations wont work
  // if (outputRef.current[locale]![key] == null) {
  let output: Iterable<React.ReactNode> | undefined | React.ReactNode = renderPlaceholdersToNodes(
    string,
    extractionsRef.current[locale]![key]!,
    opts?.assigns ?? {},
  )
  outputRef.current[locale]![key] = output
  // }

  output = outputRef.current[locale]![key]

  if (isAsStringTrue(opts)) {
    // Convert any possible value to string safely
    output = Array.isArray(output)
      ? output.join('')
      : typeof output === 'string'
        ? output
        : String(output ?? '')

    if (outputRef.current != null) {
      outputRef.current[locale]![key] = output
    }
  }
  return output as React.ReactNode
}

function createTranslate(
  glotstack: ReturnType<typeof useGlotstack>,
  globalLocale: LocaleRegion,
  translations: Record<LocaleRegion, Translations>,
  localeRef: React.MutableRefObject<LocaleRegion>,
  accessedRef: React.MutableRefObject<Record<string, Record<string, string>>>,
  extractionsRef: React.MutableRefObject<
    Record<
      string,
      Record<string, ParsedSimplePlaceholder[] | undefined> | undefined
    >
  >,
  outputRef: React.MutableRefObject<
    Record<string, Record<string, React.ReactNode | undefined> | undefined>
  >,
): TranslateFn {
  function t(
    key: string,
    opts?: {
      locale?: LocaleRegion
      assigns?: Record<string, React.ReactNode>
      asString: true
    },
  ): string
  function t(
    key: string,
    opts?: {
      locale?: LocaleRegion
      assigns?: Record<string, React.ReactNode>
      asString?: false
    },
  ): React.ReactNode
  function t(
    key: string,
    opts?: {
      locale?: LocaleRegion
      assigns?: Record<string, React.ReactNode>
      asString?: boolean
    },
  ) {
    return translate(
      key,
      merge<Parameters<typeof translate>[1]>(
        {
          glotstack,
          globalLocale,
          translations,
          localeRef,
          accessedRef,
          extractionsRef,
          outputRef,
        },
        opts ?? {},
      ),
    )
  }

  return t
}

// export const useReduxGlotstack = () => {
//   const glotstack = useGlotstack()
//   const globalLocale = useSelector(selectLocale)
//   const localeRef = React.useRef(globalLocale)
//   localeRef.current = globalLocale

//   const translations = useSelector(selectTranslations)

//   React.useEffect(() => {
//     glotstack.loadTranslations(localeRef.current)
//   }, [localeRef.current])

//   const accessedRef = React.useRef<Record<string, Record<string, string>>>({})
//   const extractionsRef = React.useRef<
//     Record<string, Record<string, ParsedSimplePlaceholder[]>>
//   >({})
//   const outputRef = React.useRef<
//     Record<string, Record<string, React.ReactNode>>
//   >({})

//   const t: TranslateFn = React.useMemo(() => {
//     return createTranslate(
//       glotstack,
//       globalLocale,
//       translations ?? {},
//       localeRef,
//       accessedRef,
//       extractionsRef,
//       outputRef,
//     )
//   }, [globalLocale, translations])

//   return { t }
// }

export const GlotstackProvider = ({ children, initialLocale, initialTranslations, onLocaleChange, onTranslationLoaded, importMethod }: GlotstackProviderProps) => {
  if (initialLocale == null) {
    throw new Error('initialLocale must be set')
  }
  const [locale, setLocale] = React.useState<LocaleRegion>(initialLocale)
  const translationsRef = React.useRef<Record<string, Translations> | null>(initialTranslations || null)
  const accessedRef = React.useRef<Record<string, Record<string, string>>>({})
  const outputRef = React.useRef<Record<string, Record<string, React.ReactNode>>>({})
  const extractionsRef = React.useRef<Record<string, Record<string, ParsedSimplePlaceholder[]>>>({})
  const loadingRef = React.useRef<Record<string, Promise<Translations>>>({})
  const localeRef = React.useRef<string>('en-US')
  const optionsRef = React.useRef<Record<string, any>>({})
  const [translations, setTranslations] = React.useState(translationsRef.current)

  const loadTranslations = React.useCallback(async (locale: string, opts?: { force?: boolean }) => {
    // TODO: if translations are loaded only reload if some condition is
    try {
      if (loadingRef.current?.[locale] != null && opts?.force != true) {
        logging.debug('Waiting for translations already loading', locale, loadingRef.current)
        return (await loadingRef.current?.[locale])
      }
      if (translationsRef.current?.[locale] != null && opts?.force != true) {
        logging.debug('Skipping load for translations', locale, translationsRef.current?.[locale], translationsRef.current)
        return translationsRef.current?.[locale]
      }
      if (loadingRef.current != null) {
        loadingRef.current[locale] = importMethod(locale)
        logging.debug('Loading translations', locale)
      }
      const result = await loadingRef.current[locale]

      if (result == null) {
        throw new Error(`Failed to load translation ${locale} ${JSON.stringify(result)}`)
      }
      if (translationsRef.current) {
        translationsRef.current[locale] = result
      } else {
        translationsRef.current = { [locale]: result }
      }

      setTranslations({ ...translationsRef.current })
      onTranslationLoaded?.(locale, result)
      return result
    } catch (err) {
      logging.error('Unable to import translations', err)
      throw err
    }
  }, [importMethod, onTranslationLoaded])

  React.useEffect(() => {
    const run = async () => {
      onLocaleChange?.(locale)
      await loadTranslations(locale)
    }
    React.startTransition(() => {
      run()
    })
  }, [locale])

  const context = React.useMemo(() => {
    const context: ContextType = {
      setLocale,
      translations: translations ?? {},
      locale,
      importMethod,
      loadTranslations,
      t: () => '',
    }
    localeRef.current = locale

    const t = createTranslate(
      context,
      context.locale ?? 'en-US',
      context.translations ?? {},
      localeRef,
      accessedRef,
      extractionsRef,
      outputRef,
    )

    context.t = t
    return context

  }, [locale, importMethod, loadTranslations, translations])

  return <GlotstackContext.Provider value={context}>
    {children}
  </GlotstackContext.Provider>
}

export const useGlotstack = () => {
  return React.useContext(GlotstackContext)
}

export const useTranslations = (_options?: Record<never, never>) => {
  const context = React.useContext(GlotstackContext)
  return context
}


export type ParsedSimplePlaceholder = {
  key: string
  options: string[]
  raw: string
  index: number
  kind: 'doubleCurly' | 'component'
}

const curlyRegex = /(?<!\\)({{\s*([a-zA-Z0-9_]+)\s*(?:,\s*([^{}]*?))?\s*}})/g
const componentRegex = /<([A-Z][a-zA-Z0-9]*)>([\s\S]*?)<\/\1>/g

export function extractSimplePlaceholders(input: string): ParsedSimplePlaceholder[] {
  const results: ParsedSimplePlaceholder[] = []

  for (const match of input.matchAll(curlyRegex)) {
    const raw = match[1]
    const key = match[2]
    const rawOptions = match[3]
    const index = match.index ?? -1

    const options = rawOptions
      ? rawOptions.split(',').map(opt => opt.trim()).filter(Boolean)
      : []

    results.push({ key, options, raw, index, kind: 'doubleCurly' })
  }

  for (const match of input.matchAll(componentRegex)) {
    const raw = match[0]
    const key = match[1]
    const index = match.index ?? -1

    results.push({ key, options: [], raw, index, kind: 'component' })
  }

  return results.sort((a, b) => a.index - b.index)
}

type Renderer = (props: { children: React.ReactNode }) => React.ReactNode

export function renderPlaceholdersToNodes(
  input: string,
  placeholders: ParsedSimplePlaceholder[],
  assigns: Record<string, React.ReactNode | Renderer>
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let cursor = 0

  for (const { index, raw, key, kind } of placeholders) {
    if (index < cursor) {
      continue
    }
    if (cursor < index) {
      nodes.push(input.slice(cursor, index))
    }
    let value: React.ReactNode = raw

    if (kind === 'component') {
      const Render = assigns[key]
      const openTag = `<${key}>`
      const closeTag = `</${key}>`
      const inner = raw.slice(openTag.length, raw.length - closeTag.length)
      const innerPlaceholders = extractSimplePlaceholders(inner)
      const children =
        innerPlaceholders.length > 0
          ? renderPlaceholdersToNodes(inner, innerPlaceholders, assigns)
          : [inner]

      if (React.isValidElement(Render)) {
        value = React.cloneElement(Render, {}, children)
      } else if (typeof Render === 'function') {
        value = <Render>{children}</Render>
      } else {
        logging.warn(`Invalid assign substitution for:\n\n  ${raw}\n\nDid you remember to pass assigns?\n`,
          `
t('key', { assigns: {
  ${key}: <something />  // children will be copied via React.cloneElement
}})\n\nor\n
t('key', { assigns: {
  ${key}: MyComponent  // component will be rendered with <Component/>
}})\n
`
        )
      }
    } else if (kind === 'doubleCurly') {
      const Render = assigns[key]
      value = typeof Render !== 'function' ? Render : raw ?? raw
    }
    nodes.push(value)
    cursor = index + raw.length
  }

  if (cursor < input.length) {
    nodes.push(input.slice(cursor))
  }

  // Unescape \{{...}} to {{...}}, and wrap ReactNodes
  return nodes.map((node, i) =>
    typeof node === 'string'
      ? node.replace(/\\({{[^{}]+}})/g, '$1')
      : <React.Fragment key={i}>{node}</React.Fragment>
  )
}

// export function renderPlaceholdersToNodes(input: string,
//   placeholders: ParsedSimplePlaceholder[],
//   assigns: Record<string, React.ReactNode | Renderer>) {
//   const nodes: React.ReactNode[] = []
//   let cursor = 0

//   for (const { index, raw, key, kind } of placeholders) {
//     if (index < cursor) continue
//     if (cursor < index) nodes.push(input.slice(cursor, index))

//     if (kind === 'component') {
//       const opening = `<${key}>`
//       const closing = `</${key}>`
//       const inner = raw.slice(opening.length, raw.length - closing.length)
//       const innerPlaceholders = extractSimplePlaceholders(inner)
//       const children = innerPlaceholders.length
//         ? renderPlaceholdersToNodes(inner, innerPlaceholders, assigns)
//         : [inner]

//       const Render = assigns[key]
//       if (React.isValidElement(Render)) {
//         nodes.push(React.cloneElement(Render, {}, children))
//       } else if (typeof Render === 'function') {
//         nodes.push(<Render>{children}</Render>)
//       } else {
//         logging.warn(/* existing warning */)
//         nodes.push(raw)
//       }
//     } else {
//       const Render = assigns[key]
//       nodes.push(typeof Render !== 'function' ? Render : raw)
//     }

//     cursor = index + raw.length
//   }

//   if (cursor < input.length) nodes.push(input.slice(cursor))
//   return nodes.map((node, i) =>
//     typeof node === 'string' ? node.replace(/\\({{[^{}]+}})/g, '$1') : <React.Fragment key={i}>{node}</React.Fragment>
//   )
// }




export function useRenderPlaceholdersToNodes(...args: Parameters<typeof renderPlaceholdersToNodes>) {
  const nodes = React.useMemo(() => renderPlaceholdersToNodes(...args), [...args])
  return nodes
}
