[![npm version](https://badge.fury.io/js/glotstack.svg?icon=si%3Anpm)](https://badge.fury.io/js/glotstack)

# Glotstack

Glotstack is an internationalization and localization tool (translations). This package
contains a simple React/Typescript SDK. It also contains a command-line interface
to fetch and extract translations for your source code.

[glotstack.ai](https://glotstack.ai)


## Prerequisites

This project requires NodeJS (version 20 or later) and NPM.
To make sure you have them available on your machine,
I recommend using [asdf](https://asdf-vm.com/guide/introduction.html) if you do not have a preferred setup.

## Table of contents

- [Glotstack](#glotstack)
  - [Table of contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Basics](#basics)
    - [Get Translations](#get-translations)
    - [Create your source locale file](#create-your-source-locale-file)
    - [React app](#react-app)
    - [Variable substitutions](#variable-substitutions)
  - [Recipes](#recipes)
  - [API](#api)
  - [Getting Your Translations](#get-translations)
  - [Credits](#credits)
  - [Authors](#authors)
  - [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

## Installation


To install and set up the library, run:

```sh
$ yarn add glotstack
```

Or if you prefer using npm:

```sh
$ npm install glotstack
```

## Usage

See quickstart instructions [here](https://glotstack.ai/quickstart)

### Basics


#### Glotstack Config
Add a `.glotstack.json` or `.glotstack.yaml` file in the root of your project.
Yaml is preferred because it's a config language that allows comments.

```yaml
# .glotstack.yaml

# path to where you will keep your translation files
sourcePath: './domains/application/translations'

# [optional] where to output the files to if not the same as sourcePath - this is usually not necessary
outputDir: './domains/application/translations'

# what locales you want to get translations for
outputLocales:
  - fr-FR
  - th-TH
  # ...etc

# you *can* put your api key here if you trust the file and/or don't check it into vcs
# alternatively, you can use --api-key on the CLI
apiKey: HBZYpOiMCFQ/FeryMnFvKx3Zafee/mA1B/ExRcGv6QuGy/vvffU0g6xjO/4tZw4b

# [optional] for using different projects with your key
projectId: glotstack

usage:
  # Context to help out your translator - add context about your application or use-case.
  # Multilines are fine!
  context: |
    The app is a translation application that helps users generate localized translations to
    use as product copy without the help of human translators.

  # Any proper nouns that should not be translated, i.e. names of things
  properNouns:
    - React
    - Glotstack
```

#### Create your source locale file

You can use `en-US.json` or `en-US.yaml` files as source translation files. Internally
Glotstack uses YAML because it allows comments and is nice (once you get used to it).

In your folder of choice (usually somewhere in your `src`) add your `en-US.json` or `en-US.yaml`
files, you will need it to match `sourcePath` in your config or `--source-path` when using CLI.

The source file will not be translated and should contain your translations in the following format:

```yaml
Anything:
  aRbITraRy:
    value: A string to translate
    context: what the string is used for or what it means to your audience
```

Every value you want translated should have a context but it isn't required -- you will just
get poorer results.


**Note: If you use the `.yaml` file you will most-likely want to use the yaml-to-json CLI tool** 

Because setting up your build to import JSON or YAML would be annoying, the sub-command `yaml-to-json`
was added to the `glostack` command. I use it with `nodemon`, but because I didn't want to bloat this
packages bundle I did not make it a peer dependency. To make it convenient, add a `package.json` script. 
Below is a script that converts your YAML file to the same name JSON file. Then your imports will all be JSON files.

If this is too annoying, just use `en-US.json`.

First add nodemon 

```
yarn add nodemon
```

then add the script

```json
{
  "scripts": {
    "watch.translations": "nodemon --watch . --ext yaml --exec \"bash -c 'yarn glotstack yaml-to-json'\"",
  }
}
```


#### React app 

Add the provider globally to your application

```tsx
import * as React from 'react'
import { GlotstackProvider } from 'glotstack'

const importMethod = (locale: string) => {
  return import(`/static/translations/${locale}.json`)
}

const Application = () => {
  const locale = 'en-US' // replace with your locale source
  return (
    <GlotstackProvider initialLocale={locale} importMethod={importMethod}>
      <MyComponent />
    </GlotstackProvider>
  )
}
```


#### External translation file bundling

If you don't want to bundle your translations into your build
you can always build them and point Glotstack to these files
fetching them asynchronously.

Update your import method to 

```tsx
const importMethod = (locale: string) => {
  return fetch(`/static/translations/${locale}.json`)
}
```

And your files will be pulled at run-time. For projects
running on Cloudflare pages this may be useful to keep the
main bundle small. If you are using regular workers you probably
should use the regular `import()` method above.

**Note:** You will want to decide how you wnat to sign your files
to make sure that you are not allowing script injection into
your endpoint. This is outside of the scope of Glotstack but
I may provide guidance on this in the future.

Use the hook in your component 

```tsx
import * as React from 'react'
import {useGlotstack} from 'glotstack'

function MyComponent() => {
  const {t} = useGlotstack()

  return <div>{t('Quickstart.hero-title')}</div>
}
```

#### Variable substitutions 

Glotstack allows very flexible variable substutions so you
can render just about any React component however you like.

##### Assigns

In Glotstack every call to `t` (or translate) you may provide
options that include `assigns`. You can pass any variable in
the `assigns` that you wish to replace in the translation key.

Example

```json
// en-US.json
{"SomeKey": {
  "value": "This is my {{substitution}}"
}}
```

```tsx
import {useGlotstack} from 'glotstack'

const MyComponent = () => {
  const {t} = useGlotstack()

  return (
    <div>
      {t('SomeKey', {assigns: {substitution: 4}})}
    </div>
  )
}
```

You can use any `React.Node` compatible value. Sometimes it
may be useful to nest translations within each other - but 
more useful is embedding other components.

Example

```tsx
import {useGlotstack} from 'glotstack'

const MyComponent = () => {
  const {t} = useGlotstack()

  const internalNode = <SomeOtherNode/>

  return (
    <div>
      {t('SomeKey', {assigns: {substitution: internalNode}})}
    </div>
  )
}
```

But writing internal nodes like this can become annoying
especially if you are using components for formatting and 
styling, so you may also provide component style substitutions
for example

Example

```json
// en-US.json
{"SomeKey": {
  "value": "This is my <Bold/>{{substitution}}</Bold>"
}}
```

```tsx
import {useGlotstack} from 'glotstack'

const Bold = (props: React.PropsWithChildren) => {
  return <div className='bold'>{props.children}</div>
}

const MyComponent = () => {
  const {t} = useGlotstack()

  return (
    <div>
      {t('SomeKey', {assigns: {substitution: 4, Bold }})}
    </div>
  )
}
```

But you don't have to pass it just as a function component,
ypu may pass actual nodes that will be cloned and used -- 
be careful with this implementation for performance.

Example

```json
// en-US.json
{"SomeKey": {
  "value": "This is my <Bold/>{{substitution}}</Bold>"
}}
```

```tsx
import {useGlotstack} from 'glotstack'

const Bold = (props: React.PropsWithChildren) => {
  return <div className='bold'>{props.children}</div>
}

const MyComponent = () => {
  const {t} = useGlotstack()
  const bold = <Bold/>

  return (
    <div>
      {t('SomeKey', {assigns: {substitution: 4, Bold: bold }})}
    </div>
  )
}
```



## Getting Your translations

```
yarn glotstack get-translations --api-key <api-key>
```

Glotstack will fetch the translations defined by `outputLocales` in your config
or `--output-locales` via CLI. You can specify `outputDir` (`--output-dir`) or
they will be written to the same directory as `sourcePath` (`--source-path`).


## Recipes

Some useful recipes that can be used to speed up development

### Standardized Formatting Assignments



## Authors

* **JD Cumpson** - *Founder* - [JD](https://github.com/jdcumpson)


## License

[MIT License](https://andreasonny.mit-license.org/2019) © Andrea SonnY