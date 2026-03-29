[![npm version](https://badge.fury.io/js/glotstack.svg?icon=si%3Anpm)](https://badge.fury.io/js/glotstack)

# Glotstack

Glotstack is an internationalization and localization tool (translations). This package
contains a simple React/Typescript SDK. It also contains a command-line interface
to fetch and extract translations for your source code.

[glotstack.ai](https://glotstack.ai)


## Prerequisites

This project requires NodeJS (version 20 or later) and NPM.
To make sure you have them available on your machine,
try running the following command, I recommend using [asdf](https://asdf-vm.com/guide/introduction.html)

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
  // fetch() from static directories to limit bundle sizes.
  // If you don't care about bundling you can always do 
  // `import(...)`
  // your project supports dynamic imports and json files
  return fetch(`/static/translations/${locale}.json`)
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

**Note: Dynamic imports are usually better for SSR and fetch() for client side.**

Use the hook in your component 

```tsx
import * as React from 'react'
import {useGlotstack} from 'glotstack'

function MyComponent() => {
  const {t} = useGlotstack()

  return <div>{t('Quickstart.hero-title')}</div>
}
```


## Get translations

```
yarn glotstack get-translations --api-key <api-key>
```

Glotstack will fetch the translations defined by `outputLocales` in your config
or `--output-locales` via CLI. You can specify `outputDir` (`--output-dir`) or
they will be written to the same directory as `sourcePath` (`--source-path`).




## Authors

* **JD Cumpson** - *Founder* - [JD](https://github.com/jdcumpson)


## License

[MIT License](https://andreasonny.mit-license.org/2019) © Andrea SonnY