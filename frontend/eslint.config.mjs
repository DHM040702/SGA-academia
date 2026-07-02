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
    rules: {
      // Reglas de PREFERENCIA/ESTILO que este código no sigue: apagadas para
      // no ensuciar el build con cientos de avisos irrelevantes.
      //  - no-explicit-any: se usa `any` deliberadamente en muchos sitios.
      //  - no-img-element: se usan <img> a propósito (URLs prefirmadas de MinIO,
      //    PDFs) donde next/image no aporta.
      //  - no-unescaped-entities: comillas en texto español, puramente cosmético.
      //  - jsx-a11y/alt-text: falsos positivos sobre <Image> de @react-pdf.
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/alt-text": "off",
      // Reglas con VALOR REAL: se mantienen como aviso (bugs reales nuevos que
      // sean error siguen rompiendo el build).
      // ignoreRestSiblings: no marca campos excluidos a propósito con rest
      //   (const { ciclo_id, ...dto } = x). argsIgnorePattern/varsIgnorePattern:
      //   permite silenciar a propósito prefijando con "_".
      "@typescript-eslint/no-unused-vars": ["warn", {
        ignoreRestSiblings: true,
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "react-hooks/exhaustive-deps": "warn",
      "prefer-const": "warn",
    },
  },
  {
    // server.js es el bootstrap Node (CommonJS) — usa require() legítimamente
    // y no debe someterse a las reglas TS/React de la app.
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "server.js"],
  },
];

export default eslintConfig;
