export interface JSONArray extends Array<JSONValue> {}
export type LocaleRegion = string


export interface TranslationLeaf {
  value: string
  context?: string
}

export interface Translations {
  [key: string]: Translations | TranslationLeaf
}

export interface TranslateOptsBase {
  locale?: LocaleRegion
  assigns?: Record<string, React.ReactNode>
}

export type TranslateFn = {
  (key: string, opts: TranslateOptsBase & { asString: true }): string
  (
    key: string,
    opts?: TranslateOptsBase & { asString?: false },
  ): React.ReactNode
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONArray
  | JSONObject

export interface JSONObject {
  [key: string]: JSONValue
}