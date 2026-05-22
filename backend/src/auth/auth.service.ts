import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
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
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }

  async refresh(user: { id: string; email: string; rol: string }) {
    const dbUser = await this.prisma.usuario.findUnique({
      where: { id: user.id },
    });
    if (!dbUser || !dbUser.activo) throw new UnauthorizedException();
    return this.login(dbUser as any);
  }

  async me(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        alumno:    { select: { id: true, nombre: true, apellidos: true, codigoBarras: true, aulaId: true } },
        docente:   { select: { id: true, nombre: true, apellidos: true } },
        apoderado: { select: { id: true, nombre: true, apellidos: true } },
      },
    });
  }
}
