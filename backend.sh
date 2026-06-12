#!/bin/bash
export NVM_DIR="/home/cpu_ux/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

export PATH=/home/cpu_ux/.nvm/versions/node/v20.20.2/bin/:$PATH

cd /mnt/c/sga-academia/backend

fuser -k 3001/tcp 2>/dev/null

exec /home/cpu_ux/.nvm/versions/node/v20.20.2/bin/pnpm run start:prod