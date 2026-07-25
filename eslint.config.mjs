import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "server/dist/**",
    "server/dive2026.db*",
    "tsconfig.tsbuildinfo",
  ]),
])
