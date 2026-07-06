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

- **`asistencia.e2e-spec.ts`** — flujos del kiosco:
  - Scan de alumno por código (siempre presente) y de docente por DNI.
  - **Doble escaneo** el mismo día → `yaRegistrado` (respeta `@@unique(persona,fecha)`).
  - Código inexistente → 404, código corto → 400, `stats` devuelve métricas.

> Próximas tandas sugeridas: `reportes` (scoping al ciclo activo, tardanzas
> docentes con horario) y unit tests de los helpers de fecha/hora (Lima, UTC).

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

# 2) Derivar la URL de prueba desde backend/.env (misma password/host, BD = sga_test)
BASE=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
export DATABASE_URL="${BASE/\/sga_db/\/sga_test}"
export JWT_SECRET=test JWT_REFRESH_SECRET=test JWT_EXPIRES_IN=15m NODE_ENV=test
echo "$DATABASE_URL"   # ⚠️ DEBE terminar en /sga_test — NO /sga_db

# 3) Preparar la BD de prueba (esquema + tablas de SQL manual + seed) en un paso.
#    El script aborta si DATABASE_URL apunta a sga_db.
bash test/prepare-test-db.sh

# 4) Correr (jest directo: NO `pnpm test:e2e -- ...`)
pnpm exec jest --config ./test/jest-e2e.json --runInBand --forceExit
pnpm test   # unit

# 5) (Opcional) limpiar
docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -c "DROP DATABASE sga_test;"
```

> ⚠️ El script `prepare-test-db.sh` incluye una salvaguarda que rechaza `sga_db`.
> Aun así, confirma que `echo $DATABASE_URL` diga **/sga_test** antes de correr.

## Notas
- Las credenciales de prueba (contraseña = DNI) las siembra `prisma/seed.ts`:
  admin `00000001`, director `00000002`, auxiliar `00000003`, docente `12345678`.
- Las aserciones son de **código de estado**: como los guards corren antes que los
  pipes, un rol prohibido recibe **403** antes de validar el body, y un rol
  permitido con body vacío recibe **400** (prueba que pasó la autorización).
