-- Migración manual: historial de ediciones de recursos de biblioteca
-- Ejecutar con:
-- docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < backend/prisma/migrations/manual_biblioteca_historial.sql

CREATE TABLE IF NOT EXISTS recursos_biblioteca_historial (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurso_id           UUID        NOT NULL REFERENCES recursos_biblioteca(id) ON DELETE CASCADE,
  titulo_anterior      VARCHAR(200),
  descripcion_anterior TEXT,
  url_anterior         VARCHAR(500),
  nivel_anterior       VARCHAR(50),
  curso_id_anterior    UUID,
  modificado_por_id    UUID        NOT NULL REFERENCES usuarios(id),
  modificado_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbh_recurso_id ON recursos_biblioteca_historial(recurso_id);
CREATE INDEX IF NOT EXISTS idx_rbh_modificado_at ON recursos_biblioteca_historial(modificado_at DESC);
