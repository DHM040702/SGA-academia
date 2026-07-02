import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness + chequeo de conexión a la BD. Público (sin auth) para que lo
   * consuman monitores de uptime / systemd. Devuelve 200 si todo está bien,
   * 503 si la BD no responde.
   */
  @Get()
  @ApiOperation({ summary: 'Estado del servicio (liveness + conexión a BD)' })
  async check() {
    let db = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = false;
    }

    const payload = {
      status: db ? 'ok' : 'degraded',
      db: db ? 'up' : 'down',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    if (!db) throw new ServiceUnavailableException(payload);
    return payload;
  }
}
