import globals from "globals"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"
import i18next from "eslint-plugin-i18next"

export default defineConfig([
  globalIgnores([
    "node_modules/*",
    "dist/*",
    "**/*.d.ts",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      semi: ["error", "never"],
    },
  },
  tseslint.configs.base,
  i18next.configs["flat/recommended"],
])
