# Pruebas end-to-end (e2e) del backend

Pruebas de integración que **levantan la app Nest real** (mismos guards, pipes y
filtros que `main.ts`) y la ejercitan por HTTP con Supertest contra un
**Postgres desechable**. No necesitan Redis ni MinIO (ambos son *fail-open* en el
código), solo `DATABASE_URL`.

## Qué se cubre (prioridad: áreas críticas)

- **`authorization.e2e-spec.ts`** — matriz de autorización por rol:
  - Login OK / contraseña inválida / sin token (401).
  - Reportes solo admin/director (auxiliar y docente → 403).
  - Alumnos: lectura amplia, **escritura solo admin** (director/auxiliar → 403).
  - **Reactivar alumno** y **purgar auditoría**: solo admin (director → 403).
  - **Biblioteca**: director en solo lectura (crear → 403).

> Próximas tandas sugeridas: `asistencia.e2e-spec.ts` (scan marca presente/tardanza,
> doble escaneo respeta `@@unique(persona,fecha)`, `stats?fecha`), `reportes`
> (scoping al ciclo activo), y unit tests de los helpers de fecha UTC.

## Cómo ejecutarlas

Se corren en **Linux** (donde pnpm y Prisma funcionan), no en el Windows de dev.

### Opción A — CI (recomendada)
Ya está el workflow [`.github/workflows/backend-e2e.yml`](../../.github/workflows/backend-e2e.yml):
levanta Postgres, aplica el esquema (`prisma db push`), siembra (`prisma db seed`)
y corre `pnpm test:e2e`. Se dispara en cada push que toque `backend/**`.

### Opción B — En el servidor Ubuntu (BD de prueba aparte)
```bash
cd ~/sga-academia/backend

# 1) Crear una BD de prueba en el contenedor existente (no toca sga_db)
docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -c "CREATE DATABASE sga_test;" || true

# 2) Apuntar Prisma a la BD de prueba (usa el puerto host 5433 y la pass de backend/.env)
export DATABASE_URL="postgresql://sga_user:LA_PASSWORD@localhost:5433/sga_test"
export JWT_SECRET=test JWT_REFRESH_SECRET=test JWT_EXPIRES_IN=15m NODE_ENV=test

# 3) Esquema + datos de prueba
#    (--url explícito: el datasource del schema no define `url`)
pnpm prisma db push --skip-generate --url "$DATABASE_URL"
pnpm prisma db seed

# 4) Correr
pnpm test:e2e -- --runInBand --forceExit

# 5) (Opcional) limpiar
docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -c "DROP DATABASE sga_test;"
```

> ⚠️ Nunca apuntes `DATABASE_URL` a `sga_db` (producción): `db push`/`seed`
> **modifican** la base. Usa siempre `sga_test`.

## Notas
- Las credenciales de prueba (contraseña = DNI) las siembra `prisma/seed.ts`:
  admin `00000001`, director `00000002`, auxiliar `00000003`, docente `12345678`.
- Las aserciones son de **código de estado**: como los guards corren antes que los
  pipes, un rol prohibido recibe **403** antes de validar el body, y un rol
  permitido con body vacío recibe **400** (prueba que pasó la autorización).
