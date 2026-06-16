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

### Opción B — Script automático

Crear el archivo `C:\sga-academia\Iniciar-SGA.bat`:

```batch
@echo off
echo Iniciando SGA...

:: Iniciar backend
start "SGA Backend" cmd /k "cd /d C:\sga-academia\backend && node dist/main"

:: Esperar 10 segundos para que el backend cargue
timeout /t 10 /nobreak

:: Iniciar frontend
start "SGA Frontend" cmd /k "cd /d C:\sga-academia\frontend && pnpm run start"

echo Servidores iniciados. Acceder en http://localhost:3000
```

Hacer doble clic en `Iniciar-SGA.bat` para arrancar ambos servidores.

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

1. Abrir **Configuración** → **Red e Internet** → **Zona de acceso móvil**
2. Activar **"Compartir mi conexión a Internet"**
3. Configurar:
   - **Nombre de red:** `SGA-CEPREUNASAM` (o el nombre que prefiera)
   - **Contraseña:** una contraseña segura
   - **Banda:** 2.4 GHz (mayor compatibilidad con dispositivos antiguos)
4. Guardar y activar.

> Si la computadora no tiene adaptador WiFi (por ejemplo, una PC de escritorio conectada por cable), el hotspot de Windows no está disponible. En ese caso usar un router WiFi físico conectado a la misma red, y acceder por la IP LAN de la PC en lugar de `192.168.137.1`.

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

### 15.1 DNS personalizado (opcional)

Para que los alumnos puedan acceder con un nombre en lugar de la IP (por ejemplo `http://sga.local`), agregar esta entrada al archivo de hosts de cada dispositivo cliente. En Windows, el archivo está en:
```
C:\Windows\System32\drivers\etc\hosts
```
Agregar la línea:
```
192.168.137.1    sga.local
```

En Android e iOS no es posible editar el hosts file sin root/jailbreak, por lo que se recomienda usar la IP directamente en dispositivos móviles. Esta opción es práctica solo si el profesor distribuye laptops/PCs ya configuradas, no para celulares de los alumnos.

Para la computadora del profesor/servidor, agregar en el mismo archivo:
```
127.0.0.1    sga.local
```
Así el navegador local también puede usar `http://sga.local:3000`.

---

## 16. Scripts de inicio automático

Para que el sistema arranque automáticamente cuando encienda la computadora.

### 16.1 Script completo de inicio

Crear `C:\sga-academia\inicio-completo.bat`:

```batch
@echo off
echo ============================================
echo    Iniciando SGA - CEPREUNASAM
echo ============================================

:: Esperar a que Docker Desktop inicie completamente
echo Esperando que Docker inicie...
timeout /t 20 /nobreak

:: Levantar contenedores Docker
echo Iniciando servicios de base de datos...
docker compose -f C:\sga-academia\docker-compose.yml up -d

:: Esperar a que PostgreSQL este listo
timeout /t 10 /nobreak

:: Iniciar backend
echo Iniciando backend...
start "SGA Backend" cmd /k "cd /d C:\sga-academia\backend && node dist/main"

:: Esperar a que el backend cargue
timeout /t 15 /nobreak

:: Iniciar frontend
echo Iniciando frontend...
start "SGA Frontend" cmd /k "cd /d C:\sga-academia\frontend && pnpm run start"

echo.
echo Sistema iniciado. Acceder en http://localhost:3000
echo Para alumnos: http://192.168.137.1:3000
```

> Docker Desktop debe estar configurado para iniciar con Windows (paso 6) para que este script funcione sin intervención manual. Si la PC es lenta, aumentar el primer `timeout` a 30-40 segundos.

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
