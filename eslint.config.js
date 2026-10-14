import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "output/**",
      "outputs/**",
      "coverage/**",
      // Not valid JavaScript on disk. paginator.ts substitutes {{PW}},
      // {{FILL}}, {{DOC_TITLE}} and friends before the text is handed to
      // page.evaluate(), so parsers reject it. See AI_DIARY P9 and P45.
      "packages/core/src/paginator-algo.js",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // The codebase uses `catch {}` deliberately where the failure is not
      // actionable; an empty block is the intended form there.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Unused function arguments are common in plugin signatures.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },

  {
    files: ["scripts/**/*.js", "packages/*/scripts/**/*.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
