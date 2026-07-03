-- Migración manual: unicidad de asistencia (una por persona por día).
-- Cierra la condición de carrera del escaneo doble en el kiosco.
-- Postgres trata los NULL como distintos, así que cada índice solo aplica a su
-- tipo (alumno_id null en filas de docente y viceversa) — no hace falta parcial.
-- Aplicar UNA vez. Idempotente.
--
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < 2026-07-asistencia-unique.sql
--
-- IMPORTANTE: si ya existieran duplicados, la creación fallará. Revísalos antes:
--   SELECT alumno_id, fecha, COUNT(*) FROM asistencias
--     WHERE alumno_id IS NOT NULL GROUP BY 1,2 HAVING COUNT(*)>1;
--   SELECT docente_id, fecha, COUNT(*) FROM asistencias
--     WHERE docente_id IS NOT NULL GROUP BY 1,2 HAVING COUNT(*)>1;
-- (si hay filas, elimina los duplicados sobrantes antes de correr esto).

CREATE UNIQUE INDEX IF NOT EXISTS "asistencias_alumno_id_fecha_key"
    ON "asistencias" ("alumno_id", "fecha");

CREATE UNIQUE INDEX IF NOT EXISTS "asistencias_docente_id_fecha_key"
    ON "asistencias" ("docente_id", "fecha");
