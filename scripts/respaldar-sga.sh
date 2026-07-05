#!/usr/bin/env bash
#
# Respaldo de SGA-Academia a la nube (Google Drive vía rclone).
# Respalda: 1) la base de datos PostgreSQL (pg_dump) y 2) los archivos de
# MinIO (fotos/biblioteca) como tar del volumen. Sube todo cifrado a Drive.
#
# Instalación (ver docs/README de despliegue):
#   1) curl https://rclone.org/install.sh | sudo bash
#   2) rclone config  → remoto "sga-drive" (tipo: drive) + remoto "sga-cifrado"
#      (tipo: crypt, apuntando a sga-drive:sga-backups, con passphrase)
#   3) chmod +x scripts/respaldar-sga.sh
#   4) cron (sábados 2:00 a.m.). El script escribe su PROPIO log en
#      /home/sgaadmin/backups/backup.log, pero dejamos un cron.log (en una ruta
#      que sgaadmin SÍ puede escribir) para capturar fallos tempranos:
#        0 2 * * 6  /home/sgaadmin/sga-academia/scripts/respaldar-sga.sh >> /home/sgaadmin/backups/cron.log 2>&1
#      NOTA: NO redirigir a /var/log/... — sgaadmin no puede crear archivos ahí
#      y la línea de cron abortaría antes de ejecutar el script.
#
set -euo pipefail

# cron arranca con un PATH mínimo (/usr/bin:/bin) y puede no encontrar docker o
# rclone (suelen estar en /usr/local/bin). Lo forzamos para evitar fallos.
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# ── Configuración ─────────────────────────────────────────────────────────
FECHA=$(date +%F)
DIR=/home/sgaadmin/backups
LOG="$DIR/backup.log"
REMOTO="sga-cifrado:sga"            # destino en la nube (remoto crypt de rclone)
PG_CONTAINER="sga-academia-postgres-1"
MINIO_VOLUME="sga-academia_minio_data"
PG_USER="sga_user"
PG_DB="sga_db"
RETENCION_LOCAL_DIAS=21            # limpiar copias locales más viejas que esto
RETENCION_NUBE_DIAS=60            # limpiar copias en la nube más viejas que esto

mkdir -p "$DIR"

# En cron (sin terminal) todo va al log; en ejecución manual se ve en pantalla.
[ -t 1 ] || exec >> "$LOG" 2>&1

ts()   { date '+%F %T'; }
fail() { echo "==> [$(ts)] ERROR: $*"; exit 1; }
trap 'echo "==> [$(ts)] FALLÓ el respaldo (línea $LINENO)."' ERR

echo "==> [$(ts)] Iniciando respaldo…"
command -v docker >/dev/null || fail "docker no está disponible en el PATH del cron"
command -v rclone >/dev/null || fail "rclone no está disponible en el PATH del cron"

# ── 1) Base de datos (formato custom, comprimido) ─────────────────────────
docker exec "$PG_CONTAINER" \
  pg_dump -U "$PG_USER" -Fc "$PG_DB" > "$DIR/sga_db_$FECHA.dump"
[ -s "$DIR/sga_db_$FECHA.dump" ] || fail "el dump de la BD quedó vacío (0 bytes)"
echo "==> BD volcada ($(du -h "$DIR/sga_db_$FECHA.dump" | cut -f1))"

# ── 2) Archivos de MinIO (tar del volumen, captura todos los buckets) ─────
docker run --rm \
  -v "$MINIO_VOLUME":/data:ro \
  -v "$DIR":/backup alpine \
  tar czf "/backup/minio_$FECHA.tar.gz" -C /data .
[ -s "$DIR/minio_$FECHA.tar.gz" ] || fail "el tar de MinIO quedó vacío (0 bytes)"
echo "==> MinIO archivado ($(du -h "$DIR/minio_$FECHA.tar.gz" | cut -f1))"

# ── 3) Subir a la nube (solo lo de esta semana) ───────────────────────────
rclone copy "$DIR/sga_db_$FECHA.dump"  "$REMOTO/$FECHA/" --transfers=4
rclone copy "$DIR/minio_$FECHA.tar.gz" "$REMOTO/$FECHA/" --transfers=4
echo "==> Subido a $REMOTO/$FECHA/"

# ── 4) Retención ──────────────────────────────────────────────────────────
find "$DIR" -name "sga_db_*.dump"  -mtime "+$RETENCION_LOCAL_DIAS" -delete
find "$DIR" -name "minio_*.tar.gz" -mtime "+$RETENCION_LOCAL_DIAS" -delete
rclone delete "$REMOTO" --min-age "${RETENCION_NUBE_DIAS}d" --rmdirs || true

echo "==> [$(ts)] Respaldo completado."
