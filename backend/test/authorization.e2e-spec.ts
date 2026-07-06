import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapApp, loginAs, bearer } from './utils/e2e';

/**
 * Matriz de autorización por rol. Verifica el comportamiento del RolesGuard tal
 * como lo dejamos: director en solo lectura, purga de auditoría y reactivación
 * de alumnos solo para admin, reportes solo admin/director, etc.
 *
 * Las aserciones son de código de estado (401/403/2xx/4xx), robustas: los guards
 * corren ANTES de los pipes, así que un rol prohibido recibe 403 antes de que se
 * valide el body (un rol permitido con body vacío recibe 400 → prueba que pasó
 * la autorización).
 *
 * Requiere una BD de prueba ya sembrada (ver test/README.md).
 */
describe('Autorización por rol (e2e)', () => {
  let app: INestApplication;
  const t: Record<string, string> = {};

  beforeAll(async () => {
    app = await bootstrapApp();
    for (const rol of ['admin', 'director', 'auxiliar', 'docente'] as const) {
      t[rol] = await loginAs(app, rol);
    }
  }, 30_000);

  afterAll(async () => { await app.close(); });

  // ── Autenticación ─────────────────────────────────────────────────────────
  describe('Autenticación', () => {
    it('login con credenciales correctas devuelve token y usuario', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ dni: '00000001', password: '00000001' })
        .expect(200);
      expect(res.body.access_token).toBeTruthy();
      expect(res.body.user?.rol).toBe('admin');
    });

    it('login con contraseña incorrecta → 401', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ dni: '00000001', password: '99999999' })
        .expect(401));

    it('endpoint protegido sin token → 401', () =>
      request(app.getHttpServer()).get('/api/alumnos').expect(401));
  });

  // ── Reportes: solo admin y director ───────────────────────────────────────
  describe('Reportes (admin, director)', () => {
    it('admin accede', () =>
      request(app.getHttpServer()).get('/api/reportes/asistencia').set(bearer(t.admin)).expect(200));
    it('director accede', () =>
      request(app.getHttpServer()).get('/api/reportes/asistencia').set(bearer(t.director)).expect(200));
    it('auxiliar NO accede → 403', () =>
      request(app.getHttpServer()).get('/api/reportes/asistencia').set(bearer(t.auxiliar)).expect(403));
    it('docente NO accede → 403', () =>
      request(app.getHttpServer()).get('/api/reportes/asistencia').set(bearer(t.docente)).expect(403));
  });

  // ── Alumnos: lectura amplia, escritura solo admin ─────────────────────────
  describe('Alumnos: escritura solo admin', () => {
    it('director puede LISTAR (lectura) → 200', () =>
      request(app.getHttpServer()).get('/api/alumnos').set(bearer(t.director)).expect(200));

    it('director NO puede crear → 403', () =>
      request(app.getHttpServer()).post('/api/alumnos').set(bearer(t.director)).send({}).expect(403));
    it('auxiliar NO puede crear → 403', () =>
      request(app.getHttpServer()).post('/api/alumnos').set(bearer(t.auxiliar)).send({}).expect(403));

    it('admin SÍ pasa autorización (body vacío → 400 de validación, no 403)', () =>
      request(app.getHttpServer()).post('/api/alumnos').set(bearer(t.admin)).send({}).expect(400));

    it('reactivar alumno: director → 403 (solo admin)', () =>
      request(app.getHttpServer())
        .patch('/api/alumnos/00000000-0000-0000-0000-000000000000/restore')
        .set(bearer(t.director)).expect(403));
    it('reactivar alumno: admin pasa autorización (uuid inexistente → 404, no 403)', () =>
      request(app.getHttpServer())
        .patch('/api/alumnos/00000000-0000-0000-0000-000000000000/restore')
        .set(bearer(t.admin)).expect(404));
  });

  // ── Biblioteca: director en solo lectura ──────────────────────────────────
  describe('Biblioteca: director solo lectura', () => {
    it('director puede LISTAR → 200', () =>
      request(app.getHttpServer()).get('/api/biblioteca').set(bearer(t.director)).expect(200));
    it('director NO puede crear recurso → 403', () =>
      request(app.getHttpServer()).post('/api/biblioteca').set(bearer(t.director)).send({}).expect(403));
  });

  // ── Auditoría: leen admin/director, purga SOLO admin ──────────────────────
  describe('Auditoría: purga solo admin', () => {
    it('director puede LISTAR → 200', () =>
      request(app.getHttpServer()).get('/api/auditoria').set(bearer(t.director)).expect(200));
    it('auxiliar NO puede listar → 403', () =>
      request(app.getHttpServer()).get('/api/auditoria').set(bearer(t.auxiliar)).expect(403));
    it('director NO puede purgar → 403', () =>
      request(app.getHttpServer()).delete('/api/auditoria').set(bearer(t.director)).expect(403));
    // Nota: se ejecuta al final; en una BD de prueba purgar es inocuo.
    it('admin SÍ puede purgar → 200 { eliminados }', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/auditoria?hasta=2000-01-01').set(bearer(t.admin)).expect(200);
      expect(res.body).toHaveProperty('eliminados');
    });
  });
});
