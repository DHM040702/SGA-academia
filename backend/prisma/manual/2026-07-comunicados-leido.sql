-- Migración manual: marca de LECTURA server-side de comunicados por usuario.
-- Agrega `leido_en` a comunicados_envios (fila por usuario/canal). Cuando el
-- usuario abre un aviso se setea leido_en; así el estado "leído" se sincroniza
-- entre dispositivos (antes vivía en localStorage). Aplicar UNA vez. Idempotente.
--
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < 2026-07-comunicados-leido.sql

ALTER TABLE "comunicados_envios"
    ADD COLUMN IF NOT EXISTS "leido_en" TIMESTAMPTZ;
