import { defineConfig, globalIgnores } from "eslint/config";
// Subpaths con extensión .js: el paquete eslint-config-next no expone estos
// entrypoints vía "exports", así que Node necesita la ruta de archivo explícita.
// (Evita depender de @eslint/eslintrc, que no está instalado en el frontend.)
import nextVitals from "eslint-config-next/core-web-vitals.js";
import nextTs from "eslint-config-next/typescript.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Reglas ruidosas preexistentes a "warn" (no bloquean el build).
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "prefer-const": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
