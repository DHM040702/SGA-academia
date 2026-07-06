#!/usr/bin/env bash
#
# Prepara una BD de PRUEBA completa para los tests e2e:
#   1) esquema (prisma db push)
#   2) tablas gestionadas por SQL manual que NO están en schema.prisma
#      (refresh_tokens, historial de biblioteca) — sin ellas el seed falla
#   3) datos de prueba (prisma db seed)
#
# Requiere DATABASE_URL exportado apuntando a la BD de PRUEBA (nunca sga_db).
#
# Uso:
#   export DATABASE_URL="postgresql://sga_user:PASS@127.0.0.1:5433/sga_test"
#   export JWT_SECRET=test JWT_REFRESH_SECRET=test JWT_EXPIRES_IN=15m NODE_ENV=test
#   bash test/prepare-test-db.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."   # → backend/

: "${DATABASE_URL:?Exporta DATABASE_URL apuntando a la BD de prueba primero}"

# Salvaguarda: NO permitir apuntar a la base de producción.
case "$DATABASE_URL" in
  */sga_db|*/sga_db\?*)
    echo "❌ DATABASE_URL apunta a sga_db (producción). Aborta." >&2; exit 1 ;;
esac
echo "==> BD de prueba: $DATABASE_URL"

echo "==> 1/3 Esquema (db push)…"
pnpm prisma db push --url "$DATABASE_URL"

echo "==> 2/3 Tablas de SQL manual (fuera de schema.prisma)…"
pnpm prisma db execute --url "$DATABASE_URL" --file prisma/migrations/manual_refresh_tokens.sql
pnpm prisma db execute --url "$DATABASE_URL" --file prisma/migrations/manual_biblioteca_historial.sql

echo "==> 3/3 Seed…"
pnpm prisma db seed

echo "==> BD de prueba lista."
echo "    Corre: pnpm exec jest --config ./test/jest-e2e.json --runInBand --forceExit"
