import config from "@withink/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...config,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "node_modules/**",
  ]),
]);
