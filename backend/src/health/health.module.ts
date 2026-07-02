import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// PrismaModule es @Global(), así que no hace falta importarlo aquí.
@Module({ controllers: [HealthController] })
export class HealthModule {}
