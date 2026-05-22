/*
  Warnings:

  - You are about to alter the column `nombre` on the `aulas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(20)`.

*/
-- AlterTable: rename primary key constraint (must be a separate statement)
ALTER TABLE "aulas" RENAME CONSTRAINT "secciones_pkey" TO "aulas_pkey";

-- AlterTable: narrow nombre column
ALTER TABLE "aulas" ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(20);

-- RenameForeignKey
ALTER TABLE "aulas" RENAME CONSTRAINT "secciones_ciclo_id_fkey" TO "aulas_ciclo_id_fkey";
