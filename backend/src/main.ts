import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  // ── Global prefix ──────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Cookies ────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── CORS ───────────────────────────────────────────────────────
  // FRONTEND_URL puede contener múltiples orígenes separados por coma
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    ...(process.env.FRONTEND_URL ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // Solo en desarrollo: orígenes locales
    ...(!isProd ? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.137.1:3000',   // Mobile Hotspot (solo dev)
    ] : []),
  ];
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  });

  // ── Validation ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('SGA – Sistema de Gestión Académica')
    .setDescription('API REST del SGA CEPREUNASAM')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
  logger.log(`Backend corriendo en http://localhost:${process.env.PORT ?? 3000}/api`);
  logger.log(`Swagger en http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
