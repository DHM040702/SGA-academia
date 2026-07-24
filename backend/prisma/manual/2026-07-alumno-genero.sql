-- Género del alumno (ficha de matrícula). Columna nueva, gestionada por SQL
-- manual (el schema.prisma solo declara el tipo para Prisma Client).
-- Valores usados por la app: 'masculino' | 'femenino' (NULL = sin especificar).
-- Idempotente: se puede correr varias veces sin efecto adicional.
--
-- CORRER EN PROD al desplegar esta versión, si no toda query de alumnos
-- devolverá 400 (Prisma P2022: columna inexistente).

ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS genero VARCHAR(20);
