import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

interface Bucket {
  count:     number;
  resetAt:   number;   // ms timestamp
  blockedAt: number;   // ms timestamp (0 = no bloqueado)
}

const WINDOW_MS   = 15 * 60 * 1000;  // ventana de 15 minutos
const MAX_INTENTS = 10;              // intentos permitidos en la ventana

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly log = new Logger(LoginThrottleGuard.name);
  private readonly buckets = new Map<string, Bucket>();

  canActivate(ctx: ExecutionContext): boolean {
    const req  = ctx.switchToHttp().getRequest<Request>();
    const key  = this.getKey(req);
    const now  = Date.now();
    let bucket = this.buckets.get(key);

    // Crear o resetear bucket si venció la ventana
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + WINDOW_MS, blockedAt: 0 };
      this.buckets.set(key, bucket);
    }

    // Si está bloqueado y la ventana aún no expiró
    if (bucket.blockedAt > 0 && now < bucket.resetAt) {
      const secsLeft = Math.ceil((bucket.resetAt - now) / 1000);
      const minsLeft = Math.ceil(secsLeft / 60);
      this.log.warn(`Login bloqueado para ${key} — ${minsLeft} min restantes`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Demasiados intentos fallidos. Intente nuevamente en ${minsLeft} minuto(s).`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count++;

    if (bucket.count > MAX_INTENTS) {
      bucket.blockedAt = now;
      this.log.warn(`Login bloqueado por intentos excesivos: ${key}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Demasiados intentos fallidos. Intente nuevamente en 15 minutos.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /** Limpiar el contador tras login exitoso */
  reset(req: Request) {
    this.buckets.delete(this.getKey(req));
  }

  private getKey(req: Request): string {
    // IP real (detrás de proxy) + DNI para mayor precisión
    const ip  = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
             ?? req.socket?.remoteAddress
             ?? 'unknown';
    const dni = (req.body as { dni?: string })?.dni ?? '';
    return `${ip}:${dni}`;
  }
}
