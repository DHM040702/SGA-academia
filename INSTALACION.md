# Guía de Instalación — Sistema de Gestión Académica

**Centro Preuniversitario UNASAM · Versión 1.0**  
Servidor local en Windows 11 · Red de área local (LAN)

---

## Índice

1. [Requisitos del sistema](#1-requisitos-del-sistema)
2. [Instalación de dependencias](#2-instalación-de-dependencias)
3. [Configuración del proyecto](#3-configuración-del-proyecto)
4. [Levantar los servicios](#4-levantar-los-servicios)
5. [Cargar datos iniciales (Seeder)](#5-cargar-datos-iniciales-seeder)
6. [Iniciar el sistema](#6-iniciar-el-sistema)
7. [Inicio automático con Windows](#7-inicio-automático-con-windows)
8. [Configuración del Firewall](#8-configuración-del-firewall)
9. [Acceso en red local cuando la institución bloquea el enrutamiento](#9-acceso-en-red-local-cuando-la-institución-bloquea-el-enrutamiento)
10. [Verificación final](#10-verificación-final)
11. [Resolución de problemas](#11-resolución-de-problemas)
12. [Mantenimiento y respaldo](#12-mantenimiento-y-respaldo)

---

## 1. Requisitos del sistema

### Hardware mínimo / recomendado

| Componente | Mínimo | Recomendado |
|---|---|---|
| Procesador (CPU) | 4 núcleos | 8 núcleos o más |
| Memoria RAM | 8 GB | 16 GB |
| Almacenamiento | 50 GB libres (SSD) | 100 GB libres (SSD NVMe) |
| Red | Ethernet (RJ-45) | Ethernet + 2.ª NIC para red privada |
| Sistema operativo | Windows 11 Pro 64 bits | Windows 11 Pro / Enterprise |

### Prerrequisitos de software

- Cuenta de Windows con **permisos de Administrador**
- Virtualización habilitada en la BIOS/UEFI (VT-x o AMD-V)
- Acceso a internet **solo durante la instalación** inicial

> **Nota:** Una vez instalado, el sistema funciona completamente sin internet.

---

## 2. Instalación de dependencias

Instalar en el orden indicado.

### 2.1 Docker Desktop para Windows

1. Descargar desde <https://www.docker.com/products/docker-desktop/>
2. Ejecutar el instalador y habilitar:
   - ✅ **Backend WSL 2** (recomendado)
   - ✅ **Start Docker Desktop when you log in**
3. Abrir Docker Desktop y esperar el estado **Engine running** (ícono verde en bandeja).
4. Verificar en PowerShell:

```powershell
docker --version
```

> Si aparece aviso sobre WSL 2, seguir el enlace del instalador para actualizar el kernel de Linux. Solo requiere un clic.

### 2.2 Node.js 20 LTS

1. Descargar desde <https://nodejs.org/en> (versión **LTS**)
2. Instalar con opciones predeterminadas. Confirmar que **"Add to PATH"** esté marcado.
3. Verificar:

```powershell
node --version   # Debe mostrar v20.x.x
npm --version
```

### 2.3 pnpm

Abrir **PowerShell como Administrador**:

```powershell
npm install -g pnpm
pnpm --version
```

### 2.4 Git (opcional, para actualizaciones)

Descargar desde <https://git-scm.com/download/win> e instalar con opciones predeterminadas.

---

## 3. Configuración del proyecto

### 3.1 Copiar los archivos

Crear la carpeta `C:\sga-academia` y copiar todos los archivos del proyecto, manteniendo la estructura:

```
C:\sga-academia\
  backend\
  frontend\
  docker-compose.yml
  prisma.config.ts
  gen_seed.py
  seed.sql
```

### 3.2 Variables de entorno — Backend

Crear el archivo `C:\sga-academia\backend\.env`:

```env
DATABASE_URL=postgresql://sga_user:sga_pass_dev@localhost:5433/sga_db
REDIS_URL=redis://localhost:6380
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
JWT_SECRET=reemplazar_con_clave_aleatoria_minimo_32_caracteres
JWT_REFRESH_SECRET=reemplazar_con_otra_clave_diferente_32_caracteres
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

> ⚠️ **Seguridad:** Cambiar `JWT_SECRET` y `JWT_REFRESH_SECRET` por cadenas aleatorias de al menos 32 caracteres. Nunca compartirlas.

### 3.3 Variables de entorno — Frontend

Crear el archivo `C:\sga-academia\frontend\.env.local`:

```env
# Para acceso desde la red local (reemplazar con la IP real del servidor):
NEXT_PUBLIC_API_URL=http://192.168.100.1:3000
```

> Si solo se usará localmente en el servidor, usar `http://localhost:3000`.

---

## 4. Levantar los servicios

### Puertos utilizados

| Puerto | Servicio | Descripción |
|---|---|---|
| **3000** | Backend (NestJS) | API REST principal |
| **3001** | Frontend (Next.js) | Interfaz web |
| **5433** | PostgreSQL 16 | Base de datos |
| **6380** | Redis 7 | Caché y colas |
| **9000** | MinIO (API) | Almacenamiento de fotos/PDFs |
| **9002** | MinIO (Consola) | Panel de administración de MinIO |

### 4.1 Iniciar con Docker Compose

Abrir **PowerShell como Administrador**:

```powershell
cd C:\sga-academia
docker compose up -d
```

La primera vez descargará las imágenes Docker (puede tardar varios minutos).

### 4.2 Verificar contenedores

```powershell
docker compose ps
```

Todos deben mostrar estado `running`. Si alguno falla:

```powershell
docker compose logs [nombre-del-servicio]
```

### 4.3 Aplicar migraciones de base de datos

```powershell
cd C:\sga-academia\backend
pnpm install
npx prisma generate
```

Aplicar cada archivo `migration.sql` dentro del contenedor:

```powershell
docker exec -it sga-academia-postgres-1 psql -U sga_user -d sga_db
```

Dentro del prompt de PostgreSQL, pegar el contenido de cada archivo `migration.sql` ubicado en `backend\prisma\migrations\*\migration.sql`, luego `\q` para salir.

---

## 5. Cargar datos iniciales (Seeder)

El archivo `seed.sql` contiene el dataset completo del ciclo 2026-I:

| Dato | Cantidad |
|---|---|
| Ciclo | 1 (2026-I, 13/04 – 17/07/2026) |
| Aulas | 22 secciones |
| Cursos | 18 materias |
| Alumnos | 969 (con usuario y contraseña) |
| Docentes | 76 (con usuario y contraseña) |

**Contraseña inicial de alumnos y docentes:** `Matricula2026`

### Aplicar el seeder

```powershell
# Copiar el archivo al contenedor (evita problemas de encoding)
docker cp C:\sga-academia\seed.sql sga-academia-postgres-1:/tmp/seed.sql

# Ejecutar dentro del contenedor
docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -f /tmp/seed.sql
```

### Regenerar el seeder (cuando cambien los datos del Excel)

```powershell
cd C:\sga-academia
python gen_seed.py
```

Requiere los archivos Excel en:
- `C:\Users\Diego\Desktop\CPU\Documentos\Estudiantes completos.xlsx`
- `C:\Users\Diego\Desktop\CPU\Documentos\DOCENTES .xlsx`

### Crear usuario administrador

```powershell
docker exec -it sga-academia-postgres-1 psql -U sga_user -d sga_db
```

Insertar el admin (la contraseña debe estar hasheada con bcrypt):

```sql
INSERT INTO usuarios (id, email, password_hash, rol, nombre, activo)
VALUES (gen_random_uuid(), 'admin@academia.edu', '$2b$10$HASH', 'admin', 'Administrador', true);
\q
```

> Si el proyecto incluye un script `seed-admin.sql`, ejecutarlo directamente.

---

## 6. Iniciar el sistema

### 6.1 Iniciar el Backend

Abrir una ventana de PowerShell:

```powershell
cd C:\sga-academia\backend
pnpm run build
pnpm run start:prod
```

Salida esperada: `Nest application successfully started` en el puerto 3000.

### 6.2 Iniciar el Frontend

Abrir **otra** ventana de PowerShell (sin cerrar la del backend):

```powershell
cd C:\sga-academia\frontend
pnpm run build    # Primera vez: puede tardar 3-5 minutos
pnpm run start
```

Salida esperada: `Ready - started server on 0.0.0.0:3001`

### 6.3 Verificar

- Navegador en el servidor: <http://localhost:3001>
- Documentación de la API: <http://localhost:3000/api/docs>

---

## 7. Inicio automático con Windows

Se usa **NSSM** (Non-Sucking Service Manager) para convertir los procesos Node.js en servicios de Windows.

### 7.1 Descargar NSSM

Descargar desde <https://nssm.cc/download> (versión 2.24 o superior) y extraer en `C:\tools\nssm\`.

### 7.2 Crear servicio para el Backend

```powershell
C:\tools\nssm\win64\nssm.exe install SGA-Backend
```

Configurar en la ventana que aparece:

| Campo | Valor |
|---|---|
| Application Path | `C:\Users\[usuario]\AppData\Roaming\npm\pnpm.cmd` |
| Startup directory | `C:\sga-academia\backend` |
| Arguments | `run start:prod` |

Pestaña **"Log on"**: seleccionar la cuenta de Windows del administrador.  
Clic en **"Install service"**.

### 7.3 Crear servicio para el Frontend

```powershell
C:\tools\nssm\win64\nssm.exe install SGA-Frontend
```

Misma configuración, cambiando:
- Startup directory → `C:\sga-academia\frontend`
- Arguments → `run start`

### 7.4 Docker con inicio automático

Docker Desktop → Configuración (⚙️) → General → ✅ **"Start Docker Desktop when you log in"**

### 7.5 Tarea programada (orden de arranque)

Los servicios deben iniciarse **después** de que Docker esté listo (espera de 30 s):

1. Abrir **"Programador de tareas"** desde el menú Inicio.
2. Crear tarea → Disparador: **"Al iniciar sesión"** → Retraso: **30 segundos**.
3. Acción 1: `net start SGA-Backend`
4. Acción 2 (retraso adicional 10 s): `net start SGA-Frontend`

---

## 8. Configuración del Firewall

Para que otros equipos de la red accedan al sistema.

### Método rápido (PowerShell como Administrador)

```powershell
New-NetFirewallRule -DisplayName "SGA Backend"  -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "SGA Frontend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "SGA MinIO"    -Direction Inbound -Protocol TCP -LocalPort 9000 -Action Allow
```

### Obtener la IP del servidor

```powershell
ipconfig
```

Anotar la **"Dirección IPv4"** del adaptador conectado a la red (ej: `192.168.100.1`).

---

## 9. Acceso en red local cuando la institución bloquea el enrutamiento

> **Contexto:** Muchas instituciones aplican *client isolation* (aislamiento de clientes) en su red Wi-Fi o cableada, impidiendo que los dispositivos se comuniquen entre sí. La solución es crear una red privada independiente para el SGA.

### 9.1 Hardware necesario

| Equipo | Descripción |
|---|---|
| Router o switch | Un router doméstico (TP-Link, D-Link, Tenda) en modo AP o un switch simple de 5-8 puertos. |
| Cables Ethernet Cat5e/Cat6 | Para conectar el servidor y los clientes al switch privado. |
| Segunda NIC (tarjeta de red) | El servidor necesita **dos** conexiones: una a internet (red institucional) y otra a la red privada SGA. Puede ser un adaptador USB-Ethernet. |
| Equipos cliente | PCs o tablets. Se conectan al switch/router privado por cable o Wi-Fi. |

### 9.2 Esquema de red

```
[INTERNET]  <-->  [Red Institucional]  <-->  [NIC 1 del Servidor]
                                                      |
                               [SERVIDOR SGA — Windows 11]
                                                      |
                               [NIC 2 — IP: 192.168.100.1]
                                                      |
                         [Switch / Router Privado SGA]
                         /             |              \
                [PC 1]           [PC 2]           [PC N]
           192.168.100.10   192.168.100.11   192.168.100.XX
```

### 9.3 Configurar el router/switch privado

- Conectar el router **sin** enchufar su puerto WAN a internet.
- En el panel del router (generalmente `http://192.168.1.1`): rango de red `192.168.100.0/24`.
- Habilitar DHCP desde `192.168.100.10` en adelante.
- Si se usa un switch simple sin administración: no requiere configuración.

### 9.4 Configurar IP estática en el servidor (segunda NIC)

1. Panel de Control → Redes → Cambiar configuración del adaptador.
2. Clic derecho en el adaptador conectado al switch privado → Propiedades → IPv4 → Propiedades.
3. Marcar **"Usar la siguiente dirección IP"**:

```
Dirección IP: 192.168.100.1
Máscara:      255.255.255.0
Puerta de enlace: (dejar en blanco)
DNS:          (dejar en blanco)
```

### 9.5 Actualizar la URL en el frontend

Editar `C:\sga-academia\frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://192.168.100.1:3000
```

Reconstruir:

```powershell
cd C:\sga-academia\frontend
pnpm run build
pnpm run start
```

### 9.6 Configurar IP en los clientes (si no hay DHCP)

En cada equipo cliente, asignar manualmente:

```
IP:      192.168.100.XX  (XX = 10, 11, 12, ...)
Máscara: 255.255.255.0
Gateway: (dejar en blanco)
```

### 9.7 Acceder al sistema desde los clientes

Conectar el equipo al switch/router privado y abrir el navegador:

```
http://192.168.100.1:3001
```

> Si el router privado tiene Wi-Fi, los usuarios pueden conectarse de forma inalámbrica a la red "SGA-Academia" desde laptops y tablets.

---

## 10. Verificación final

| ✅ Comprobación | Cómo verificar |
|---|---|
| Docker corriendo | Ícono verde en bandeja del sistema |
| Contenedores activos | `docker compose ps` → todos en `running` |
| Login funciona | Abrir `http://localhost:3001` |
| API responde | Abrir `http://localhost:3000/api/docs` |
| Alumnos cargados | Login como admin → sección Alumnos |
| Acceso desde red | Desde otro equipo: `http://192.168.100.1:3001` |
| Servicios en Windows | `services.msc` → SGA-Backend y SGA-Frontend activos |

---

## 11. Resolución de problemas

### Puerto en uso (EADDRINUSE)

```powershell
netstat -ano | findstr :3001
taskkill /PID [número] /F
```

### Docker containers se detienen solos

```powershell
docker compose logs -f
```

Verificar que el equipo tenga al menos 4 GB de RAM libre para Docker.

### Error de conexión a la base de datos

- Verificar que el contenedor PostgreSQL esté corriendo.
- Confirmar que `DATABASE_URL` en `.env` coincide con la configuración de `docker-compose.yml`.

### Clientes no acceden al servidor

- Verificar reglas del Firewall (Sección 8).
- Probar desde el cliente: `ping 192.168.100.1`
- Verificar que ambos equipos estén en la misma subred.

### Sistema no arranca tras reiniciar Windows

- Abrir `services.msc` y verificar que SGA-Backend y SGA-Frontend estén activos.
- Iniciar Docker Desktop manualmente si es necesario y esperar 30 segundos antes de iniciar los servicios.

### Error al cargar el seeder ("encoding" / caracteres extraños)

Usar siempre `docker cp` para copiar el archivo antes de ejecutarlo:

```powershell
docker cp C:\sga-academia\seed.sql sga-academia-postgres-1:/tmp/seed.sql
docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -f /tmp/seed.sql
```

**No** usar pipes de PowerShell (`Get-Content ... | docker exec`) ya que corrompe los caracteres con tilde (ñ, á, é, etc.).

### Error 'Cannot find module'

```powershell
cd C:\sga-academia\backend  && pnpm install
cd C:\sga-academia\frontend && pnpm install
```

---

## 12. Mantenimiento y respaldo

### Respaldo de base de datos (semanal)

```powershell
mkdir C:\backups   # Solo la primera vez
docker exec sga-academia-postgres-1 pg_dump -U sga_user sga_db > C:\backups\sga_20260120.sql
```

Copiar el archivo a un disco externo o unidad de red. Conservar las últimas 4 copias.

### Respaldo de configuración

Guardar en ubicación externa:
- `C:\sga-academia\backend\.env`
- `C:\sga-academia\frontend\.env.local`
- `C:\sga-academia\docker-compose.yml`

### Actualización del sistema

```powershell
cd C:\sga-academia
git pull origin main

cd backend
pnpm install
pnpm run build

cd ..\frontend
pnpm install
pnpm run build
```

Reiniciar los servicios en `services.msc`: **SGA-Backend** y **SGA-Frontend**.

### Reinicio manual de servicios

```powershell
net stop SGA-Frontend
net stop SGA-Backend
cd C:\sga-academia && docker compose restart
# Esperar 20 segundos
net start SGA-Backend
net start SGA-Frontend
```

### Monitoreo básico

- **Docker Desktop**: panel visual con CPU, RAM y disco por contenedor.
- **Administrador de tareas** (`Ctrl+Shift+Esc`) → pestaña Servicios: verificar SGA-Backend y SGA-Frontend.
- **Logs en tiempo real**: Docker Desktop → clic en el contenedor deseado.

---

## Credenciales por defecto

| Rol | Email | Contraseña inicial |
|---|---|---|
| Administrador | `admin@academia.edu` | Configurada en el seeder |
| Alumno | `{codigo}@academia.edu` | `Matricula2026` |
| Docente | `{dni}@docente.academia.edu` | `Matricula2026` |

> ⚠️ **Importante:** Cambiar las contraseñas de todos los usuarios tras la primera instalación.

---

*Documento de uso interno — Centro Preuniversitario UNASAM*
