import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaExceptionFilter } from '../../src/common/filters/prisma-exception.filter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

/**
 * Levanta la app Nest replicando la configuración de `main.ts` (prefijo global
 * `api`, cookie-parser, ValidationPipe estricto y el filtro de errores de
 * Prisma), para que las pruebas ejerciten el comportamiento REAL de producción.
 *
 * Redis (throttle) y MinIO (fotos) son fail-open, así que no hacen falta en CI:
 * basta un Postgres de prueba apuntado por DATABASE_URL.
 */
export async function bootstrapApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  await app.init();
  return app;
}

/** Credenciales sembradas por `prisma/seed.ts` (la contraseña es el DNI). */
export const CREDS = {
  admin:    { dni: '00000001', password: '00000001' },
  director: { dni: '00000002', password: '00000002' },
  auxiliar: { dni: '00000003', password: '00000003' },
  docente:  { dni: '12345678', password: '12345678' }, // Juan García (seed)
} as const;

export type RolTest = keyof typeof CREDS;

/** Hace login y devuelve el `access_token` (Bearer) del rol indicado. */
export async function loginAs(app: INestApplication, rol: RolTest): Promise<string> {
  const { dni, password } = CREDS[rol];
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ dni, password })
    .expect(200);
  return res.body.access_token as string;
}

/** Azúcar: header Authorization Bearer. */
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
