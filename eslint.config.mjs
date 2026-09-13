import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// eslint-config-next@15.5.25 still ships its `core-web-vitals`/`typescript`
// presets in the legacy `extends`-style shape rather than flat-config
// arrays — FlatCompat bridges that into this project's flat eslint.config.mjs.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**", ".data/**"],
  },
];

export default eslintConfig;
