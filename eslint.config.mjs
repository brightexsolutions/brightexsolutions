import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Transient bundle written by scripts/run-ts.mjs while a check or seed
    // runs. Linting it produced dozens of phantom errors that appeared and
    // vanished depending on whether a script happened to be mid-flight.
    ".run-ts.tmp.cjs",
  ]),
]);

export default eslintConfig;
