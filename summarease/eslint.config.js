import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This repo currently relies on `any` in many integration points (Supabase, Gemini, etc.).
      // Keep typecheck strict, but don't block lint on incremental typing work.
      '@typescript-eslint/no-explicit-any': 'off',

      // Fast refresh is a dev-only optimization; avoid blocking lint on export patterns.
      'react-refresh/only-export-components': 'off',
    },
  },
])
