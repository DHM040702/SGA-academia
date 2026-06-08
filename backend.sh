#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /mnt/c/Users/Diego/sga-academia/backend

# Liberar el puerto 3001 si hay una instancia anterior corriendo
fuser -k 3001/tcp 2>/dev/null

pnpm run start:prod