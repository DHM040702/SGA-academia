import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapApp, loginAs, bearer } from './utils/e2e';

/**
 * Flujos críticos de asistencia (kiosco): registro por código, idempotencia del
 * doble escaneo (respeta @@unique(persona, fecha)) y estadísticas del día.
 *
 * No se asertan valores de tardanza (dependen de la hora real del run); sí la
 * regla determinista: los alumnos escanean SIEMPRE como presentes.
 *
 * Requiere una BD de prueba ya sembrada (ver test/README.md). Códigos del seed:
 * alumno codigoBarras 100001, docente DNI 12345678.
 */
describe('Asistencia — scan (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    token = await loginAs(app, 'admin'); // admin/director/auxiliar pueden escanear
  }, 30_000);

  afterAll(async () => { await app.close(); });

  const scan = (codigo: string) =>
    request(app.getHttpServer()).post('/api/asistencia/scan').set(bearer(token)).send({ codigo });

  it('registra un alumno por código de barras y queda presente (no tardanza)', async () => {
    const res = await scan('100001').expect(200);
    expect(res.body.tipoPersona).toBe('alumno');
    expect(res.body.esTardanza).toBe(false); // alumnos: siempre presentes al escanear
  });

  it('doble escaneo NO duplica: el segundo devuelve yaRegistrado=true', async () => {
    await scan('100001').expect(200);               // asegura que existe hoy
    const res = await scan('100001').expect(200);   // reintento el mismo día
    expect(res.body.yaRegistrado).toBe(true);
  });

  it('registra un docente por DNI', async () => {
    const res = await scan('12345678').expect(200);
    expect(res.body.tipoPersona).toBe('docente');
  });

  it('código inexistente → 404', () => scan('999999').expect(404));

  it('código demasiado corto → 400 (validación)', () =>
    scan('12').expect(400));

  it('stats del día devuelve métricas numéricas', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/asistencia/stats').set(bearer(token)).expect(200);
    expect(typeof res.body.presentes).toBe('number');
    expect(typeof res.body.total_alumno).toBe('number');
  });
});
