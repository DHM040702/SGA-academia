# Instalación del SGA en Windows 10 — Guía Completa

**Sistema:** Centro Preuniversitario UNASAM
**Plataforma destino:** Windows 10 (64-bit), modo hotspot para aulas

---

## Índice

1. [Requisitos del sistema](#1-requisitos-del-sistema)
2. [Habilitar rutas largas en Windows](#2-habilitar-rutas-largas-en-windows)
3. [Instalar Git para Windows](#3-instalar-git-para-windows)
4. [Instalar Node.js con nvm-windows](#4-instalar-nodejs-con-nvm-windows)
5. [Instalar pnpm](#5-instalar-pnpm)
6. [Instalar Docker Desktop](#6-instalar-docker-desktop)
7. [Clonar el repositorio](#7-clonar-el-repositorio)
8. [Levantar la base de datos y servicios](#8-levantar-la-base-de-datos-y-servicios)
9. [Configurar variables de entorno](#9-configurar-variables-de-entorno)
10. [Cargar datos iniciales](#10-cargar-datos-iniciales)
11. [Compilar el sistema](#11-compilar-el-sistema)
12. [Iniciar los servidores](#12-iniciar-los-servidores)
13. [Verificar que el sistema funciona](#13-verificar-que-el-sistema-funciona)
14. [Configurar el hotspot de Windows](#14-configurar-el-hotspot-de-windows)
15. [Acceso desde dispositivos de alumnos](#15-acceso-desde-dispositivos-de-alumnos)
16. [Scripts de inicio automático](#16-scripts-de-inicio-automático)
17. [Actualizar el sistema con Git](#17-actualizar-el-sistema-con-git)

---

## 1. Requisitos del sistema

| Requisito | Mínimo |
|-----------|--------|
| Sistema operativo | Windows 10 64-bit (cualquier edición) |
| RAM | 8 GB |
| Espacio en disco | 20 GB libres |
| Procesador | Compatible con virtualización (Intel VT-x / AMD-V) |
| Red | Adaptador WiFi (para hotspot) |

> **Importante:** Los servidores del SGA se ejecutan **directamente en Windows** (no en WSL). Esto evita los problemas de red que ocurren con WSL2 en Windows 10 (loopback roto, portproxy poco confiable, latencia de arranque por timeouts de red entre WSL y Docker Desktop).

---

## 2. Habilitar rutas largas en Windows

Los paquetes de NestJS generan rutas de archivo muy largas dentro de `node_modules` (por ejemplo `node_modules/.pnpm/@nestjs+platform-express@.../node_modules/...`). Windows limita las rutas a 260 caracteres por defecto, lo que hace fallar `pnpm install` con errores como `ENAMETOOLONG` o `EINVAL`.

1. Abrir **PowerShell como Administrador** y ejecutar:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

2. Reiniciar la computadora para que el cambio surta efecto.

> Este paso se hace **una sola vez** por computadora, antes de clonar el repositorio.

---

## 3. Instalar Git para Windows

1. Descargar el instalador desde: https://git-scm.com/download/win
   (elegir la versión de 64-bit)

2. Ejecutar el instalador con las opciones por defecto.

3. Verificar la instalación abriendo **PowerShell** y ejecutando:
   ```powershell
   git --version
   ```
   Debe mostrar algo como `git version 2.x.x`.

4. Habilitar soporte de rutas largas también en Git (complementa el paso 2):
   ```powershell
   git config --global core.longpaths true
   ```

---

## 4. Instalar Node.js con nvm-windows

Se usa `nvm-windows` para gestionar versiones de Node.js. **No instalar Node.js directamente** desde nodejs.org, ni mezclarlo con `nvm` de Linux/WSL — son herramientas distintas e incompatibles entre sí.

1. Descargar el instalador de nvm-windows desde:
   https://github.com/coreybutler/nvm-windows/releases
   Descargar el archivo `nvm-setup.exe` de la última versión.

2. Ejecutar `nvm-setup.exe` con las opciones por defecto.

3. Abrir **PowerShell como Administrador** y ejecutar:
   ```powershell
   nvm install 20.20.2
   nvm use 20.20.2
   ```

4. Verificar:
   ```powershell
   node --version
   ```
   Debe mostrar `v20.20.2`.

> A diferencia de `nvm` en Linux, `nvm-windows` aplica la versión seleccionada de forma global — no es necesario volver a ejecutar `nvm use` en cada terminal nueva.

---

## 5. Instalar pnpm

En **PowerShell como Administrador**:

```powershell
npm install -g pnpm
```

Verificar:
```powershell
pnpm --version
```

Debe mostrar `10.x.x` o superior.

---

## 6. Instalar Docker Desktop

Docker Desktop provee la base de datos PostgreSQL, Redis y MinIO sin necesidad de instalarlos manualmente.

1. Descargar desde: https://www.docker.com/products/docker-desktop/
   (elegir "Download for Windows")

2. Ejecutar el instalador. Durante la instalación:
   - Si pregunta entre **WSL2** o **Hyper-V**, elegir **WSL2** (recomendado en Windows 10; solo se usa para los contenedores de Docker, no para correr el SGA).
   - Reiniciar la computadora cuando lo solicite.

3. Abrir Docker Desktop después del reinicio y esperar a que inicie completamente (ícono en la barra de tareas deja de parpadear).

4. Verificar en PowerShell:
   ```powershell
   docker --version
   docker compose version
   ```

> **Nota:** Docker Desktop debe estar abierto (corriendo en segundo plano) cada vez que se use el SGA. Configurarlo para iniciar con Windows: Docker Desktop → Configuración → General → "Start Docker Desktop when you sign in to your computer".

---

## 7. Clonar el repositorio

En **PowerShell** (no necesita ser Administrador):

```powershell
git clone https://github.com/DHM040702/sga-academia.git C:\sga-academia
```

> Si el repositorio es privado, Git pedirá usuario y contraseña (o token de GitHub).

---

## 8. Levantar la base de datos y servicios

Abrir **PowerShell** en la carpeta del proyecto:

```powershell
cd C:\sga-academia
docker compose up -d
```

Verificar que los tres servicios estén corriendo:
```powershell
docker compose ps
```

Debe mostrar los tres servicios con estado `Up`:
```
sga-academia-postgres-1   Up   0.0.0.0:5433->5432/tcp
sga-academia-redis-1      Up   0.0.0.0:6380->6379/tcp
sga-academia-minio-1      Up   0.0.0.0:9000->9000/tcp, 0.0.0.0:9002->9001/tcp
```

> El puerto **9002** corresponde a la consola web de MinIO (mapeada desde el 9001 interno). No es necesaria para el funcionamiento del SGA, solo para administración manual de archivos si se requiere (`http://localhost:9002`).

---

## 9. Configurar variables de entorno

Docker Desktop expone los puertos publicados directamente en `localhost` de Windows — no se necesita ninguna IP especial (a diferencia de WSL2, donde antes se usaba la IP del adaptador vEthernet).

### 9.1 Backend — `C:\sga-academia\backend\.env`

Crear el archivo con el siguiente contenido (usar el Bloc de notas o VS Code):

```env
# ── Base de datos ──────────────────────────────────────────────
DATABASE_URL="postgresql://sga_user:sga_pass_dev@localhost:5433/sga_db"

# ── Redis ──────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6380"

# ── MinIO ──────────────────────────────────────────────────────
MINIO_ENDPOINT="localhost"
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
NODE_ENV=production

# ── CORS ───────────────────────────────────────────────────────
FRONTEND_URL="http://localhost:3000,http://192.168.137.1:3000"
```

Para generar los valores JWT, ejecutar en PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Ejecutarlo dos veces y pegar cada resultado en `JWT_SECRET` y `JWT_REFRESH_SECRET`.

### 9.2 Frontend — `C:\sga-academia\frontend\.env`

No es obligatorio crear este archivo: si no existe, el frontend usa `http://localhost:3001` por defecto para hablar con el backend (ver `frontend/next.config.ts`). Solo es necesario si el backend corre en otra dirección:

```env
INTERNAL_API_URL=http://localhost:3001
```

---

## 10. Cargar datos iniciales

Solo se hace **una vez** al instalar. Ejecutar en **PowerShell**:

```powershell
Get-Content C:\sga-academia\seed.sql | docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db
```

Si el comando termina sin errores (o solo con advertencias de tipo `already exists`), los datos se cargaron correctamente. El script es idempotente: crea las tablas si no existen y solo inserta datos base, sin duplicar nada en ejecuciones posteriores.

---

## 11. Compilar el sistema

### 11.1 Compilar el backend

```powershell
cd C:\sga-academia\backend
pnpm install
pnpm run build
```

El proceso toma entre 1 y 3 minutos. Al terminar debe aparecer `Successfully compiled`.

> **Sobre `bcrypt`:** este paquete usa un módulo nativo (compilado en C++) para el hash de contraseñas. El repositorio ya tiene configurado `pnpm.onlyBuiltDependencies` en `backend/package.json` para que pnpm 10 ejecute automáticamente su script de instalación (que descarga el binario precompilado para Windows). Si durante el `pnpm install` aparece un mensaje `Ignored build scripts` mencionando `bcrypt`, ejecutar:
> ```powershell
> pnpm approve-builds
> ```
> y marcar `bcrypt` con la barra espaciadora, luego Enter. Sin este paso, el login del sistema fallará en tiempo de ejecución con un error de módulo nativo faltante.

### 11.2 Compilar el frontend

```powershell
cd C:\sga-academia\frontend
pnpm install
pnpm run build
```

El proceso toma entre 2 y 5 minutos. Al terminar aparece un resumen de las páginas generadas.

> **Nota:** La compilación solo se necesita hacer una vez y después de cada actualización del código. No se necesita compilar cada vez que se inicia el sistema.

---

## 12. Iniciar los servidores

### Opción A — Manual (para pruebas)

Abrir **dos ventanas de PowerShell** separadas.

**Ventana 1 — Backend:**
```powershell
cd C:\sga-academia\backend
node dist/main
```
Esperar a ver: `Nest application successfully started`

**Ventana 2 — Frontend:**
```powershell
cd C:\sga-academia\frontend
pnpm run start
```
Esperar a ver: `Ready in ...ms`

### Opción B — Scripts independientes (recomendado)

En lugar de un solo script que mezcla todo, cada servidor tiene su propio script independiente — así se puede reiniciar uno sin tocar el otro, y cada uno libera su puerto automáticamente si quedó un proceso colgado de una ejecución anterior.

**`C:\sga-academia\backend-start.bat`:**
```batch
@echo off
title SGA Backend

:: Liberar el puerto 3001 si quedo ocupado por una ejecucion anterior
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d C:\sga-academia\backend

echo Iniciando backend SGA...
node dist/main
```

**`C:\sga-academia\frontend-start.bat`:**
```batch
@echo off
title SGA Frontend

:: Liberar el puerto 3000 si quedo ocupado por una ejecucion anterior
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d C:\sga-academia\frontend

echo Iniciando frontend SGA...
call pnpm run start
```

**`C:\sga-academia\Iniciar-SGA.bat`** (orquestador — activa el hotspot, levanta Docker y llama a los dos scripts anteriores cada uno en su propia ventana):
```batch
@echo off
echo Iniciando SGA...

:: Activar el hotspot SGA-Academia
powershell -ExecutionPolicy Bypass -File "C:\sga-academia\iniciar-hotspot.ps1"

:: Asegurar que Docker (PostgreSQL, Redis, MinIO) este levantado
docker compose -f C:\sga-academia\docker-compose.yml up -d

:: Iniciar backend en su propia ventana/script independiente
start "SGA Backend" cmd /k "C:\sga-academia\backend-start.bat"

:: Esperar a que el backend cargue antes de levantar el frontend
timeout /t 10 /nobreak

:: Iniciar frontend en su propia ventana/script independiente
start "SGA Frontend" cmd /k "C:\sga-academia\frontend-start.bat"

echo Servidores iniciados. Acceder en http://localhost:3000
```

Hacer doble clic en `Iniciar-SGA.bat` para arrancar todo. Si solo se necesita reiniciar el backend (por ejemplo tras una actualización), basta con cerrar su ventana y volver a ejecutar `backend-start.bat` directamente, sin afectar el frontend que sigue corriendo.

> El archivo `iniciar-hotspot.ps1` que invoca este script se crea en el paso 14.1. Si todavía no se ha creado, `Iniciar-SGA.bat` mostrará un error de PowerShell al llamarlo — no afecta a Docker, backend ni frontend, que igualmente se inician.

---

## 13. Verificar que el sistema funciona

Abrir el navegador en la misma computadora y entrar a:
```
http://localhost:3000
```

Debe mostrar la pantalla de inicio de sesión del SGA.

Para verificar el backend directamente:
```
http://localhost:3001/api
```

Si alguno no responde, revisar la consola correspondiente (ventana de backend o frontend) por errores antes de continuar con el resto de la guía.

---

## 14. Configurar el hotspot de Windows

El hotspot permite que los alumnos accedan al SGA desde sus dispositivos (celulares, tablets, laptops) sin necesidad de internet ni de un router externo.

### 14.1 Activar el hotspot

En lugar de activarlo manualmente desde Configuración cada vez, se usa un script de PowerShell que enciende el hotspot mediante la API de Windows (`NetworkOperatorTetheringManager`). Esto permite automatizarlo junto con el resto del arranque del sistema.

Crear `C:\sga-academia\iniciar-hotspot.ps1`:

```powershell
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

Ejecutarlo manualmente la primera vez para probarlo:
```powershell
powershell -ExecutionPolicy Bypass -File "C:\sga-academia\iniciar-hotspot.ps1"
```

Para cambiar el nombre de red o la contraseña, editar las variables `$cfg.Ssid` y `$cfg.Passphrase` dentro del script.

> **Requisito de la API de Windows:** `GetInternetConnectionProfile()` necesita que la PC tenga un perfil de conexión activo (por ejemplo, un cable Ethernet conectado), aunque ese cable no tenga salida real a internet. Si no hay ningún adaptador con perfil de conexión, el script falla con `Sin conexion a internet` y el hotspot no puede activarse — es una limitación de la API de tethering de Windows, no del SGA.
>
> Si la computadora no tiene adaptador WiFi, el hotspot de Windows no está disponible sin importar el script. En ese caso usar un router WiFi físico conectado a la misma red, y acceder por la IP LAN de la PC en lugar de `192.168.137.1`.

### 14.2 Verificar la IP del hotspot

Abrir PowerShell y ejecutar:
```powershell
ipconfig
```

Buscar el adaptador `"Conexión de área local* ..."` (suele decir "Local Area Connection* N"). La IP del gateway que Windows le asigna a este adaptador del hotspot es, casi siempre, `192.168.137.1`.

### 14.3 Permitir el acceso desde el hotspot en el Firewall

En **PowerShell como Administrador**:

```powershell
New-NetFirewallRule -DisplayName "SGA - Frontend (3000)" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

New-NetFirewallRule -DisplayName "SGA - Backend (3001)" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
```

Esto se hace una sola vez. Las reglas aplican a todos los perfiles de red (Dominio, Privada, Pública) por defecto, incluyendo el adaptador del hotspot.

---

## 15. Acceso desde dispositivos de alumnos

Los alumnos deben:
1. Conectarse a la red WiFi del hotspot (`SGA-CEPREUNASAM`)
2. Abrir el navegador y entrar a:
   ```
   http://192.168.137.1:3000
   ```

> **Recomendación:** Pedir a los alumnos que guarden esta dirección como marcador/favorito en sus navegadores.

### 15.1 DNS personalizado con Technitium DNS Server

Para que el personal y los alumnos accedan con `http://sga.local:3000` en lugar de la IP, sin modificar nada en sus celulares o laptops, se usa **Technitium DNS Server**: un servidor DNS gratuito y de código abierto para Windows, con panel de administración web. El hotspot de Windows ya entrega automáticamente su propia IP (`192.168.137.1`) como servidor DNS a cada dispositivo que se conecta — solo falta agregarle el registro de `sga.local`.

> Si la laptop todavía no lo tiene instalado: descargarlo desde https://technitium.com/dns/ (instalador para Windows), instalarlo como servicio. Se confirma que está corriendo viendo el servicio `DnsService` (nombre para mostrar "Technitium DNS Server") en `services.msc`, o con:
> ```powershell
> Get-Service -Name DnsService
> ```

**Configurar el registro `sga.local`:**

1. Abrir en el navegador el panel de administración:
   ```
   http://127.0.0.1:5380
   ```
2. Iniciar sesión con el usuario administrador configurado al instalar Technitium.
3. Ir a **Zones** → **Add Zone**.
   - **Zone Name:** `sga.local`
   - **Type:** `Primary`
   - Guardar.
4. Dentro de la zona `sga.local`, **Add Record**:
   - **Type:** `A`
   - **Name:** dejar en blanco (o `@`), para que apunte a la raíz `sga.local`
   - **IP Address:** `192.168.137.1`
   - Guardar.
5. (Opcional) Agregar también un registro con **Name:** `www` apuntando a la misma IP, si se quiere admitir `www.sga.local`.

Esto se configura **una sola vez**; Technitium guarda la zona en disco y la vuelve a cargar automáticamente cada vez que el servicio inicia con Windows.

**Verificar que resuelve correctamente** (desde la misma laptop, en PowerShell):
```powershell
Resolve-DnsName sga.local -Server 192.168.137.1
```
Debe devolver `192.168.137.1`.

Con esto, cualquier alumno o miembro del personal que se conecte a la red `SGA-Academia` puede entrar directamente a `http://sga.local:3000`, porque Windows ya le asignó `192.168.137.1` como su DNS por DHCP, y Technitium responde esa IP para `sga.local` sin que el dispositivo cliente necesite ninguna configuración.

> **Importante:** como Technitium ya ocupa el puerto 53 en `192.168.137.1`, **no** se debe instalar ni ejecutar ningún otro servidor DNS propio del SGA en esa misma interfaz — entrarían en conflicto (`EADDRINUSE`). Toda la configuración de `sga.local` se hace exclusivamente desde el panel de Technitium.

---

## 16. Scripts de inicio automático

Para que el sistema arranque automáticamente cuando encienda la computadora.

### 16.1 Script de espera para arranque desde cero

`Iniciar-SGA.bat` (paso 12, Opción B) ya levanta Docker y llama a `backend-start.bat` / `frontend-start.bat` de forma independiente. Lo único que falta para un arranque automático al encender la PC es darle tiempo a Docker Desktop para terminar de iniciar (puede tardar 20-40 segundos tras el login de Windows).

Crear `C:\sga-academia\inicio-completo.bat`:

```batch
@echo off
echo ============================================
echo    Iniciando SGA - CEPREUNASAM
echo ============================================

:: Esperar a que Docker Desktop inicie completamente
echo Esperando que Docker inicie...
timeout /t 30 /nobreak

:: Delegar a los scripts independientes (docker + backend + frontend)
call C:\sga-academia\Iniciar-SGA.bat
```

> Si la PC es lenta, aumentar el `timeout` a 45-60 segundos. Si el backend o frontend no arrancan en el primer intento por Docker no estar listo aún, basta con volver a ejecutar `backend-start.bat` o `frontend-start.bat` manualmente — cada uno libera su puerto y vuelve a intentar sin afectar al otro.

### 16.2 Configurar inicio automático con Windows

Para que el script corra al iniciar sesión en Windows:

1. Presionar `Win + R`, escribir `shell:startup` y presionar Enter.
2. Se abre la carpeta de inicio. Copiar o crear un acceso directo a `inicio-completo.bat` en esa carpeta.

> **Alternativa con tarea programada** (más confiable, sigue corriendo aunque la sesión esté minimizada):
>
> En PowerShell como Administrador:
> ```powershell
> $action = New-ScheduledTaskAction -Execute "C:\sga-academia\inicio-completo.bat"
> $trigger = New-ScheduledTaskTrigger -AtLogOn
> $settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable $false
> Register-ScheduledTask -TaskName "Iniciar SGA" -Action $action `
>   -Trigger $trigger -Settings $settings -RunLevel Highest -Force
> ```

---

## 17. Actualizar el sistema con Git

Cuando haya una nueva versión del sistema:

### 17.1 Descargar los cambios

```powershell
cd C:\sga-academia
git pull origin main
```

### 17.2 Determinar qué recompilar

| Archivos modificados | Acción requerida |
|---------------------|------------------|
| `backend/src/**` | Recompilar backend |
| `backend/prisma/schema.prisma` | Recompilar backend |
| `backend/package.json` | `pnpm install` antes de recompilar (pueden cambiar dependencias) |
| `frontend/**` | Recompilar frontend |
| `frontend/package.json` | `pnpm install` antes de recompilar |
| `seed.sql` | Re-ejecutar seed (solo si hay datos nuevos) |
| `docker-compose.yml` | Reiniciar Docker (`docker compose up -d`) |

### 17.3 Recompilar

**Si cambió el backend:**
```powershell
cd C:\sga-academia\backend
pnpm install
pnpm run build
```

**Si cambió el frontend:**
```powershell
cd C:\sga-academia\frontend
pnpm install
pnpm run build
```

### 17.4 Reiniciar los servidores

Cerrar las ventanas de backend y frontend que estaban corriendo, luego ejecutar `Iniciar-SGA.bat` nuevamente.

---

## Solución de problemas frecuentes

### `pnpm install` falla con errores de ruta (`ENAMETOOLONG`, `EINVAL`, etc.)
Repetir el paso 2 (rutas largas) y confirmar que la computadora se reinició después del cambio de registro.

### Falla el login con un error de módulo nativo (`bcrypt`)
```powershell
cd C:\sga-academia\backend
pnpm approve-builds
```
Marcar `bcrypt`, confirmar, y volver a compilar (`pnpm run build`).

### Docker no inicia
- Verificar que Docker Desktop esté abierto en la barra de tareas.
- Si los contenedores no arrancan: `docker compose up -d` en la carpeta del proyecto.

### El sistema no carga en el navegador
1. Verificar que la ventana del backend muestra `Nest application successfully started`.
2. Verificar que la ventana del frontend muestra `Ready`.
3. Confirmar que Docker está corriendo: `docker compose ps`.

### Los alumnos no pueden conectarse
1. Verificar que el hotspot esté activo en Configuración de Windows.
2. Confirmar que las reglas de firewall están creadas (sección 14.3).
3. Verificar la IP del hotspot con `ipconfig` y usar esa IP en el navegador.
4. Confirmar que el frontend arrancó con `--hostname 0.0.0.0` (ya viene así en `pnpm run start`, no usar `next dev` para producción).

### Error al compilar ("nest: not found" u otro)
```powershell
cd C:\sga-academia\backend
pnpm install
pnpm exec prisma generate
pnpm exec nest build
```

### La base de datos no conecta
Verificar que los contenedores estén corriendo:
```powershell
docker compose ps
```
Si algún servicio está `Exited`, reiniciarlo:
```powershell
docker compose up -d
```

### Ejecución de scripts de PowerShell bloqueada
Si algún script `.ps1` (no `.bat`) no se puede ejecutar por política de ejecución, en PowerShell como Administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
