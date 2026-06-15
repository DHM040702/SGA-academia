#!/bin/bash
export NVM_DIR="/home/cpu_ux/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

export PATH=/home/cpu_ux/.nvm/versions/node/v20.20.2/bin:$PATH

cd /mnt/c/sga-academia/frontend

fuser -k 3000/tcp 2>/dev/null

WSL_IP=$(hostname -I | awk '{print $1}')
export INTERNAL_API_URL="http://${WSL_IP}:3001"

exec /home/cpu_ux/.nvm/versions/node/v20.20.2/bin/pnpm run start