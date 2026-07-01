-- Migración manual: traza de autor/fecha en la justificación de inasistencias.
-- Agrega a `asistencias` quién justificó una falta y cuándo.
-- Aplicar UNA vez en el servidor (la BD se gestiona con SQL manual, no con
-- `prisma migrate`). Es idempotente: se puede correr varias veces sin error.
--
--   docker exec -i sga_postgres psql -U sga_user -d sga_db < 2026-07-justificacion-autor.sql
--   (ajusta el nombre del contenedor/usuario/BD a tu entorno)

ALTER TABLE "asistencias"
    ADD COLUMN IF NOT EXISTS "justificado_por" UUID,
    ADD COLUMN IF NOT EXISTS "justificado_en"  TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'asistencias_justificado_por_fkey'
    ) THEN
        ALTER TABLE "asistencias"
            ADD CONSTRAINT "asistencias_justificado_por_fkey"
            FOREIGN KEY ("justificado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL;
    END IF;
END $$;
