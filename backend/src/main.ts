import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ──────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Cookies ────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── CORS ───────────────────────────────────────────────────────
  // FRONTEND_URL puede contener múltiples orígenes separados por coma
  const allowedOrigins = [
    ...(process.env.FRONTEND_URL ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    'http://localhost:3000',       // desarrollo local
    'http://127.0.0.1:3000',       // loopback alternativo
    'http://192.168.137.1:3000',   // Mobile Hotspot
  ];
  app.enableCors({
    origin: allowedOrigins,
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

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Backend corriendo en http://localhost:${process.env.PORT ?? 3000}/api`);
  console.log(`📖 Swagger en http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
