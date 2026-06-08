-- Migración manual: tabla refresh_tokens para revocación de sesiones
-- Ejecutar con: docker exec -i <contenedor_postgres> psql -U <user> -d <db> < manual_refresh_tokens.sql

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
