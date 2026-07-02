#!/usr/bin/env bash
#
# Respaldo semanal de SGA-Academia a la nube (Google Drive vía rclone).
# Respalda: 1) la base de datos PostgreSQL (pg_dump) y 2) los archivos de
# MinIO (fotos/biblioteca) como tar del volumen. Sube todo cifrado a Drive.
#
# Instalación (ver docs/README de despliegue):
#   1) curl https://rclone.org/install.sh | sudo bash
#   2) rclone config  → remoto "sga-drive" (tipo: drive) + remoto "sga-cifrado"
#      (tipo: crypt, apuntando a sga-drive:sga-backups, con passphrase)
#   3) chmod +x scripts/respaldar-sga.sh
#   4) cron (sábados 2:00 a.m.):
#        0 2 * * 6  /home/sgaadmin/sga-academia/scripts/respaldar-sga.sh >> /var/log/sga-backup.log 2>&1
#
set -euo pipefail

# ── Configuración ─────────────────────────────────────────────────────────
FECHA=$(date +%F)
DIR=/home/sgaadmin/backups
REMOTO="sga-cifrado:sga"            # destino en la nube (remoto crypt de rclone)
PG_CONTAINER="sga-academia-postgres-1"
MINIO_VOLUME="sga-academia_minio_data"
PG_USER="sga_user"
PG_DB="sga_db"
RETENCION_LOCAL_DIAS=21            # limpiar copias locales más viejas que esto
RETENCION_NUBE_DIAS=60            # limpiar copias en la nube más viejas que esto

mkdir -p "$DIR"
echo "==> [$FECHA] Iniciando respaldo…"

# ── 1) Base de datos (formato custom, comprimido) ─────────────────────────
docker exec "$PG_CONTAINER" \
  pg_dump -U "$PG_USER" -Fc "$PG_DB" > "$DIR/sga_db_$FECHA.dump"
echo "==> BD volcada ($(du -h "$DIR/sga_db_$FECHA.dump" | cut -f1))"

# ── 2) Archivos de MinIO (tar del volumen, captura todos los buckets) ─────
docker run --rm \
  -v "$MINIO_VOLUME":/data:ro \
  -v "$DIR":/backup alpine \
  tar czf "/backup/minio_$FECHA.tar.gz" -C /data .
echo "==> MinIO archivado ($(du -h "$DIR/minio_$FECHA.tar.gz" | cut -f1))"

# ── 3) Subir a la nube (solo lo de esta semana) ───────────────────────────
rclone copy "$DIR/sga_db_$FECHA.dump"  "$REMOTO/$FECHA/" --transfers=4
rclone copy "$DIR/minio_$FECHA.tar.gz" "$REMOTO/$FECHA/" --transfers=4
echo "==> Subido a $REMOTO/$FECHA/"

# ── 4) Retención ──────────────────────────────────────────────────────────
find "$DIR" -name "sga_db_*.dump"  -mtime "+$RETENCION_LOCAL_DIAS" -delete
find "$DIR" -name "minio_*.tar.gz" -mtime "+$RETENCION_LOCAL_DIAS" -delete
rclone delete "$REMOTO" --min-age "${RETENCION_NUBE_DIAS}d" --rmdirs || true

echo "==> [$FECHA] Respaldo completado."
