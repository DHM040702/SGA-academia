# Manual de Instalación — SGA en Ubuntu Server 26.04 LTS

**Hardware del servidor (HP, laptop real usada):**
- CPU: Intel Core i7-2620M
- RAM: 8 GB
- Almacenamiento: 466 GB (HDD Hitachi)
- Red: Intel 82579LM (Ethernet → internet) + Intel Centrino Advanced-N 6205 (WiFi → hotspot)

**Datos reales de este servidor (usar en todos los comandos):**

| Dato | Valor |
|---|---|
| Sistema | Ubuntu Server 26.04 LTS (codename `resolute`) |
| Usuario | `sgaadmin` |
| Raíz del proyecto | `/home/sgaadmin/sga-academia` |
| Interfaz Ethernet (internet) | `enp0s25` |
| Interfaz WiFi (hotspot) | `wlo1` |
| Particionado | MBR / Legacy BIOS (no UEFI/GPT) |

---

## Índice

1. [Instalación de Ubuntu Server 26.04 LTS](#1-instalación-de-ubuntu-server-2604-lts)
2. [Configuración de red — Ethernet, Hotspot WiFi, DNS y DHCP](#2-configuración-de-red)
3. [Instalación de Docker y Docker Compose](#3-instalación-de-docker-y-docker-compose)
4. [Instalación de Node.js y pnpm](#4-instalación-de-nodejs-y-pnpm)
5. [Despliegue del proyecto SGA](#5-despliegue-del-proyecto-sga)
6. [Configuración de arranque automático con systemd](#6-configuración-de-arranque-automático-con-systemd)
7. [Actualizar el proyecto con Git](#7-actualizar-el-proyecto-con-git)
8. [Migración del hotspot a un adaptador USB WiFi](#8-migración-del-hotspot-a-un-adaptador-usb-wifi)

---

## 1. Instalación de Ubuntu Server 26.04 LTS

### 1.1 Preparar el medio de instalación

1. Descargar la imagen ISO desde: https://ubuntu.com/download/server
   - Archivo: `ubuntu-26.04-live-server-amd64.iso`

2. Crear un USB booteable con **Rufus** (Windows):
   - Descargar Rufus: https://rufus.ie
   - Seleccionar la ISO descargada
   - Esquema de partición: **MBR** ⚠️
   - Sistema de destino: **BIOS o UEFI**
   - Si pregunta el modo de escritura: **Imagen ISO (Recomendado)**
   - Clic en **Iniciar**

> ⚠️ **CRÍTICO — esta laptop HP solo arranca en modo Legacy BIOS, no UEFI.**
> Debe usarse **MBR** en Rufus. Si se usa GPT/UEFI, el arranque falla con
> "Boot Device Not Found" o "BIOS/Legacy boot of UEFI-only media".
> Además, en la BIOS de la HP hay que **desactivar `UEFI Boot Mode`**
> (F10 → System Configuration → Boot Options) y dejar
> **Notebook Hard Drive** primero en el `Legacy Boot Order`.

### 1.2 Arrancar desde el USB

1. Insertar el USB en la laptop
2. Encender y presionar **F9** (HP) para el menú de arranque
3. Seleccionar el USB como dispositivo de arranque

> **Nota sobre el disco:** si el disco trae un sistema previo con tabla **GPT**,
> el instalador de Ubuntu no podrá crear arranque Legacy sobre él. En la terminal
> del instalador (**Help → Enter shell**) forzar tabla MBR antes de instalar:
> ```bash
> sudo parted /dev/sda --script mklabel msdos
> sudo parted /dev/sda --script mkpart primary ext4 1MiB 100%
> sudo parted /dev/sda --script set 1 boot on
> ```
> Luego elegir **Custom storage layout**, formatear `/dev/sda1` como ext4 y montarla en `/`.

### 1.3 Proceso de instalación

Seguir el instalador paso a paso:

**Idioma:** Seleccionar `English` (recomendado para logs sin caracteres especiales)

**Teclado:** Seleccionar el layout correspondiente (Spanish Latin America)

**Tipo de instalación:** `Ubuntu Server` (sin minimizar)

**Configuración de red:**
- Seleccionar la interfaz Ethernet (`enp0s25` o similar)
- Configurar como DHCP por ahora (se ajustará después)
- El WiFi dejarlo sin configurar en este paso

**Almacenamiento:**
- Seleccionar `Use entire disk`
- Confirmar el disco de 466 GB
- Habilitar LVM si se desea (opcional)

**Perfil del sistema:**
```
Nombre del servidor : sga-server
Nombre de usuario   : sgaadmin
Contraseña          : CPU_unasam@
```

**OpenSSH:** Marcar `Install OpenSSH server` ✓ — permite acceso remoto desde otra laptop

**Snaps:** No seleccionar ninguno, clic en `Done`

**Esperar** a que finalice la instalación y reiniciar. Retirar el USB cuando lo solicite.

---

## 2. Configuración de red

> ⚠️ **ESTA SECCIÓN SE CONFIGURA AL FINAL**, después de instalar Docker, Node.js,
> desplegar el proyecto y probar que el sistema levanta. Si se configura el hotspot
> antes, se pierde el internet por cable necesario para instalar todo lo demás.
>
> **Lecciones aprendidas (importantes):**
> - `systemd-networkd` (netplan) **NO soporta modo Access Point**. Por eso la IP del
>   hotspot **NO** va en netplan — se asigna con un servicio aparte y la controla `hostapd`.
> - Netplan solo gestiona el **Ethernet** (`enp0s25`).
> - **No instalar `iptables-persistent`** — entra en conflicto con `ufw`. El NAT se
>   configura dentro de `ufw` (`before.rules`).
> - El DNS debe ser **explícito** (`8.8.8.8`), nunca apuntando a la IP del propio hotspot.

### 2.1 Identificar las interfaces de red

```bash
ip link show
```

En esta laptop los nombres reales son:
- `enp0s25` → Ethernet (internet)
- `wlo1` → WiFi (hotspot)

### 2.2 Netplan — solo el Ethernet

```bash
sudo ls /etc/netplan/
sudo nano /etc/netplan/01-network-config.yaml
```

Dejar **un único archivo** con SOLO el Ethernet (borrar cualquier otro `.yaml` duplicado):

```yaml
network:
  version: 2
  ethernets:
    enp0s25:
      dhcp4: true
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

```bash
sudo chmod 600 /etc/netplan/01-network-config.yaml
sudo netplan apply
ping -c 4 google.com
```

> Si `ping` a una IP (`8.8.8.8`) funciona pero por nombre falla, forzar DNS:
> ```bash
> sudo resolvectl dns enp0s25 8.8.8.8 1.1.1.1
> ```

### 2.3 Instalar paquetes del hotspot (SIN iptables-persistent)

```bash
sudo apt update
sudo apt install -y hostapd dnsmasq
```

### 2.4 Asignar IP fija al WiFi mediante servicio systemd

Como netplan no puede gestionar `wlo1` en modo AP, se le asigna la IP con un servicio:

```bash
sudo nano /etc/systemd/system/wlo1-ip.service
```

```ini
[Unit]
Description=IP estatica para hotspot wlo1
Before=hostapd.service
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ip addr add 192.168.137.1/24 dev wlo1
ExecStart=/sbin/ip link set wlo1 up
ExecStop=/sbin/ip addr del 192.168.137.1/24 dev wlo1
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wlo1-ip.service
ip a show wlo1     # debe mostrar 192.168.137.1
```

### 2.5 Configurar el hotspot con hostapd

```bash
sudo nano /etc/hostapd/hostapd.conf
```

```ini
interface=wlo1
driver=nl80211
ssid=SGA-Academia
hw_mode=g
channel=6
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=academia2024
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

```bash
sudo nano /etc/default/hostapd
```

Cambiar `#DAEMON_CONF=""` a:

```ini
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

### 2.6 Configurar DHCP y DNS con dnsmasq

```bash
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.bak
sudo nano /etc/dnsmasq.conf
```

```ini
interface=wlo1
bind-interfaces

dhcp-range=192.168.137.100,192.168.137.200,255.255.255.0,24h
dhcp-option=3,192.168.137.1
dhcp-option=6,192.168.137.1

address=/sga.intranet/192.168.137.1
address=/www.sga.intranet/192.168.137.1

server=8.8.8.8
server=1.1.1.1
```

> La directiva `bind-interfaces` es clave: hace que `dnsmasq` escuche solo en la IP de
> `wlo1` (`192.168.137.1`), evitando el conflicto con `systemd-resolved` que ya ocupa
> el puerto 53 en `127.0.0.53`. Si `dnsmasq` falla al arrancar, verificar el puerto:
> ```bash
> sudo ss -tulpn | grep :53
> sudo journalctl -xeu dnsmasq.service | tail -20
> ```

### 2.7 Habilitar reenvío de paquetes (NAT en kernel)

```bash
sudo nano /etc/sysctl.conf
```

Descomentar:
```ini
net.ipv4.ip_forward=1
```

```bash
sudo sysctl -p
```

### 2.8 Configurar firewall ufw (incluye el NAT)

```bash
sudo apt install -y ufw
```

> Al instalar `ufw` se eliminan `iptables-persistent`/`netfilter-persistent` — es lo esperado, confirmar con `Y`.

**Habilitar el reenvío en ufw:**

```bash
sudo nano /etc/default/ufw
```

Cambiar `DEFAULT_FORWARD_POLICY="DROP"` a:
```ini
DEFAULT_FORWARD_POLICY="ACCEPT"
```

**Agregar la regla NAT** al inicio de `/etc/ufw/before.rules`, ANTES de la línea `*filter`:

```bash
sudo nano /etc/ufw/before.rules
```

```
# NAT hotspot — comparte internet de enp0s25 hacia wlo1
*nat
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s 192.168.137.0/24 -o enp0s25 -j MASQUERADE
COMMIT
```

**Reglas de puertos y activación:**

```bash
sudo ufw allow ssh
sudo ufw allow 3000/tcp    # Frontend Next.js
sudo ufw allow 3001/tcp    # Backend NestJS
sudo ufw allow 53/udp      # DNS
sudo ufw allow 67/udp      # DHCP
sudo ufw allow in on wlo1
sudo ufw enable
sudo ufw status verbose    # debe decir: Default: ... allow (routed)
```

### 2.9 Habilitar y arrancar los servicios del hotspot

```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd dnsmasq
sudo systemctl start hostapd
sudo systemctl start dnsmasq

sudo systemctl status hostapd   # debe decir: active (running) / AP-ENABLED
sudo systemctl status dnsmasq   # debe decir: active (running)
```

### 2.10 Verificar conectividad

Conectar una laptop cliente a la red WiFi **SGA-Academia** (contraseña `academia2024`) y verificar:

```powershell
ipconfig /all
# IP en rango 192.168.137.100-200, DNS 192.168.137.1

nslookup sga.intranet
# Debe devolver: 192.168.137.1

Test-NetConnection -ComputerName sga.intranet -Port 3000
# TcpTestSucceeded: True
```

---

## 3. Instalación de Docker y Docker Compose

> **NOTA:** Esta instalación se realizó sobre **Ubuntu 26.04 (codename `resolute`)**, no 24.04.
> El repositorio oficial de Docker **no tiene paquetes para `resolute`** todavía, por lo que
> se instala Docker desde los **repositorios propios de Ubuntu** (`docker.io` + `docker-compose-v2`).
> Esto evita el error de codename inexistente en el repo de Docker.

### 3.1 Instalar Docker desde los repos de Ubuntu

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
```

- `docker.io` → motor de Docker empaquetado por Ubuntu
- `docker-compose-v2` → provee el comando `docker compose` (el mismo que usa `docker-compose.yml`)

### 3.2 Habilitar Docker al arranque

```bash
sudo systemctl enable --now docker
```

### 3.3 Permitir usar Docker sin sudo

```bash
sudo usermod -aG docker sgaadmin
newgrp docker
```

### 3.4 Verificar instalación

```bash
docker --version
docker compose version
docker ps
```

### 3.5 Levantar los servicios de Docker

Copiar el archivo `docker-compose.yml` del proyecto al servidor y ejecutar:

```bash
cd /home/sgaadmin/sga-academia
docker compose up -d
```

Verificar que los contenedores estén corriendo:

```bash
docker ps
```

Deben aparecer tres contenedores: `postgres`, `redis` y `minio`.

---

## 4. Instalación de Node.js y pnpm

### 4.1 Instalar Node.js 20 LTS con nvm

Instalar nvm (Node Version Manager):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Recargar el shell:

```bash
source ~/.bashrc
```

Instalar Node.js 20 LTS:

```bash
nvm install 20
nvm use 20
nvm alias default 20
```

Verificar:

```bash
node --version    # v20.x.x
npm --version
```

### 4.2 Instalar pnpm

```bash
npm install -g pnpm
```

Verificar:

```bash
pnpm --version
```

---

## 5. Despliegue del proyecto SGA

### 5.1 Obtener el proyecto con Git (recomendado)

El proyecto está en GitHub: `https://github.com/DHM040702/SGA-academia.git` (branch `main`).
Clonarlo con Git permite **actualizarlo después con `git pull`** (ver sección 7).

> **Requisito:** el servidor necesita internet por cable funcionando (sección 2.2).
> Los cambios que se quieran desplegar deben estar **commiteados y subidos** a GitHub
> desde la laptop de desarrollo antes de clonar/actualizar.

```bash
sudo apt install -y git
cd /home/sgaadmin
git clone https://github.com/DHM040702/SGA-academia.git sga-academia
cd sga-academia
```

> **Nota:** los archivos `.env` (backend) y `.env.local` (frontend) **no están en Git**
> (están en `.gitignore` por seguridad). Se crean manualmente en el servidor en los
> pasos 5.2 y 5.3, y **no se borran** al hacer `git pull`.

**Alternativa sin Git — por USB** (si el servidor aún no tiene internet):

Comprimir en la laptop de desarrollo, copiar a USB y descomprimir en el servidor:

```powershell
# En Windows (laptop de desarrollo)
Compress-Archive -Path "C:\Users\Diego\sga-academia" `
  -DestinationPath "C:\Users\Diego\sga-academia.zip" -CompressionLevel Optimal
```

```bash
# En el servidor
sudo apt install -y unzip
lsblk                                  # identificar el USB (ej. sdb1)
sudo mkdir -p /mnt/usb && sudo mount /dev/sdb1 /mnt/usb
cp /mnt/usb/sga-academia.zip /home/sgaadmin/ && sudo umount /mnt/usb
cd /home/sgaadmin && unzip sga-academia.zip && cd sga-academia
```

### 5.2 Configurar variables de entorno del backend

```bash
nano /home/sgaadmin/sga-academia/backend/.env
```

```env
# Base de datos
DATABASE_URL=postgresql://sga_user:sga_pass_dev@127.0.0.1:5433/sga_db

# JWT
JWT_SECRET=tu_secreto_jwt_aqui
JWT_REFRESH_SECRET=tu_secreto_refresh_aqui
JWT_EXPIRES_IN=15m

# MinIO
# ENDPOINT = conexión interna del backend a MinIO (127.0.0.1, evita el problema IPv6)
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_pass_dev
# PUBLIC_ENDPOINT = host con el que se construyen las URLs públicas (fotos, PDFs)
# que abren los NAVEGADORES de los clientes. Debe ser accesible desde el hotspot.
MINIO_PUBLIC_ENDPOINT=sga.intranet
MINIO_PUBLIC_PORT=9000

# General
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000,http://192.168.137.1:3000,http://sga.intranet:3000,http://www.sga.intranet:3000
BACKEND_URL=http://192.168.137.1:3001
```

### 5.3 Configurar variables de entorno del frontend

```bash
nano /home/sgaadmin/sga-academia/frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=/api
INTERNAL_API_URL=http://127.0.0.1:3001
```

### 5.4 Instalar dependencias y construir el backend

```bash
cd /home/sgaadmin/sga-academia/backend
pnpm install
pnpm run build
```

### 5.5 Ejecutar migraciones de base de datos

Esperar a que Docker esté completamente levantado:

```bash
docker ps   # Verificar que postgres esté "healthy"
```

Ejecutar migraciones:

```bash
cd /home/sgaadmin/sga-academia/backend
pnpm prisma migrate deploy
```

### 5.6 Instalar dependencias y construir el frontend

```bash
cd /home/sgaadmin/sga-academia/frontend
pnpm install
pnpm run build
```

### 5.7 Prueba de arranque manual

Abrir dos terminales (o usar `tmux`):

**Terminal 1 — Backend:**
```bash
cd /home/sgaadmin/sga-academia/backend
node dist/main.js
```

**Terminal 2 — Frontend:**
```bash
cd /home/sgaadmin/sga-academia/frontend
pnpm start
```

Verificar acceso desde el navegador del servidor:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api`

---

## 6. Configuración de arranque automático con systemd

> **IMPORTANTE — ruta de Node.js:** como Node se instaló con `nvm`, la ruta real es algo
> como `/home/sgaadmin/.nvm/versions/node/v20.18.1/bin/node` (la versión exacta varía).
> Obtener la ruta exacta antes de crear los servicios:
> ```bash
> which node
> ```
> Usar esa ruta exacta en `ExecStart` en ambos servicios de abajo.

### 6.1 Servicio para el backend

```bash
sudo nano /etc/systemd/system/sga-backend.service
```

```ini
[Unit]
Description=SGA Backend - NestJS
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=sgaadmin
WorkingDirectory=/home/sgaadmin/sga-academia/backend
ExecStart=/home/sgaadmin/.nvm/versions/node/vXX.XX.X/bin/node dist/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

> Reemplazar `vXX.XX.X` por la versión real que devolvió `which node`.

### 6.2 Servicio para el frontend

```bash
sudo nano /etc/systemd/system/sga-frontend.service
```

```ini
[Unit]
Description=SGA Frontend - Next.js
After=network.target sga-backend.service
Requires=sga-backend.service

[Service]
Type=simple
User=sgaadmin
WorkingDirectory=/home/sgaadmin/sga-academia/frontend
ExecStart=/home/sgaadmin/.nvm/versions/node/vXX.XX.X/bin/node server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=INTERNAL_API_URL=http://127.0.0.1:3001

[Install]
WantedBy=multi-user.target
```

> ⚠️ **IMPORTANTE:** se ejecuta `server.js` (servidor personalizado), **NO**
> `next start` ni `node_modules/.bin/next`/`node_modules/next/dist/bin/next`.
> `server.js` usa `http-proxy-middleware` con `xfwd: true` para que el backend
> reciba la **IP real del cliente** en `X-Forwarded-For` — los `rewrites` de
> `next.config.ts` (usados solo en `next dev`) no agregan ese header, por lo que
> la auditoría registraba siempre `127.0.0.1`.

### 6.3 Habilitar y arrancar los servicios

```bash
sudo systemctl daemon-reload
sudo systemctl enable sga-backend
sudo systemctl enable sga-frontend
sudo systemctl start sga-backend
sudo systemctl start sga-frontend
```

### 6.4 Verificar estado de los servicios

```bash
sudo systemctl status sga-backend
sudo systemctl status sga-frontend
```

Ver logs en tiempo real:

```bash
# Backend
sudo journalctl -u sga-backend -f

# Frontend
sudo journalctl -u sga-frontend -f
```

### 6.5 Script de reinicio rápido

Crear un script para reiniciar todo el sistema fácilmente:

```bash
nano /home/sgaadmin/reiniciar-sga.sh
```

```bash
#!/bin/bash
echo "Reiniciando SGA..."
sudo systemctl restart sga-backend
sudo systemctl restart sga-frontend
echo "Backend: $(sudo systemctl is-active sga-backend)"
echo "Frontend: $(sudo systemctl is-active sga-frontend)"
echo "Listo."
```

```bash
chmod +x /home/sgaadmin/reiniciar-sga.sh
```

---

## 7. Actualizar el proyecto con Git

Cuando haya cambios nuevos en el código (subidos a GitHub desde la laptop de desarrollo),
el servidor se actualiza con `git pull` + reconstruir + reiniciar los servicios.

> Los `.env` / `.env.local` no se tocan porque están en `.gitignore`. Si `git pull`
> reportara conflicto con algún archivo versionado modificado localmente en el servidor,
> revisar con `git status` antes de continuar.

### 7.1 Traer los cambios

```bash
cd /home/sgaadmin/sga-academia
git pull origin main
```

### 7.2 Reconstruir backend y frontend

```bash
# Backend
cd /home/sgaadmin/sga-academia/backend
pnpm install
pnpm run build

# Frontend
cd /home/sgaadmin/sga-academia/frontend
pnpm install
pnpm run build
```

> ⚠️ **NO ejecutar `pnpm prisma migrate deploy` en las actualizaciones.**
> La base de datos del servidor se carga desde `seed.sql`, no con migraciones de Prisma,
> por lo que no existe la tabla `_prisma_migrations`. Si se ejecuta `migrate deploy`,
> Prisma intentará aplicar todas las migraciones sobre tablas que ya existen y **fallará**.
> Los cambios de esquema de BD se hacen **manualmente** (sección 7.5).

> **Nota sobre tiempos:** no hace falta agregar `sleep`/timeout entre comandos.
> `pnpm build` y `systemctl restart` son **bloqueantes** — cada uno espera a terminar
> antes de pasar al siguiente. El `set -e` del script detiene todo si algo falla.

### 7.3 Reiniciar los servicios

```bash
/home/sgaadmin/reiniciar-sga.sh
```

> ⚠️ **Versión de pnpm — debe coincidir entre dev y servidor.**
> El `pnpm-lock.yaml` se genera según la versión de pnpm. Si difieren (ej. dev pnpm 11.x
> y servidor pnpm 10.x), `pnpm install` reescribe el lock y aparece como modificado,
> rompiendo los `git pull`. Alinear ambas a la misma versión (la que generó el lock):
> ```bash
> npm install -g pnpm@11.1.3
> pnpm --version            # confirmar 11.1.3
> ```
> Usar siempre `pnpm install --frozen-lockfile` para que NO modifique el lock.

### 7.4 Script de actualización todo-en-uno (opcional)

```bash
nano /home/sgaadmin/actualizar-sga.sh
```

```bash
#!/bin/bash
set -e
cd /home/sgaadmin/sga-academia

echo "==> Descartando artefactos de build locales..."
git restore .                       # limpia tsconfig.json, pnpm-lock, etc. (.env es gitignored, no se toca)

echo "==> Trayendo cambios de GitHub..."
git pull origin main

echo "==> Reconstruyendo backend..."
cd backend
pnpm install --frozen-lockfile
pnpm run build

echo "==> Reconstruyendo frontend..."
cd ../frontend
pnpm install --frozen-lockfile
pnpm run build

echo "==> Reiniciando servicios..."
sudo systemctl restart sga-backend
sudo systemctl restart sga-frontend

echo "==> Backend:  $(sudo systemctl is-active sga-backend)"
echo "==> Frontend: $(sudo systemctl is-active sga-frontend)"
echo "Actualizacion completada."
```

```bash
chmod +x /home/sgaadmin/actualizar-sga.sh
```

> - **`git restore .`** descarta los cambios locales que el build genera (`tsconfig.json`,
>   `pnpm-lock.yaml`) ANTES del pull, evitando conflictos. No afecta `.env` (gitignored).
> - **`--frozen-lockfile`** instala exactamente las versiones del lock sin modificarlo.
>   Si da error, el lock del repo está desincronizado → arreglarlo en la laptop de desarrollo.

A partir de entonces, actualizar todo el sistema es un solo comando:

```bash
/home/sgaadmin/actualizar-sga.sh
```

### 7.5 Cambios en el esquema de la base de datos (manual)

Como la BD no usa el historial de migraciones de Prisma, los cambios de esquema se
aplican manualmente con `psql` cuando realmente ocurran. Ejemplo (agregar una columna):

```bash
docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db \
  -c "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);"
```

> ⚠️ **Cuidado con el shell y los hashes/valores con `$`:** dentro de comillas dobles
> el shell expande `$...`. Para valores con `$` (como hashes bcrypt) usa una variable
> y un heredoc, o comillas simples, para que no se corrompa el valor.

**Respaldo de la BD antes de cualquier cambio de esquema:**

```bash
docker exec -i sga-academia-postgres-1 pg_dump -U sga_user sga_db > /home/sgaadmin/backup-$(date +%F).sql
```

### 7.6 Funcionalidad: contraseña temporal = DNI + cambio obligatorio

El sistema usa una columna `debe_cambiar_password` para forzar el cambio de contraseña
al primer ingreso. La contraseña temporal de cada usuario es su **DNI**. El reseteo por
olvido solo lo hace el **admin** (módulo Usuarios → Editar → "Restablecer al DNI").

**Despliegue de esta funcionalidad en el servidor (una sola vez):**

```bash
# 1. Respaldar la BD
docker exec -i sga-academia-postgres-1 pg_dump -U sga_user sga_db > /home/sgaadmin/backup-pre-password.sql

# 2. Agregar la columna a la BD (manual, porque no usamos migraciones de Prisma)
docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db \
  -c "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT true;"

# 3. Traer el código nuevo y reconstruir (build regenera el cliente Prisma con el campo)
/home/sgaadmin/actualizar-sga.sh

# 4. (Opcional) Resetear la contraseña de TODOS los usuarios existentes a su DNI
cd /home/sgaadmin/sga-academia/backend
node prisma/reset-passwords-dni.cjs
```

> ⚠️ El paso 4 resetea **todos** los usuarios (incluido el admin) a su DNI y los obliga
> a cambiar la contraseña al ingresar. Si no quieres tocar al admin, omite el paso 4 y
> resetea individualmente desde la UI cuando haga falta.

**Credenciales tras el reseteo:** cada usuario inicia sesión con su **DNI como usuario y
como contraseña**, y el sistema le pide cambiarla de inmediato.

### 7.7 Módulo de auditoría (registro de cambios del sistema)

El sistema registra automáticamente toda operación de escritura (crear/actualizar/eliminar)
en la tabla `auditoria`, mediante un interceptor global. El admin lo consulta en
**menú lateral → Administración → Auditoría** (tabla con filtros, panel de resumen y
exportación a CSV).

**Despliegue (una sola vez en el servidor):**

```bash
# 1. Respaldar la BD
docker exec -i sga-academia-postgres-1 pg_dump -U sga_user sga_db > /home/sgaadmin/backup-pre-auditoria.sql

# 2. Crear la tabla auditoria (manual, no usamos migraciones de Prisma)
docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db <<'SQL'
CREATE TABLE IF NOT EXISTS auditoria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid,
  usuario_email varchar(150),
  usuario_rol   varchar(20),
  accion        varchar(20)  NOT NULL,
  entidad       varchar(50)  NOT NULL,
  entidad_id    varchar(64),
  detalle       jsonb,
  ip            varchar(64),
  created_at    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_created_at_idx ON auditoria (created_at);
CREATE INDEX IF NOT EXISTS auditoria_usuario_id_idx ON auditoria (usuario_id);
CREATE INDEX IF NOT EXISTS auditoria_entidad_idx    ON auditoria (entidad);
CREATE INDEX IF NOT EXISTS auditoria_accion_idx      ON auditoria (accion);
SQL

# 3. Traer el código nuevo y reconstruir (build regenera el cliente Prisma con el modelo Auditoria)
/home/sgaadmin/actualizar-sga.sh
```

> El registro de auditoría crece con el uso. Para purgar eventos antiguos (ej. > 6 meses):
> ```bash
> docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db \
>   -c "DELETE FROM auditoria WHERE created_at < now() - interval '6 months';"
> ```

---

## 8. Migración del hotspot a un adaptador USB WiFi

> **Por qué:** la tarjeta interna **Intel Centrino Advanced-N 6205** no soporta modo AP
> de forma estable en Linux (driver `iwldvm`): colapsa con `ADVANCED_SYSASSERT` cada
> pocos segundos. Se reemplaza el hotspot por un **adaptador USB con chipset
> MediaTek MT7612U / MT7601U o Ralink RT5370** (driver `mt76`/`rt2800usb` en el kernel,
> modo AP estable). El adaptador USB pasa a ser la interfaz del hotspot; la Intel se desactiva.

### 8.1 Conectar el adaptador e identificarlo

```bash
# Enchufar el USB y ver el nombre asignado (algo como wlxAABBCCDDEEFF o wlan0)
ip link
# Confirmar el chipset detectado y el driver
sudo dmesg | tail -20
sudo lshw -class network | grep -A4 -i wireless
```

Anota el **nombre de la interfaz nueva** (ej. `wlx00c0ca123456`) y su **MAC**.

### 8.2 Verificar que soporta modo AP

```bash
sudo iw list | grep -A10 "Supported interface modes"
```

Debe aparecer **`* AP`** en la lista. Si no, el chipset no sirve para hotspot (devolver/cambiar).

### 8.3 (Recomendado) Asignar un nombre fijo `ap0`

Para que la configuración no dependa del nombre largo basado en MAC, renombra el
adaptador a `ap0` con una regla de systemd (reemplaza la MAC por la real del paso 8.1):

```bash
sudo nano /etc/systemd/network/10-ap0.link
```

```ini
[Match]
MACAddress=00:c0:ca:12:34:56

[Link]
Name=ap0
```

> A partir de aquí la guía usa **`ap0`** como nombre del hotspot. Si prefieres no renombrar,
> usa el nombre largo (`wlxXXXX`) en todos los archivos siguientes en lugar de `ap0`.

### 8.4 Desactivar la WiFi interna Intel (evita conflictos y crashes)

```bash
echo "blacklist iwlwifi" | sudo tee /etc/modprobe.d/blacklist-iwlwifi.conf
```

> Esto impide que la tarjeta Intel (`wlo1`) se cargue. Ya no se usará. Las opciones
> anteriores en `/etc/modprobe.d/iwlwifi.conf` quedan inertes (puedes dejarlas).

### 8.5 Actualizar los servicios y configs (wlo1 → ap0)

**Servicio de IP del hotspot** (renombra el archivo para mayor claridad):

```bash
sudo systemctl disable --now wlo1-ip.service
sudo rm /etc/systemd/system/wlo1-ip.service
sudo nano /etc/systemd/system/ap0-ip.service
```

```ini
[Unit]
Description=IP estatica para hotspot ap0
Before=hostapd.service
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ip addr add 192.168.137.1/24 dev ap0
ExecStart=/sbin/ip link set ap0 up
ExecStop=/sbin/ip addr del 192.168.137.1/24 dev ap0
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

**hostapd** — cambiar la interfaz:

```bash
sudo sed -i 's/^interface=wlo1/interface=ap0/' /etc/hostapd/hostapd.conf
```

**dnsmasq** — cambiar la interfaz:

```bash
sudo sed -i 's/^interface=wlo1/interface=ap0/' /etc/dnsmasq.conf
```

**Servicio NAT** — cambiar `wlo1` por `ap0`:

```bash
sudo sed -i 's/\bwlo1\b/ap0/g' /etc/systemd/system/sga-nat.service
```

**Watchdog** (si lo creaste) — cambiar `wlo1` por `ap0`:

```bash
sudo sed -i 's/\bwlo1\b/ap0/g' /usr/local/bin/sga-wifi-watchdog.sh
```

### 8.6 Aplicar todo y reiniciar

```bash
sudo systemctl daemon-reload
sudo netplan apply           # por si acaso
sudo update-initramfs -u     # aplica el blacklist de iwlwifi
sudo reboot
```

### 8.7 Verificar tras reiniciar

```bash
# La Intel ya no debe aparecer; sí el adaptador USB como ap0
ip link

# IP del hotspot asignada
ip a show ap0                       # debe mostrar 192.168.137.1

# Servicios arriba
sudo systemctl status hostapd dnsmasq ap0-ip sga-nat

# El adaptador en modo AP, y SIN errores de microcódigo
sudo iw dev ap0 info
sudo dmesg | grep -iE "mt76|rt2800|error" | tail
```

Conecta una laptop cliente a **SGA-Academia** y verifica que:
- Obtiene IP `192.168.137.x`
- `nslookup sga.intranet` → `192.168.137.1`
- Carga `http://sga.intranet:3000`
- Hay internet (NAT) y **ya no hay reinicios** del WiFi

> Con el chipset MediaTek/Ralink ya no deberían aparecer los `ADVANCED_SYSASSERT`.
> El hotspot quedará estable para los 10-15 alumnos.

---

## Verificación final del sistema

Una vez completados todos los pasos, verificar desde una laptop cliente:

```powershell
# 1. DNS resuelve correctamente
nslookup sga.intranet
# Esperado: Address: 192.168.137.1

# 2. Puerto del frontend accesible
Test-NetConnection -ComputerName sga.intranet -Port 3000
# Esperado: TcpTestSucceeded: True

# 3. Puerto del backend accesible
Test-NetConnection -ComputerName sga.intranet -Port 3001
# Esperado: TcpTestSucceeded: True
```

Abrir el navegador en `http://sga.intranet:3000` e iniciar sesión.

---

## Resumen de servicios y puertos

| Servicio | Puerto | Descripción |
|---|---|---|
| Next.js Frontend | 3000 | Interfaz web del sistema |
| NestJS Backend | 3001 | API REST |
| PostgreSQL | 5433 | Base de datos |
| Redis | 6380 | Caché y sesiones |
| MinIO API | 9000 | Almacenamiento de fotos y PDFs |
| MinIO Consola | 9002 | Administración de MinIO |
| SSH | 22 | Acceso remoto al servidor |

## Acceso a servicios de administración

| Servicio | URL | Credenciales |
|---|---|---|
| Sistema SGA | http://sga.intranet:3000 | credenciales del sistema |
| MinIO Consola | http://sga.intranet:9002 | minio_admin / minio_pass_dev |
| SSH | ssh sgaadmin@sga.intranet | usuario del servidor |
