import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  // Relax rules for test files
  {
    files: ["__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "__tests__/setup.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-empty": "off",
    },
  },
];
