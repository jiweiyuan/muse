import tseslint from "@typescript-eslint/eslint-plugin"
import parser from "@typescript-eslint/parser"

const eslintConfig = [
  {
    ignores: ["dist/**", "node_modules/**", "*.js"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]

export default eslintConfig
