import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { FilterAuditoriaDto } from './dto/filter-auditoria.dto';

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  /** Construye el filtro WHERE a partir del DTO. */
  private buildWhere(dto: FilterAuditoriaDto): Prisma.AuditoriaWhereInput {
    const where: Prisma.AuditoriaWhereInput = {};

    if (dto.usuario) {
      where.usuarioEmail = { contains: dto.usuario, mode: 'insensitive' };
    }
    if (dto.accion) where.accion = dto.accion;
    if (dto.entidad) where.entidad = dto.entidad;

    if (dto.desde || dto.hasta) {
      where.createdAt = {};
      if (dto.desde) where.createdAt.gte = new Date(`${dto.desde}T00:00:00`);
      if (dto.hasta) where.createdAt.lte = new Date(`${dto.hasta}T23:59:59`);
    }

    return where;
  }

  /** Mapa usuarioId → "Nombre Apellidos" para mostrar en lugar del email. */
  private async nombresPorUsuarioId(usuarioIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(usuarioIds)];
    if (ids.length === 0) return new Map();

    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, apellidos: true, email: true },
    });

    return new Map(
      usuarios.map((u) => [
        u.id,
        (u.nombre || u.apellidos)
          ? `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim()
          : u.email,
      ]),
    );
  }

  async findAll(dto: FilterAuditoriaDto) {
    const { page = 1, limit = 20 } = dto;
    const where = this.buildWhere(dto);

    const [items, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    const nombres = await this.nombresPorUsuarioId(
      items.map((i) => i.usuarioId).filter((id): id is string => !!id),
    );
    const itemsConNombre = items.map((i) => ({
      ...i,
      usuarioNombre: (i.usuarioId && nombres.get(i.usuarioId)) || i.usuarioEmail,
    }));

    return paginate(itemsConNombre, total, page, limit);
  }

  /** Métricas para el panel de resumen del administrador. */
  async resumen() {
    const ahora = new Date();
    const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hoy0 = new Date(ahora);
    hoy0.setHours(0, 0, 0, 0);

    const [total, hoy, porAccion, porEntidad, accesos7] = await Promise.all([
      this.prisma.auditoria.count(),
      this.prisma.auditoria.count({ where: { createdAt: { gte: hoy0 } } }),
      this.prisma.auditoria.groupBy({
        by: ['accion'],
        _count: { accion: true },
        orderBy: { _count: { accion: 'desc' } },
      }),
      this.prisma.auditoria.groupBy({
        by: ['entidad'],
        _count: { entidad: true },
        orderBy: { _count: { entidad: 'desc' } },
        take: 8,
      }),
      this.prisma.auditoria.count({
        where: { accion: 'login', createdAt: { gte: hace7 } },
      }),
    ]);

    // Usuarios más activos (últimos 7 días)
    const activos = await this.prisma.auditoria.groupBy({
      by: ['usuarioId'],
      where: { createdAt: { gte: hace7 }, usuarioId: { not: null } },
      _count: { usuarioId: true },
      orderBy: { _count: { usuarioId: 'desc' } },
      take: 5,
    });
    const nombresActivos = await this.nombresPorUsuarioId(
      activos.map((a) => a.usuarioId).filter((id): id is string => !!id),
    );

    return {
      total,
      hoy,
      accesos7,
      porAccion: porAccion.map((a) => ({ accion: a.accion, total: a._count.accion })),
      porEntidad: porEntidad.map((e) => ({ entidad: e.entidad, total: e._count.entidad })),
      usuariosActivos: activos.map((u) => ({
        nombre: (u.usuarioId && nombresActivos.get(u.usuarioId)) || 'Desconocido',
        total: u._count.usuarioId,
      })),
    };
  }

  /** Devuelve el registro filtrado como CSV (hasta 10 000 filas). */
  async exportarCsv(dto: FilterAuditoriaDto): Promise<string> {
    const where = this.buildWhere(dto);
    const rows = await this.prisma.auditoria.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    const head = ['Fecha', 'Usuario', 'Rol', 'Acción', 'Entidad', 'ID', 'IP'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.usuarioEmail ?? '',
        r.usuarioRol ?? '',
        r.accion,
        r.entidad,
        r.entidadId ?? '',
        r.ip ?? '',
      ]
        .map(esc)
        .join(','),
    );

    return [head.map(esc).join(','), ...lines].join('\n');
  }

  /**
   * Purga registros de auditoría hasta una fecha (inclusive). Sin `hasta`,
   * elimina TODO el historial hasta el momento actual. Devuelve cuántos borró.
   * Solo debe exponerse a admin (control en el controller).
   */
  async purgar(hasta?: string): Promise<{ eliminados: number }> {
    const corte = hasta ? new Date(`${hasta}T23:59:59`) : new Date();
    const { count } = await this.prisma.auditoria.deleteMany({
      where: { createdAt: { lte: corte } },
    });
    return { eliminados: count };
  }
}
