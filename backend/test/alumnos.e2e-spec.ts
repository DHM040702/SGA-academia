import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapApp, loginAs, bearer } from './utils/e2e';

/**
 * Ciclo de vida de un alumno: baja (soft-delete) → desaparece de activos →
 * aparece con estado=inactivo → reactivación → vuelve a activos.
 * Cubre la función de reactivación (solo admin) que agregamos.
 * Es idempotente: al final deja al alumno reactivado (estado original).
 */
describe('Alumnos: baja y reactivación (e2e)', () => {
  let app: INestApplication;
  let admin: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    admin = await loginAs(app, 'admin');
  }, 30_000);

  afterAll(async () => { await app.close(); });

  const req = () => request(app.getHttpServer());

  it('baja → inactivos → reactivar', async () => {
    // 1) tomar un alumno activo
    const list = await req().get('/api/alumnos').set(bearer(admin)).expect(200);
    const id = list.body.data[0].id;
    expect(id).toBeTruthy();

    // 2) darlo de baja (soft-delete)
    await req().delete(`/api/alumnos/${id}`).set(bearer(admin)).expect(200);

    // 3) ya NO aparece entre activos
    const activos = await req().get('/api/alumnos').set(bearer(admin)).expect(200);
    expect(activos.body.data.some((a: { id: string }) => a.id === id)).toBe(false);

    // 4) SÍ aparece con estado=inactivo
    const inactivos = await req().get('/api/alumnos?estado=inactivo').set(bearer(admin)).expect(200);
    expect(inactivos.body.data.some((a: { id: string }) => a.id === id)).toBe(true);

    // 5) reactivar
    await req().patch(`/api/alumnos/${id}/restore`).set(bearer(admin)).expect(200);

    // 6) vuelve a estar activo
    const reactivados = await req().get('/api/alumnos').set(bearer(admin)).expect(200);
    expect(reactivados.body.data.some((a: { id: string }) => a.id === id)).toBe(true);
  }, 20_000);
});
