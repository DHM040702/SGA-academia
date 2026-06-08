#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /mnt/c/Users/Diego/sga-academia/frontend

# Liberar el puerto 3000 si hay una instancia anterior corriendo
fuser -k 3000/tcp 2>/dev/null

# Compilar siempre para asegurar que los cambios de .env.local estén incluidos
pnpm run build && pnpm run start