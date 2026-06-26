-- Migración manual: tabla `recesos`
-- Aplicar UNA vez en el servidor (la BD se gestiona con SQL manual, no con
-- `prisma migrate`). Es idempotente: se puede correr varias veces sin error.
--
--   docker exec -i sga_postgres psql -U sga_user -d sga_db < 2026-06-recesos.sql
--   (ajusta el nombre del contenedor/usuario/BD a tu entorno)

CREATE TABLE IF NOT EXISTS "recesos" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
    "aula_id"     UUID        NOT NULL,
    "dia_semana"  SMALLINT    NOT NULL,
    "hora_inicio" TIME        NOT NULL,
    "hora_fin"    TIME        NOT NULL,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "recesos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recesos_aula_dia_unique" UNIQUE ("aula_id", "dia_semana"),
    CONSTRAINT "recesos_aula_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE CASCADE
);
