# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema de Gestión Académica (SGA) para una academia preuniversitaria presencial con 500-1000 alumnos.

## Stack

- Backend: NestJS 11 + TypeScript strict + Prisma ORM
- Frontend: Next.js 15 + React 19 + Tailwind + shadcn/ui
- Base de datos: PostgreSQL 16 (puerto 5433)
- Caché/Colas: Redis 7 (puerto 6380) + BullMQ
- Archivos: MinIO (puerto 9000, consola 9002)
- Autenticación: JWT access (15min) + refresh token (7 días) en cookie HttpOnly

## Comandos de desarrollo

```bash
docker compose up -d                  # Levantar servicios (desde la raíz)
cd backend && pnpm run start:dev      # Backend
cd frontend && pnpm run dev           # Frontend
cd backend && npx prisma migrate dev  # Migraciones (carga .env automáticamente)
cd backend && npx prisma studio       # Prisma Studio
cd backend && npx prisma generate     # Regenerar cliente tras cambios en schema
```

> **Prisma 7**: el `url` de conexión ya no va en `schema.prisma` sino en `prisma.config.ts` (raíz del backend). El archivo carga `.env` automáticamente via dotenv.

## Módulos del sistema (MVP)

1. **Auth**: login, JWT, refresh token, guards por rol
2. **Alumnos**: CRUD, importación Excel, código de barras 6 dígitos, PDF carnet
3. **Docentes**: CRUD, asistencia por DNI
4. **Secciones y ciclos**
5. **Horarios**: asignación docente/curso/aula, detección de conflictos
6. **Asistencia**: lector código de barras USB (modo HID), registro automático, corrección manual
7. **Comunicados**: panel interno + WhatsApp/SMS via Twilio
8. **Biblioteca digital**: PDF, videos, enlaces, MinIO
9. **Reportes**: asistencia, puntualidad docentes, exportación Excel/PDF

## Roles (RBAC)

- **admin**: acceso completo
- **director**: horarios, asistencia, reportes, comunicados
- **vigilante**: solo pantalla de registro de asistencia por código de barras
- **alumno**: ver su asistencia, horario, comunicados, biblioteca
- **apoderado**: ver asistencia e historial de su(s) alumno(s) y comunicados

## Base de datos — tablas principales

`usuarios`, `alumnos`, `apoderados`, `alumnos_apoderados`, `docentes`, `ciclos`, `secciones`, `cursos`, `horarios`, `asistencias`, `comunicados`, `comunicados_envios`, `recursos_biblioteca`

## Reglas importantes

- Soft-delete en todas las entidades (campo `deleted_at`)
- UUID como clave primaria
- Timestamps automáticos (`created_at`, `updated_at`)
- El código de barras de alumnos es numérico de 6 dígitos, generado por el sistema
- Los docentes usan el código de barras de su DNI para registrar asistencia
- El lector de barras funciona en modo HID (se comporta como teclado)
- Validación con `class-validator` en todos los DTOs
- Documentación automática con Swagger en `/api/docs`

## Sprint actual: Sprint 1

1. Configurar Prisma con el esquema completo de base de datos
2. Implementar módulo Auth con JWT y guards de roles
3. Crear estructura base de módulos vacíos


## Diseño de referencia

La carpeta `design-reference/` contiene mockups en React (JSX + Babel inline)
con TODAS las pantallas del sistema. Es la fuente de verdad visual.

- `design-reference/system.jsx` — tokens (color, tipografía, sombras, radios)
- `design-reference/shared.jsx` — chrome (Sidebar, TopBar, Login, MobileFrame)
- `design-reference/screens-admin*.jsx` — admin/director (dashboards, alumnos,
  docentes, ciclos, horarios, asistencia, comunicados, biblioteca, reportes)
- `design-reference/screens-vigilante.jsx` — kiosko de asistencia
- `design-reference/screens-mobile.jsx` — alumno y apoderado móvil
- `design-reference/screens-portal.jsx` — alumno y apoderado web

Sistema visual:
- Color primario: azul académico `oklch(0.36 0.10 255)`
- Fondo: paper white cálido `oklch(0.985 0.006 80)`
- Tipografía: Crimson Pro (titulares) + Inter (UI) + JetBrains Mono (códigos)
- Componentes: KPIs con accent bar, status dots, pills con tono semántico

Cuando construyas una pantalla, abre primero el JSX correspondiente y respeta
la jerarquía visual, paleta y patrones (tablas, cards, badges) ahí definidos.