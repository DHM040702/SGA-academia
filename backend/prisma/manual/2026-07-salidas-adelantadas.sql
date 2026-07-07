-- Migración manual: salidas adelantadas de alumnos.
-- Un alumno puede retirarse antes de terminar la clase con permiso de un admin
-- o auxiliar. Se guarda quién autorizó y una explicación breve del motivo.
-- Gestionada con $queryRaw/$executeRaw (fuera de schema.prisma), igual que
-- refresh_tokens (Prisma migrate no disponible en este entorno).
--
-- Ejecutar en producción:
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < backend/prisma/manual/2026-07-salidas-adelantadas.sql

CREATE TABLE IF NOT EXISTS salidas_adelantadas (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id       UUID         NOT NULL REFERENCES alumnos(id)  ON DELETE CASCADE,
  motivo          VARCHAR(300) NOT NULL,
  autorizado_por  UUID         NOT NULL REFERENCES usuarios(id),
  fecha           TIMESTAMPTZ  NOT NULL DEFAULT now(),   -- instante de la salida
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salidas_alumno ON salidas_adelantadas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_salidas_fecha  ON salidas_adelantadas(fecha DESC);
