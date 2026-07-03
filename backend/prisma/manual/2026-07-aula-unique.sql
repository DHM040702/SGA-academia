-- Migración manual: unicidad de aula por (ciclo_id, nombre, turno).
-- Evita aulas duplicadas que romperían el mapeo del import de alumnos.
-- Aplicar UNA vez en el servidor. Idempotente.
--
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < 2026-07-aula-unique.sql
--
-- IMPORTANTE: si ya existieran aulas duplicadas, la creación de la constraint
-- fallará. Primero revísalo:
--   SELECT ciclo_id, nombre, turno, COUNT(*)
--   FROM aulas GROUP BY 1,2,3 HAVING COUNT(*) > 1;
-- (si hay filas, hay que consolidar/eliminar duplicados antes de correr esto).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'aulas_ciclo_id_nombre_turno_key'
    ) THEN
        ALTER TABLE "aulas"
            ADD CONSTRAINT "aulas_ciclo_id_nombre_turno_key"
            UNIQUE ("ciclo_id", "nombre", "turno");
    END IF;
END $$;
