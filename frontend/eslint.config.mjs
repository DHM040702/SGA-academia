import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Patrón estándar de create-next-app (Next 15). eslint-config-next es estilo
// eslintrc, así que FlatCompat lo adapta a flat config. Requiere @eslint/eslintrc
// (declarado en devDependencies) y el hoist de eslint en .npmrc.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Reglas ruidosas preexistentes a "warn" (no bloquean el build).
    // Bugs reales nuevos (rules-of-hooks, etc.) siguen apareciendo como error.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "prefer-const": "warn",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
