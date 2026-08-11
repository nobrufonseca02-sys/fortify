import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      // TODO: existing `any` debt is tracked as warnings so CI can gate on new
      // errors without blocking on ~330 pre-existing occurrences. Tighten back
      // to "error" once the backlog is paid down.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // React Hooks rules only make sense for the frontend — applying them
    // project-wide false-positives on backend code whose functions happen to
    // start with "use" (e.g. Baileys' useMultiFileAuthState in
    // services/whatsapp-agent, not a React hook).
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
);
