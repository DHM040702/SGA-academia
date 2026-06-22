import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE = ['password', 'passwordHash', 'actual', 'nueva', 'confirmar'];

/** Oculta campos sensibles antes de guardar el detalle en la auditoría. */
function sanitize(body: any): any {
  if (!body || typeof body !== 'object') return undefined;
  const clone: any = Array.isArray(body) ? [...body] : { ...body };
  for (const k of Object.keys(clone)) {
    if (SENSITIVE.includes(k)) clone[k] = '***';
    else if (clone[k] && typeof clone[k] === 'object') clone[k] = sanitize(clone[k]);
  }
  return clone;
}

/**
 * Registra en la tabla `auditoria` toda operación de escritura
 * (POST / PATCH / PUT / DELETE) tras completarse con éxito.
 * Los eventos de `auth` (login/logout/cambio de contraseña) se registran
 * explícitamente en AuthService, por lo que aquí se omiten.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    if (!MUTATING.has(method)) return next.handle();

    const url: string = (req.originalUrl || req.url || '').split('?')[0];
    const path = url.replace(/^\/api\/?/, '');
    const segments = path.split('/').filter(Boolean);
    const entidad = segments[0] ?? 'desconocido';

    // auth y auditoria no se auto-auditan aquí
    if (entidad === 'auth' || entidad === 'auditoria') return next.handle();

    return next.handle().pipe(
      tap(() => {
        const user = req.user as
          | { id?: string; email?: string; rol?: string }
          | undefined;

        let accion = 'actualizar';
        if (method === 'POST') accion = 'crear';
        if (method === 'DELETE') accion = 'eliminar';
        if (path.includes('reset-password')) accion = 'reset_password';

        const ip =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          req.socket?.remoteAddress ||
          null;

        void this.prisma.auditoria
          .create({
            data: {
              usuarioId: user?.id ?? null,
              usuarioEmail: user?.email ?? null,
              usuarioRol: user?.rol ?? null,
              accion,
              entidad,
              entidadId: req.params?.id ?? null,
              detalle: sanitize(req.body) ?? undefined,
              ip,
            },
          })
          .catch(() => {
            /* no interrumpir la petición si falla el registro de auditoría */
          });
      }),
    );
  }
}
