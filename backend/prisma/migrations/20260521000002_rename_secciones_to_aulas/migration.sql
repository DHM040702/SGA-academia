-- ============================================================
-- Migración: secciones → aulas
-- ============================================================

-- 1. Renombrar tabla
ALTER TABLE "secciones" RENAME TO "aulas";

-- 2. Eliminar la columna "nivel" (antes "carrera" text de la sección)
ALTER TABLE "aulas" DROP COLUMN IF EXISTS "nivel";

-- 3. Actualizar nombres: A-M→C-001, A-T→C-002, B-M→L-001, B-T→L-002, C-M→M-001, C-T→M-002
UPDATE "aulas" SET "nombre" = CASE
  WHEN "nombre" = 'A-M' THEN 'C-001'
  WHEN "nombre" = 'A-T' THEN 'C-002'
  WHEN "nombre" = 'B-M' THEN 'L-001'
  WHEN "nombre" = 'B-T' THEN 'L-002'
  WHEN "nombre" = 'C-M' THEN 'M-001'
  WHEN "nombre" = 'C-T' THEN 'M-002'
  ELSE "nombre"
END;

-- 4. alumnos: seccion_id → aula_id
ALTER TABLE "alumnos" RENAME COLUMN "seccion_id" TO "aula_id";
ALTER TABLE "alumnos" DROP CONSTRAINT IF EXISTS "alumnos_seccion_id_fkey";
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_aula_id_fkey"
  FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. horarios: seccion_id → aula_id, eliminar columna texto "aula"
ALTER TABLE "horarios" RENAME COLUMN "seccion_id" TO "aula_id";
ALTER TABLE "horarios" DROP COLUMN IF EXISTS "aula";
ALTER TABLE "horarios" DROP CONSTRAINT IF EXISTS "horarios_seccion_id_fkey";
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_aula_id_fkey"
  FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. comunicados: seccion_id → aula_id
ALTER TABLE "comunicados" RENAME COLUMN "seccion_id" TO "aula_id";
ALTER TABLE "comunicados" DROP CONSTRAINT IF EXISTS "comunicados_seccion_id_fkey";
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_aula_id_fkey"
  FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
