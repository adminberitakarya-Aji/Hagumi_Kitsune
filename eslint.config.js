import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // Service worker berjalan di konteks ServiceWorkerGlobalScope, bukan DOM/Node —
  // deklarasikan globals-nya agar no-undef tidak salah flags (apps/web/public/sw.js).
  {
    files: ["**/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        URL: "readonly",
        clients: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
    },
  },
);
