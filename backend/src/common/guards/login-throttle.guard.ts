import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Request } from 'express';

const WINDOW_SECONDS = 15 * 60;  // ventana de 15 minutos
const MAX_INTENTS    = 10;       // intentos permitidos en la ventana

/**
 * Limita los intentos de login por (IP + DNI) usando Redis, de modo que el
 * contador es compartido y sobrevive a reinicios del backend (a diferencia del
 * Map en memoria anterior). Si Redis no está disponible hace *fail-open* (deja
 * pasar) para no bloquear a usuarios legítimos por una caída de infraestructura.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly log = new Logger(LoginThrottleGuard.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (e) => this.log.warn(`Redis throttle no disponible: ${e.message}`));
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = this.redisKey(req);

    try {
      const count = await this.redis.incr(key);
      // Al primer intento de la ventana, fijar el TTL de expiración.
      if (count === 1) await this.redis.expire(key, WINDOW_SECONDS);

      if (count > MAX_INTENTS) {
        const ttl  = await this.redis.ttl(key);
        const mins = Math.max(1, Math.ceil(ttl / 60));
        this.log.warn(`Login bloqueado (${key}) — ${mins} min restantes`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Demasiados intentos fallidos. Intente nuevamente en ${mins} minuto(s).`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      // Redis caído → no bloquear el login.
      this.log.warn(`Throttle fail-open (Redis): ${(e as Error).message}`);
      return true;
    }
  }

  /** Limpiar el contador tras login exitoso (fire-and-forget). */
  reset(req: Request): void {
    this.redis.del(this.redisKey(req)).catch(() => undefined);
  }

  private redisKey(req: Request): string {
    // IP real (detrás de proxy) + DNI para mayor precisión
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            ?? req.socket?.remoteAddress
            ?? 'unknown';
    const dni = (req.body as { dni?: string })?.dni ?? '';
    return `login:throttle:${ip}:${dni}`;
  }
}
