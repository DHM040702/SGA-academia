import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapApp, loginAs, bearer } from './utils/e2e';

/**
 * Reportes (admin). Verifica que cada endpoint responde 200 con la forma
 * esperada sobre los datos del seed, y el caso de alumno inexistente.
 */
describe('Reportes (e2e)', () => {
  let app: INestApplication;
  let admin: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    admin = await loginAs(app, 'admin');
  }, 30_000);

  afterAll(async () => { await app.close(); });

  const get = (path: string) => request(app.getHttpServer()).get(path).set(bearer(admin));

  it('asistencia general → kpis + por_seccion + por_docente', async () => {
    const res = await get('/api/reportes/asistencia').expect(200);
    expect(res.body.kpis).toBeDefined();
    expect(Array.isArray(res.body.por_seccion)).toBe(true);
    expect(Array.isArray(res.body.por_docente)).toBe(true);
  });

  it('tardanzas-docentes → tolerancia 5 min + kpis + detalle', async () => {
    const res = await get('/api/reportes/tardanzas-docentes').expect(200);
    expect(res.body.tolerancia_min).toBe(5);
    expect(res.body.kpis).toBeDefined();
    expect(Array.isArray(res.body.detalle)).toBe(true);
  });

  it('docentes-mensual → meses + docentes', async () => {
    const res = await get('/api/reportes/docentes-mensual').expect(200);
    expect(Array.isArray(res.body.meses)).toBe(true);
    expect(Array.isArray(res.body.docentes)).toBe(true);
  });

  it('ranking-aulas → lista de ranking', async () => {
    const res = await get('/api/reportes/ranking-aulas').expect(200);
    expect(Array.isArray(res.body.ranking)).toBe(true);
  });

  it('resumen-diario → días', async () => {
    const res = await get('/api/reportes/resumen-diario').expect(200);
    expect(Array.isArray(res.body.dias)).toBe(true);
  });

  it('asistencia-alumno con alumno_id válido → datos del alumno', async () => {
    const list = await request(app.getHttpServer()).get('/api/alumnos').set(bearer(admin)).expect(200);
    const alumnoId = list.body.data[0].id;
    const res = await get(`/api/reportes/asistencia-alumno?alumno_id=${alumnoId}`).expect(200);
    expect(res.body.alumno?.id).toBe(alumnoId);
    expect(res.body.kpis).toBeDefined();
  });

  it('asistencia-alumno con id inexistente → 404', () =>
    get('/api/reportes/asistencia-alumno?alumno_id=00000000-0000-0000-0000-000000000000').expect(404));
});
