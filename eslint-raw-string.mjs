import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import i18next from 'eslint-plugin-i18next';


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { globals: globals.browser } },
  globalIgnores([
    'node_modules/*', // ignore node modules
    '**/*.d.ts', // ignore type definitions
  ]),
  tseslint.configs.base,
  i18next.configs['flat/recommended'],
]);
