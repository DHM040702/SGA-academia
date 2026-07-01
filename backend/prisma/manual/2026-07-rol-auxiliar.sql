-- Migración manual: renombra el rol 'vigilante' → 'auxiliar' en el enum "Rol".
-- ALTER TYPE ... RENAME VALUE renombra el valor EN SU LUGAR: todas las filas
-- de `usuarios` que tenían rol 'vigilante' pasan a 'auxiliar' automáticamente.
-- Aplicar UNA vez en el servidor ANTES de arrancar el backend nuevo (el Prisma
-- Client regenerado ya no conoce 'vigilante'). Idempotente.
--
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < 2026-07-rol-auxiliar.sql

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'Rol' AND e.enumlabel = 'vigilante'
    ) THEN
        ALTER TYPE "Rol" RENAME VALUE 'vigilante' TO 'auxiliar';
    END IF;
END $$;
