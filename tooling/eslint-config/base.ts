import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"
import tseslint from "typescript-eslint"

/**
 * Shared ESLint config.
 *
 * `tsconfigRootDir` is required: each package passes its own directory via
 * `import.meta.dirname` from its `eslint.config.ts`. Setting it explicitly
 * stops typescript-eslint from inferring the root — an inference that turns
 * ambiguous when one ESLint process loads several packages' configs at once.
 */
export function config(tsconfigRootDir: string) {
  return defineConfig(
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        parserOptions: { tsconfigRootDir },
      },
    },
    {
      plugins: {
        turbo: turboPlugin,
      },
      rules: {
        "turbo/no-undeclared-env-vars": "warn",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
    {
      ignores: [
        "dist/**",
        ".next/**",
        "**/.turbo/**",
        "**/coverage/**",
        "**/playwright-report/**",
        "**/test-results/**",
      ],
    }
  )
}
