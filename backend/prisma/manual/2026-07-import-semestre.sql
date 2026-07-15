-- Migración manual: soporte para el import de alumnos por semestre (CSV oficial).
-- Agrega a `alumnos` los datos del formato oficial de matrícula (colegio,
-- quinto, veces matriculado, código de inscripción, fecha de matrícula),
-- relaja `apoderados` para poder crearlo con datos parciales (el CSV no trae
-- DNI ni teléfono del apoderado) y crea la tabla `pagos` con la cuota de cada
-- alumno.
--
-- La BD se gestiona con SQL manual (no `prisma migrate`). Es idempotente: se
-- puede correr varias veces sin error. Aplicar en cada BD (dev y prod):
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < backend/prisma/manual/2026-07-import-semestre.sql

-- 1) Nuevos campos del alumno (del formato oficial de matrícula) ────────────
ALTER TABLE "alumnos"
    ADD COLUMN IF NOT EXISTS "colegio"            VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "quinto"             BOOLEAN,
    ADD COLUMN IF NOT EXISTS "veces_matriculado"  INTEGER,
    ADD COLUMN IF NOT EXISTS "codigo_inscripcion" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "fecha_matricula"    TIMESTAMPTZ;

-- 2) Apoderado con datos parciales: DNI y teléfono dejan de ser obligatorios.
--    El UNIQUE de `dni` se conserva; en Postgres varios NULL no colisionan.
--    DROP NOT NULL sobre una columna ya nullable es un no-op (idempotente).
ALTER TABLE "apoderados" ALTER COLUMN "dni"               DROP NOT NULL;
ALTER TABLE "apoderados" ALTER COLUMN "telefono_whatsapp" DROP NOT NULL;

-- 3) Pagos / cuotas del alumno (Tipo de Pago, Banco/Tesorería, Código/Fecha/
--    Monto de Cuota del CSV). Un alumno puede tener varias cuotas.
CREATE TABLE IF NOT EXISTS "pagos" (
    id               UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id        UUID          NOT NULL REFERENCES "alumnos"(id) ON DELETE CASCADE,
    tipo_pago        VARCHAR(20),
    banco_tesoreria  VARCHAR(20),
    codigo_cuota     VARCHAR(30),
    fecha_cuota      DATE,
    monto            NUMERIC(10,2),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_alumno       ON "pagos"(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_codigo_cuota ON "pagos"(codigo_cuota);
