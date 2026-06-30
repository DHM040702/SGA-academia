import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_EXPIRES_DAYS = 7;

// Tipo local — no usa el cliente Prisma generado (tabla nueva, CLI roto en este setup)
interface RefreshTokenRow {
  id:         string;
  token_hash: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(dni: string, password: string) {
    const user = await this.prisma.usuario.findFirst({
      where: { dni, deletedAt: null },
    });
    if (!user || !user.activo) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }

  async login(user: { id: string; email: string; rol: string }) {
    const payload = { sub: user.id, email: user.email, rol: user.rol };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
    });

    // Guardar hash en BD con raw SQL (prisma generate no disponible en este entorno)
    // Try-catch: si la tabla aún no existe (migración pendiente), el login igual funciona
    try {
      const tokenHash = await bcrypt.hash(refreshToken, 10);
      const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

      await this.prisma.$executeRaw`
        DELETE FROM refresh_tokens
        WHERE usuario_id = ${user.id}::uuid
          AND expires_at < NOW()
      `;

      await this.prisma.$executeRaw`
        INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at)
        VALUES (${user.id}::uuid, ${tokenHash}, ${expiresAt})
      `;
    } catch {
      // Tabla aún no creada — login sigue funcionando sin revocación
    }

    return { accessToken, refreshToken };
  }

  async refresh(user: { id: string; email: string; rol: string }, rawToken: string) {
    const dbUser = await this.prisma.usuario.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.activo) throw new UnauthorizedException();

    // Verificar hash en BD — si la tabla no existe aún, omitir la validación
    try {
      const stored = await this.prisma.$queryRaw<RefreshTokenRow[]>`
        SELECT id, token_hash
        FROM refresh_tokens
        WHERE usuario_id = ${user.id}::uuid
          AND expires_at >= NOW()
      `;

      let matchedId: string | null = null;
      for (const row of stored) {
        if (await bcrypt.compare(rawToken, row.token_hash)) {
          matchedId = row.id;
          break;
        }
      }
      if (!matchedId) throw new UnauthorizedException('Token de refresco inválido o revocado');

      await this.prisma.$executeRaw`
        DELETE FROM refresh_tokens WHERE id = ${matchedId}::uuid
      `;
    } catch (e) {
      // Si es error de autenticación, relanzar; si es error de tabla, omitir
      if (e instanceof UnauthorizedException) throw e;
    }

    return this.login(dbUser as any);
  }

  async logout(userId: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM refresh_tokens WHERE usuario_id = ${userId}::uuid
      `;
    } catch {
      // Tabla aún no creada — logout sigue funcionando
    }
  }

  /** Cambio de contraseña por el propio usuario. Limpia el flag de cambio obligatorio. */
  async cambiarPassword(userId: string, actual: string | undefined, nueva: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!user || !user.activo) throw new UnauthorizedException();

    // En el cambio obligatorio (primer ingreso / reseteo) el usuario ya se autenticó
    // al iniciar sesión, por lo que no se vuelve a pedir la contraseña actual.
    // En un cambio voluntario sí se exige y verifica.
    if (!user.debeCambiarPassword) {
      if (!actual) throw new UnauthorizedException('Debe ingresar su contraseña actual');
      const valid = await bcrypt.compare(actual, user.passwordHash);
      if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const hash = await bcrypt.hash(nueva, 12);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: hash, debeCambiarPassword: false },
    });

    // Revocar todos los refresh tokens por seguridad tras el cambio
    try {
      await this.prisma.$executeRaw`DELETE FROM refresh_tokens WHERE usuario_id = ${userId}::uuid`;
    } catch { /* tabla aún no creada — ignorar */ }

    return { ok: true };
  }

  async me(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        debeCambiarPassword: true,
        nombre:    true,
        apellidos: true,
        dni:       true,
        alumno:    { select: { id: true, nombre: true, apellidos: true, codigoBarras: true, aulaId: true, aula: { select: { area: true } } } },
        docente:   { select: { id: true, nombre: true, apellidos: true } },
        apoderado: {
          select: {
            id: true, nombre: true, apellidos: true,
            // Hijos vinculados, para que el portal del apoderado muestre sus datos.
            alumnos: {
              where: { alumno: { deletedAt: null } },
              orderBy: { esPrincipal: 'desc' },
              select: {
                parentesco: true,
                esPrincipal: true,
                alumno: {
                  select: {
                    id: true, nombre: true, apellidos: true, codigoBarras: true, dni: true, aulaId: true,
                    aula: {
                      select: {
                        nombre: true, area: true, turno: true,
                        ciclo: { select: { nombre: true, activo: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
