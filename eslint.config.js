// ESLint flat config for Vite + React + TypeScript (ESLint v9)
// - Type-aware rules are enabled only for source files under src/
// - Scripts and generated assets are ignored or linted without type-checking

import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // Ignore build artifacts and generated data
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".vite/**",
      "public/data/**",
      "tmp/**",
    ],
  },

  // Base recommended JS rules
  js.configs.recommended,

  // TypeScript (non-type-checked) defaults for any TS file
  ...tseslint.configs.recommended,

  // React hooks and refresh rules for app source files
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Node globals for scripts
  {
    files: ["scripts/**/*.{ts,js,cjs}", "*.{js,ts,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
