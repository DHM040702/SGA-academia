# Guía de Instalación y Despliegue
## Centro Preuniversitario UNASAM — Sistema de Gestión Académica
**Versión 3.0 · Windows 11 · WSL 2 · Red Local con DNS**

> Documento de uso interno — Solo personal autorizado

---

## Índice

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Instalación de Dependencias](#2-instalación-de-dependencias)
3. [Configuración del Proyecto](#3-configuración-del-proyecto)
4. [Variables de Entorno](#4-variables-de-entorno)
5. [Servicios Docker](#5-servicios-docker)
6. [Compilar e Iniciar el Sistema](#6-compilar-e-iniciar-el-sistema)
7. [Red WiFi por Software — Mobile Hotspot](#7-red-wifi-por-software--mobile-hotspot)
8. [DNS Local — Acceso por sga.local](#8-dns-local--acceso-por-sgalocal)
9. [Port Forwarding Permanente](#9-port-forwarding-permanente)
10. [Inicio Automático en Windows 11](#10-inicio-automático-en-windows-11)
    - [10.0 Inicio de sesión automático](#100-inicio-de-sesión-automático-obligatorio)
11. [Actualizaciones desde GitHub](#11-actualizaciones-desde-github)
12. [Actualizar el sistema con Git](#12-actualizar-el-sistema-con-git)
13. [Verificación Final](#13-verificación-final)
14. [Solución de Problemas](#14-solución-de-problemas)
15. [Mantenimiento y Respaldo](#15-mantenimiento-y-respaldo)

---

## 1. Requisitos del Sistema

### 1.1 Hardware

| Componente | Mínimo | Recomendado |
|---|---|---|
| Procesador | 4 núcleos | 8 núcleos o más |
| Memoria RAM | 8 GB | 16 GB |
| Almacenamiento | 50 GB SSD libres | 100 GB SSD NVMe |
| Tarjeta WiFi | Cualquier adaptador 802.11 | WiFi 5 o superior |
| Sistema Operativo | Windows 11 Pro 64 bits | Windows 11 Pro o Enterprise |

> ✅ La tarjeta WiFi es necesaria para crear la red Mobile Hotspot. Si el equipo no la tiene, un adaptador USB-WiFi (compatible con Windows 11) es suficiente.

### 1.2 Software y permisos previos

- Cuenta de Windows con permisos de **Administrador**
- Virtualización habilitada en BIOS/UEFI (VT-x o AMD-V)
- WSL 2 instalado (se configura en la Sección 2.1)
- Acceso a internet durante la instalación inicial

---

## 2. Instalación de Dependencias

Instalar en el orden indicado.

### 2.1 WSL 2 (Windows Subsystem for Linux)

Abrir **PowerShell como Administrador** y ejecutar:

```powershell
wsl --install -d Ubuntu
```

Reiniciar el equipo cuando se solicite. Al abrir Ubuntu por primera vez, crear un usuario y contraseña de Linux.

Verificar:
```powershell
wsl --version
```

### 2.2 Docker Desktop para Windows

1. Descargar desde: https://www.docker.com/products/docker-desktop/
2. Ejecutar el instalador con las opciones:
   - Backend: **WSL 2** (seleccionado por defecto)
   - Activar: **Start Docker Desktop when you log in**
3. Tras instalar, abrir Docker Desktop y esperar el estado **Engine running** (icono verde)

Verificar en PowerShell:
```powershell
docker --version
docker compose version
```

### 2.3 Node.js 20 LTS + pnpm (dentro de WSL)

Abrir una terminal **WSL (Ubuntu)** y ejecutar:

```bash
# Instalar nvm (gestor de versiones de Node)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar el perfil
source ~/.bashrc

# Instalar Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Instalar pnpm
npm install -g pnpm

# Verificar
node --version    # v20.x.x
pnpm --version
```

### 2.4 Git (dentro de WSL)

```bash
sudo apt update && sudo apt install -y git

# Verificar
git --version
```

### 2.5 dnsmasq (DNS local — dentro de WSL)

```bash
sudo apt install -y dnsmasq
```

---

## 3. Configuración del Proyecto

### 3.1 Clonar desde GitHub

El repositorio es **público** — no se requiere cuenta ni contraseña.

En una terminal **WSL**:

```bash
cd /mnt/c
git clone https://github.com/USUARIO/sga-academia.git

# La carpeta C:\sga-academia queda creada automáticamente
ls /mnt/c/sga-academia
```

> ⚠️ Reemplazar `USUARIO` con el nombre de usuario real de GitHub.

### 3.2 Instalar dependencias del proyecto

```bash
# Backend
cd /mnt/c/sga-academia/backend
pnpm install

# Frontend
cd /mnt/c/sga-academia/frontend
pnpm install
```

---

## 4. Variables de Entorno

### 4.1 Backend — `C:\sga-academia\backend\.env`

Crear el archivo con el siguiente contenido:

```env
# ── Base de datos ──────────────────────────────────────────────
# 172.29.160.1 = IP del host Windows vista desde WSL (vEthernet WSL)
DATABASE_URL="postgresql://sga_user:sga_pass_dev@172.29.160.1:5433/sga_db"

# ── Redis ──────────────────────────────────────────────────────
REDIS_URL="redis://172.29.160.1:6380"

# ── MinIO ──────────────────────────────────────────────────────
MINIO_ENDPOINT="172.29.160.1"
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY="minio_admin"
MINIO_SECRET_KEY="minio_pass_dev"
MINIO_BUCKET="sga-archivos"

# ── JWT ────────────────────────────────────────────────────────
JWT_SECRET="reemplazar_con_64_caracteres_aleatorios_minimo_xxxxxxxxxxxxxxxx"
JWT_REFRESH_SECRET="reemplazar_con_otros_64_caracteres_diferentes_yyyyyyyyyyyy"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ── Servidor ───────────────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ── CORS ───────────────────────────────────────────────────────
FRONTEND_URL="http://localhost:3000,http://192.168.137.1:3000,http://sga.local"
```

> 🔴 Generar los valores JWT con:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

> ⚠️ La IP `172.29.160.1` es la puerta de enlace de WSL hacia el host Windows. Verificar con `ipconfig` en Windows buscando el adaptador **vEthernet (WSL)**.

### 4.2 Frontend — `C:\sga-academia\frontend\.env.local`

```env
# URL de la API del backend — incluye el prefijo /api
# Para acceso desde otros dispositivos por el hotspot:
NEXT_PUBLIC_API_URL=http://192.168.137.1:3001/api

# Para desarrollo solo en el servidor (sin hotspot):
# NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Para acceso por hostname (después de configurar DNS — Sección 8):
# NEXT_PUBLIC_API_URL=http://sga.local/api
```

> ⚠️ Después de cambiar este archivo ejecutar `pnpm run build` en la carpeta frontend.

---

## 5. Servicios Docker

### 5.1 Iniciar los contenedores

Desde **PowerShell** (o CMD) en Windows:

```powershell
cd C:\sga-academia
docker compose up -d
```

La primera vez descarga las imágenes (puede tardar varios minutos).

### 5.2 Verificar que están corriendo

```powershell
docker compose ps
```

Todos deben mostrar estado `running`. Puertos activos:

| Puerto | Servicio |
|---|---|
| 5433 | PostgreSQL 16 |
| 6380 | Redis 7 |
| 9000 | MinIO (API) |
| 9002 | MinIO (Consola web) |

### 5.3 Cargar los datos iniciales

El archivo `seed.sql` incluye la creación del esquema completo (tablas, enums, índices y claves foráneas) de forma idempotente. **No es necesario correr las migraciones de Prisma por separado** — con un solo comando se crea todo desde cero:

```powershell
docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < C:\sga-academia\seed.sql
```

El comando es seguro de ejecutar varias veces: si las tablas ya existen se omiten sin error, y si los datos ya están se reemplazan.

> ⚠️ Si la base de datos tiene datos de producción (asistencias reales, etc.), este comando los borrará. Hacer un respaldo antes (ver Sección 14.1).

---

## 6. Compilar e Iniciar el Sistema

### 6.1 Backend — Terminal WSL #1

```bash
cd /mnt/c/sga-academia/backend

# Compilar (solo necesario si hay cambios en el código)
pnpm run build

# Iniciar en producción
pnpm run start:prod
```

Salida esperada:
```
🚀 Backend corriendo en http://localhost:3001/api
📖 Swagger en http://localhost:3001/api/docs
```

### 6.2 Frontend — Terminal WSL #2

Abrir una **segunda terminal WSL** (sin cerrar la del backend):

```bash
cd /mnt/c/sga-academia/frontend

# Compilar (obligatorio después de cambiar .env.local o el código)
pnpm run build

# Iniciar
pnpm run start
```

Salida esperada:
```
▲ Next.js 16.x
- Local:   http://localhost:3000
- Network: http://172.29.x.x:3000
✓ Ready in Xs
```

### 6.3 Verificar desde el servidor

Abrir el navegador en el propio servidor:
- `http://localhost:3000` — debe mostrar la pantalla de inicio de sesión

---

## 7. Red WiFi por Software — Mobile Hotspot

El servidor crea su propia red WiFi usando Windows 11, sin necesidad de ningún hardware adicional. Los dispositivos cliente se conectan a esta red como a cualquier WiFi normal.

### 7.1 Cómo funciona

```
[Red institucional / Internet]
        │ (cable Ethernet)
[SERVIDOR SGA — Windows 11]
        │ (tarjeta WiFi actúa como punto de acceso)
[Red WiFi: SGA-Academia — IP servidor: 192.168.137.1]
     /         |          \
[PC 1]      [PC 2]    [Teléfono]
.137.x      .137.x     .137.x
```

> ✅ `192.168.137.1` es **siempre fija** cuando el Mobile Hotspot está activo. No cambia entre reinicios.

### 7.2 Activar el Mobile Hotspot — paso a paso

#### Paso 1 — Abrir Configuración

Presionar `Windows + I` → **Red e Internet** → **Zona con cobertura inalámbrica móvil**

#### Paso 2 — Configurar qué conexión compartir

- **Compartir mi conexión desde:** seleccionar **Ethernet** (el cable de la red institucional)
- **Compartir a través de:** **Wi-Fi**

> ⚠️ Seleccionar Ethernet, NO el adaptador WiFi. Si se selecciona WiFi, el hotspot no funcionará.

#### Paso 3 — Personalizar nombre y contraseña

Clic en **Editar**:

| Campo | Valor |
|---|---|
| Nombre de red | `SGA-Academia` |
| Contraseña | `academia2026` |
| Banda | `2,4 GHz` |

Clic en **Guardar**.

#### Paso 4 — Encender el hotspot

Activar el **interruptor principal**. Debe quedar en azul.

#### Paso 5 — Verificar la IP

En PowerShell:
```powershell
ipconfig
```
Buscar el adaptador **"Conexión de área local\* 10"** (o similar) con IP `192.168.137.1`.

### 7.3 Abrir puertos en el Firewall de Windows

Ejecutar en **PowerShell como Administrador** (una sola vez):

```powershell
New-NetFirewallRule -DisplayName "SGA Puerto 80"       -Direction Inbound -Protocol TCP -LocalPort 80   -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "SGA Frontend 3000"   -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "SGA Backend 3001"    -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "SGA MinIO 9000"      -Direction Inbound -Protocol TCP -LocalPort 9000 -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "SGA DNS 53 TCP"      -Direction Inbound -Protocol TCP -LocalPort 53   -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "SGA DNS 53 UDP"      -Direction Inbound -Protocol UDP -LocalPort 53   -Action Allow -Profile Any
```

### 7.4 Conectar los dispositivos cliente

1. En el dispositivo cliente, abrir la lista de redes WiFi
2. Conectarse a **`SGA-Academia`**
3. Ingresar la contraseña: `academia2026`
4. Abrir el navegador y escribir: **`http://sga.local`** (después de la Sección 8) o **`http://192.168.137.1`**

> ⚠️ El Mobile Hotspot soporta hasta **10 dispositivos simultáneos**.

---

## 8. DNS Local — Acceso por `sga.local`

En lugar de escribir `http://192.168.137.1`, los usuarios podrán escribir simplemente **`http://sga.local`** desde cualquier dispositivo conectado al hotspot.

### 8.1 Cómo funciona

```
[Dispositivo escribe: http://sga.local]
        │
        ▼ consulta DNS a 192.168.137.1 (empujado por DHCP del hotspot)
        │
[dnsmasq en WSL — IP 192.168.137.2]
   responde: sga.local → 192.168.137.1
        │
        ▼ navega a http://192.168.137.1:80
        │
[netsh portproxy → localhost:3000 → WSL Next.js]
        │
        ▼ página cargada ✅
```

### 8.2 Configurar dnsmasq en WSL

En una terminal **WSL**:

```bash
# Crear configuración de dnsmasq
sudo tee /etc/dnsmasq.d/sga.conf > /dev/null << 'EOF'
# sga.local → IP del hotspot
address=/sga.local/192.168.137.1

# No reenviar consultas sin dominio
domain-needed
bogus-priv

# Escuchar en todas las interfaces
listen-address=0.0.0.0
bind-interfaces
port=53
EOF

# Deshabilitar el resolver del sistema que ocupa el puerto 53
sudo systemctl disable systemd-resolved 2>/dev/null || true
sudo systemctl stop    systemd-resolved 2>/dev/null || true

# Verificar configuración
sudo dnsmasq --test
```

### 8.3 Asignar IP estática a WSL en la subred del hotspot

Para que los clientes del hotspot puedan alcanzar dnsmasq directamente (sin portproxy, que no soporta UDP), WSL necesita una IP en la misma subred del hotspot.

Editar `/etc/wsl.conf` en WSL:

```bash
sudo tee /etc/wsl.conf > /dev/null << 'EOF'
[boot]
command = "service dnsmasq start 2>/dev/null; ip addr add 192.168.137.2/24 dev eth0 label eth0:sga 2>/dev/null || true"

[network]
generateResolvConf = false
EOF
```

Reiniciar WSL desde PowerShell:
```powershell
wsl --shutdown
```

Luego abrir una nueva terminal WSL y verificar:
```bash
# Verificar IP estática
ip addr show eth0 | grep 192.168.137

# Verificar dnsmasq corriendo
sudo service dnsmasq status
```

### 8.4 Agregar ruta en Windows hacia WSL

En **PowerShell como Administrador** (una sola vez, es persistente):

```powershell
# Ruta permanente: 192.168.137.2 (WSL DNS) accesible por el adaptador del hotspot
route add 192.168.137.2 mask 255.255.255.255 192.168.137.1 -p
```

### 8.5 Actualizar el frontend para usar el hostname

Editar `C:\sga-academia\frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://sga.local/api
```

Reconstruir el frontend:
```bash
cd /mnt/c/sga-academia/frontend
pnpm run build && pnpm run start
```

---

## 9. Port Forwarding Permanente

El portproxy redirige el tráfico del hotspot hacia los servicios que corren en WSL. Estas reglas **son persistentes** (sobreviven reinicios) y usan `127.0.0.1` (localhost de Windows) gracias al **WSL localhost forwarding** que está activo por defecto.

Ejecutar en **PowerShell como Administrador** (una sola vez):

```powershell
# Puerto 80 → Frontend (permite acceder sin escribir el puerto)
netsh interface portproxy add v4tov4 `
  listenaddress=192.168.137.1 listenport=80 `
  connectaddress=127.0.0.1 connectport=3000

# Puerto 3000 → Frontend (acceso directo con puerto)
netsh interface portproxy add v4tov4 `
  listenaddress=192.168.137.1 listenport=3000 `
  connectaddress=127.0.0.1 connectport=3000

# Puerto 3001 → Backend API
netsh interface portproxy add v4tov4 `
  listenaddress=192.168.137.1 listenport=3001 `
  connectaddress=127.0.0.1 connectport=3001

# Puerto 9000 → MinIO (archivos y fotos)
netsh interface portproxy add v4tov4 `
  listenaddress=192.168.137.1 listenport=9000 `
  connectaddress=127.0.0.1 connectport=9000

# Verificar reglas creadas
netsh interface portproxy show v4tov4
```

Resultado esperado:
```
Escuchar en ipv4:       Conectar a ipv4:
Dirección       Puerto  Dirección   Puerto
--------------- ------  ----------- ------
192.168.137.1   80      127.0.0.1   3000
192.168.137.1   3000    127.0.0.1   3000
192.168.137.1   3001    127.0.0.1   3001
192.168.137.1   9000    127.0.0.1   9000
```

> ✅ Estas reglas **nunca necesitan actualizarse**. Usan `127.0.0.1` que siempre es estable. No dependen de la IP dinámica de WSL.

---

## 10. Inicio Automático en Windows 11

Para que todo el sistema arranque solo al encender el servidor **sin que nadie tenga que iniciar sesión manualmente**.

### 10.0 Inicio de sesión automático (OBLIGATORIO)

La tarea programada usa el disparador **"Al iniciar sesión"**. Sin inicio de sesión automático, si el servidor se reinicia sin que nadie esté presente, los servicios nunca arrancarían.

> ⚠️ Este paso es indispensable para que el sistema sea verdaderamente autónomo al encender la computadora.

#### Método — Registro de Windows

Abrir **PowerShell como Administrador** y ejecutar:

```powershell
# Reemplazar 'NombreUsuario' y 'ContrasenaMaquina' con los datos reales de la cuenta de Windows
$ruta = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

Set-ItemProperty -Path $ruta -Name "AutoAdminLogon"  -Value "1"
Set-ItemProperty -Path $ruta -Name "DefaultUserName" -Value "NombreUsuario"
Set-ItemProperty -Path $ruta -Name "DefaultPassword" -Value "ContrasenaMaquina"
Set-ItemProperty -Path $ruta -Name "DefaultDomainName" -Value $env:COMPUTERNAME

Write-Host "Inicio de sesion automatico configurado correctamente."
```

Para verificar que quedó configurado:
```powershell
$ruta = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Get-ItemProperty -Path $ruta | Select-Object AutoAdminLogon, DefaultUserName, DefaultDomainName
```

Debe mostrar `AutoAdminLogon = 1` y el nombre de usuario correcto.

> 🔴 **Seguridad:** la contraseña queda almacenada en el registro de Windows. Este método es apropiado para un servidor de uso interno en red local. No se recomienda en equipos con acceso físico de personas no autorizadas.

#### Secuencia completa de arranque automático

```
PC se enciende
    │
    ▼
Windows carga → Docker Desktop inicia automáticamente
    │
    ▼
Docker inicia los contenedores (restart: unless-stopped)
    Postgres ✅   Redis ✅   MinIO ✅
    │
    ▼
Windows inicia sesión automáticamente (sin intervención)
    │
    ▼
Tarea programada "SGA Inicio" (espera 60 segundos):
    1. iniciar-hotspot.ps1  → Red WiFi SGA-Academia activa
    2. net start SGA-Backend → WSL arranca + dnsmasq + backend en :3001
    3. net start SGA-Frontend → frontend en :3000
    │
    ▼
Sistema disponible en http://sga.local ✅
(aprox. 90 segundos desde el encendido)
```

### 10.1 Script de inicio del hotspot

Crear el archivo `C:\sga-academia\iniciar-hotspot.ps1`:

```powershell
# iniciar-hotspot.ps1 — Activa el Mobile Hotspot automáticamente
Add-Type -AssemblyName System.Runtime.WindowsRuntime

function Await($WinRtTask) {
    $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 })[0]
    $netTask = $asTask.MakeGenericMethod($WinRtTask.GetType().GetGenericArguments()[0]).Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

$cp = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()

if ($cp -eq $null) {
    Write-Host "[ERROR] Sin conexion a internet. Verificar el cable Ethernet." -ForegroundColor Red
    exit 1
}

$tm = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($cp)

if ($tm.TetheringOperationalState -eq 1) {
    Write-Host "[OK] Hotspot SGA-Academia ya estaba activo." -ForegroundColor Green
    exit 0
}

$cfg = $tm.GetCurrentAccessPointConfiguration()
if ($cfg.Ssid -ne "SGA-Academia") {
    $cfg.Ssid       = "SGA-Academia"
    $cfg.Passphrase = "academia2026"
    Await($tm.ConfigureAccessPointAsync($cfg)) | Out-Null
}

Write-Host "[INFO] Iniciando hotspot SGA-Academia..." -ForegroundColor Cyan
Await($tm.StartTetheringAsync()) | Out-Null
Start-Sleep -Seconds 3

if ($tm.TetheringOperationalState -eq 1) {
    Write-Host "[OK] Hotspot activo en 192.168.137.1" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se pudo iniciar el hotspot." -ForegroundColor Red
}
```

### 10.2 Servicios Windows con NSSM

NSSM convierte el backend y frontend (Node.js en WSL) en servicios de Windows.

#### Descargar NSSM

Descargar desde: https://nssm.cc/download (versión 2.24 o superior) y extraer en `C:\tools\nssm\`.

#### Crear servicio Backend

```cmd
C:\tools\nssm\win64\nssm.exe install SGA-Backend
```

Configurar en la ventana que aparece:
- **Application Path:** `C:\Windows\System32\wsl.exe`
- **Startup directory:** `C:\sga-academia`
- **Arguments:** `-d Ubuntu -- bash -c "source ~/.nvm/nvm.sh && cd /mnt/c/sga-academia/backend && pnpm run start:prod"`
- Pestaña **Log on:** cuenta de administrador

#### Crear servicio Frontend

```cmd
C:\tools\nssm\win64\nssm.exe install SGA-Frontend
```

- **Application Path:** `C:\Windows\System32\wsl.exe`
- **Arguments:** `-d Ubuntu -- bash -c "source ~/.nvm/nvm.sh && cd /mnt/c/sga-academia/frontend && pnpm run start"`

### 10.3 Docker Desktop con inicio automático

Docker Desktop → Configuración → General → Activar **Start Docker Desktop when you log in**

### 10.4 Tarea programada — orden de inicio

Abrir **Programador de tareas** y crear una tarea nueva:

**Pestaña General:**
- Nombre: `SGA Inicio`
- Marcar: **Ejecutar con los privilegios más altos**
- Configurar para: `Windows 10` (compatible con Windows 11)

**Pestaña Desencadenadores:**
- Iniciar la tarea: **Al iniciar sesión**
- Retraso: **60 segundos** (para que Docker esté listo)

**Pestaña Acciones** (en este orden):

| Orden | Programa | Argumentos |
|---|---|---|
| 1 | `powershell.exe` | `-ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\sga-academia\iniciar-hotspot.ps1"` |
| 2 (retraso 10s) | `net.exe` | `start SGA-Backend` |
| 3 (retraso 15s) | `net.exe` | `start SGA-Frontend` |

**Pestaña Condiciones:**
- Desmarcar: **Iniciar solo si el equipo usa corriente alterna**

---

## 11. Actualizaciones desde GitHub

El repositorio es público — no se requiere login para descargar actualizaciones.

### 11.1 Script de actualización automática

Crear `C:\sga-academia\actualizar.bat`:

```batch
@echo off
echo ============================================
echo    ACTUALIZACION SGA ACADEMIA
echo ============================================

echo Deteniendo servicios...
net stop SGA-Frontend 2>nul
net stop SGA-Backend  2>nul
timeout /t 5 /nobreak > nul

echo Descargando actualizacion desde GitHub...
cd /d C:\sga-academia
git pull origin main
if %errorlevel% neq 0 (
    echo ERROR: No se pudo descargar. Verificar internet.
    pause & exit /b 1
)

echo Compilando backend...
wsl -d Ubuntu -- bash -c "source ~/.nvm/nvm.sh && cd /mnt/c/sga-academia/backend && pnpm install && pnpm run build"
if %errorlevel% neq 0 ( echo ERROR en backend. & pause & exit /b 1 )

echo Compilando frontend...
wsl -d Ubuntu -- bash -c "source ~/.nvm/nvm.sh && cd /mnt/c/sga-academia/frontend && pnpm install && pnpm run build"
if %errorlevel% neq 0 ( echo ERROR en frontend. & pause & exit /b 1 )

echo Reiniciando servicios...
net start SGA-Backend
timeout /t 10 /nobreak > nul
net start SGA-Frontend

echo.
echo ============================================
echo    ACTUALIZACION COMPLETADA
echo ============================================
echo Abrir http://sga.local para verificar.
pause
```

Ejecutar con **clic derecho → Ejecutar como administrador**.

### 11.2 Verificar la versión instalada

```bash
cd /mnt/c/sga-academia
git log --oneline -5
```

---

## 12. Actualizar el sistema con Git

Esta sección explica cómo mantener el sistema al día cuando el equipo de desarrollo publica una nueva versión en GitHub. Se aplica tanto al servidor principal como a cualquier PC donde se haya instalado el sistema.

### 12.1 Entender qué archivos se actualizan con Git

Git sincroniza únicamente el **código fuente** del repositorio. Los siguientes archivos **nunca se tocan** porque están en `.gitignore`:

| Archivo | Por qué no se toca |
|---|---|
| `backend/.env` | Contiene contraseñas e IPs de cada instalación |
| `frontend/.env.local` | Contiene la URL de la API específica del servidor |
| `node_modules/` | Se regenera con `pnpm install` |
| `backend/dist/` | Se regenera con `pnpm run build` |

### 12.2 Verificar el estado actual antes de actualizar

Abrir una terminal **WSL** y ejecutar:

```bash
cd /mnt/c/sga-academia

# Ver en qué versión está el sistema
git log --oneline -5

# Ver si hay cambios locales pendientes (normalmente no debe haber ninguno)
git status
```

Si `git status` muestra archivos modificados que **no** son los de la tabla anterior, consultar al equipo de desarrollo antes de continuar.

### 12.3 Descargar e instalar la actualización

#### Paso 1 — Detener los servicios

En **PowerShell como Administrador**:

```powershell
net stop SGA-Frontend
net stop SGA-Backend
```

#### Paso 2 — Descargar el código nuevo

En terminal **WSL**:

```bash
cd /mnt/c/sga-academia
git pull origin main
```

Salida esperada si hay cambios:
```
remote: Enumerating objects: 12, done.
Updating a1b2c3d..e4f5g6h
Fast-forward
 backend/src/... | 5 +++--
 seed.sql        | 20 ++++++++++++++
 2 files changed, ...
```

Si aparece `Already up to date.` significa que ya tenías la versión más reciente.

#### Paso 3 — Instalar dependencias y compilar

```bash
# Backend
cd /mnt/c/sga-academia/backend
pnpm install
pnpm run build

# Frontend
cd /mnt/c/sga-academia/frontend
pnpm install
pnpm run build
```

#### Paso 4 — Cargar datos actualizados (solo si el seed.sql cambió)

Si el `git pull` del Paso 2 mostró cambios en `seed.sql`, ejecutar en **PowerShell**:

```powershell
docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < C:\sga-academia\seed.sql
```

> ⚠️ Este comando borra y recarga alumnos, docentes, aulas y cursos. Las asistencias registradas **se borran**. Hacer respaldo primero si hay datos importantes (ver Sección 15.1).

Si el seed.sql **no** cambió, omitir este paso.

#### Paso 5 — Reiniciar los servicios

En **PowerShell como Administrador**:

```powershell
net start SGA-Backend
Start-Sleep -Seconds 10
net start SGA-Frontend
```

#### Paso 6 — Verificar

Abrir `http://localhost:3000` y confirmar que el login funciona. Revisar la versión instalada:

```bash
cd /mnt/c/sga-academia
git log --oneline -3
```

### 12.4 Script automático de actualización

El archivo `C:\sga-academia\actualizar.bat` (creado en la Sección 11.1) automatiza todos estos pasos excepto la recarga del seed. Ejecutar con **clic derecho → Ejecutar como administrador**.

Para casos donde también cambió el seed, agregar esta línea al final del `.bat` antes del `pause`:

```batch
echo Recargando datos iniciales...
docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < C:\sga-academia\seed.sql
```

### 12.5 Resolver conflictos al hacer git pull

Si `git pull` falla con un mensaje como `error: Your local changes would be overwritten`, significa que hay un archivo del repositorio modificado localmente. En condiciones normales esto no debería ocurrir.

**Solución estándar:**

```bash
# Ver qué archivos están en conflicto
git status

# Descartar los cambios locales en ese archivo y aceptar la versión del servidor
git checkout -- <nombre-del-archivo>

# Reintentar la actualización
git pull origin main
```

> 🔴 Solo hacer `git checkout --` sobre archivos que no sean `.env` ni `.env.local`. Si el conflicto es en uno de esos archivos, consultar al equipo de desarrollo.

---

## 13. Verificación Final

### 13.1 Lista de verificación completa

- [ ] Docker Desktop corriendo (icono verde en la bandeja)
- [ ] `docker compose ps` muestra todos los contenedores en estado `running`
- [ ] Backend responde: `http://localhost:3001/api/docs` abre Swagger
- [ ] Frontend responde: `http://localhost:3000` muestra login
- [ ] Hotspot `SGA-Academia` visible en la lista de redes WiFi
- [ ] Portproxy activo: `netsh interface portproxy show v4tov4`
- [ ] Desde dispositivo conectado al hotspot: `http://sga.local` carga el login
- [ ] Login funciona con credenciales correctas
- [ ] Los servicios `SGA-Backend` y `SGA-Frontend` aparecen en `services.msc`

### 13.2 URLs de acceso

| Acceso | URL |
|---|---|
| Desde el servidor (local) | `http://localhost:3000` |
| Desde cualquier dispositivo en el hotspot | `http://sga.local` |
| Alternativa con IP | `http://192.168.137.1` |
| API / Swagger | `http://localhost:3001/api/docs` |

### 13.3 Credenciales iniciales para usuarios

| Tipo | Email / Formato | Contraseña |
|---|---|---|
| Admin | `admin@cepreunasam.edu.pe` | `admin123` |
| Director | `director@cepreunasam.edu.pe` | `admin123` |
| Vigilante | `vigilante@cepreunasam.edu.pe` | `admin123` |
| Docente | `{dni}@docente.academia.edu` | `Matricula2026` |
| Alumno | `{codigo_barras}@academia.edu` | `Matricula2026` |

---

## 14. Solución de Problemas

### 14.1 El backend no inicia

```bash
# Verificar que el .env tiene las variables correctas
cat /mnt/c/sga-academia/backend/.env

# Verificar que Docker está corriendo
docker compose ps

# Ver logs del backend
cd /mnt/c/sga-academia/backend && pnpm run start:prod
```

**Error `Cannot find module 'dist/main'`:** el backend no está compilado. Ejecutar `pnpm run build` primero.

**Error de conexión a PostgreSQL:** la IP en `DATABASE_URL` no es la correcta para WSL. Verificar con:
```powershell
# En PowerShell:
ipconfig | Select-String "172\."
```
La IP del adaptador **vEthernet (WSL)** es la que va en `DATABASE_URL`.

### 14.2 El frontend no carga desde otros dispositivos

**Paso 1 — Verificar portproxy:**
```powershell
netsh interface portproxy show v4tov4
```
Si no aparecen reglas, ejecutar nuevamente los comandos de la Sección 9.

**Paso 2 — Verificar firewall:**
```powershell
# En PowerShell como Administrador:
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "SGA*" } | Select-Object DisplayName, Enabled
```

**Paso 3 — Verificar que el frontend está corriendo:**
```bash
# En WSL:
curl http://localhost:3000
```

### 14.3 El login muestra "Credenciales incorrectas" con credenciales correctas

Causa: el frontend no llega a la API.

**Verificar la URL de la API:**
```bash
cat /mnt/c/sga-academia/frontend/.env.local
# Debe mostrar: NEXT_PUBLIC_API_URL=http://sga.local/api
# o: NEXT_PUBLIC_API_URL=http://192.168.137.1:3001/api
```

**Importante:** el valor debe incluir `/api` al final. Sin él, la URL de login sería `/auth/login` en lugar de `/api/auth/login` y retornaría 404.

Si se cambió `.env.local`, reconstruir el frontend:
```bash
cd /mnt/c/sga-academia/frontend && pnpm run build && pnpm run start
```

### 14.4 `sga.local` no resuelve

```bash
# En WSL — verificar que dnsmasq está corriendo:
sudo service dnsmasq status

# Si no está corriendo:
sudo service dnsmasq start

# Verificar que WSL tiene la IP 192.168.137.2:
ip addr show eth0 | grep 192.168.137
```

Si la IP no aparece, verificar `/etc/wsl.conf` y reiniciar WSL con `wsl --shutdown`.

### 14.5 La página se recarga en bucle en el dispositivo cliente

Causa: el interceptor de axios intenta hacer refresh cuando la sesión ha expirado y redirige a `/login` en un loop.

Este bug fue corregido en `src/lib/api.ts`. Verificar que la versión del código tiene la siguiente condición en el interceptor:

```typescript
const isAuthEndpoint =
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/me')
```

Y en el bloque catch del refresh:
```typescript
if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
  window.location.href = '/login'
}
```

---

## 15. Mantenimiento y Respaldo

### 15.1 Respaldar la base de datos

Ejecutar **semanalmente** (reemplazar `FECHA` con la fecha real):

```powershell
# En PowerShell:
mkdir C:\backups 2>$null
docker exec sga-academia-postgres-1 pg_dump -U sga_user sga_db > C:\backups\sga_FECHA.sql
```

Copiar el archivo a un disco externo. Conservar al menos las últimas **4 copias**.

### 15.2 Archivos de configuración críticos a respaldar

```
C:\sga-academia\backend\.env
C:\sga-academia\frontend\.env.local
C:\sga-academia\docker-compose.yml
C:\sga-academia\iniciar-hotspot.ps1
C:\sga-academia\actualizar.bat
/etc/wsl.conf                    (dentro de WSL)
/etc/dnsmasq.d/sga.conf          (dentro de WSL)
```

### 15.3 Reinicio manual de todos los servicios

```powershell
# PowerShell como Administrador:
net stop SGA-Frontend
net stop SGA-Backend
cd C:\sga-academia
docker compose restart
Start-Sleep -Seconds 20
net start SGA-Backend
Start-Sleep -Seconds 10
net start SGA-Frontend
```

### 15.4 Secuencia completa de inicio desde cero

En caso de reinicio del servidor:

1. **Docker Desktop** inicia automáticamente (configurado en Sección 10.3)
2. **Tarea programada** (después de 60 segundos) activa el hotspot e inicia los servicios
3. Verificar con `http://sga.local` desde un dispositivo conectado al hotspot

Si algo no arrancó:
```powershell
# 1. Hotspot
powershell -File C:\sga-academia\iniciar-hotspot.ps1

# 2. Docker
docker compose up -d

# 3. Servicios
net start SGA-Backend
net start SGA-Frontend
```

---

*Para soporte técnico o actualizaciones del sistema, contactar al equipo de desarrollo.*
*Conservar siempre el respaldo más reciente antes de cualquier intervención técnica.*
