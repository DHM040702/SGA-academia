import { Injectable, NotFoundException } from '@nestjs/common';
import { CanalEnvio, EstadoEnvio, Rol, TipoDestinatario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';
import { UpdateComunicadoDto } from './dto/update-comunicado.dto';

@Injectable()
export class ComunicadosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Alcance de visibilidad de comunicados según rol:
   *  - Gestión (admin/director): ve todo (borradores incluidos).
   *  - Resto: solo publicados y dirigidos a su rol (o a "todos").
   */
  private scopeFor(rolUsuario?: string) {
    const esGestion = !rolUsuario || rolUsuario === 'admin' || rolUsuario === 'director';
    const rolDestMapping: Partial<Record<string, TipoDestinatario[]>> = {
      docente:   [TipoDestinatario.todos, TipoDestinatario.docentes],
      alumno:    [TipoDestinatario.todos, TipoDestinatario.alumnos],
      apoderado: [TipoDestinatario.todos, TipoDestinatario.apoderados],
      auxiliar:  [TipoDestinatario.todos],
    };
    const allowedTypes = rolDestMapping[rolUsuario ?? ''];
    const where = {
      ...(!esGestion ? { publicadoAt: { not: null } } : {}),
      ...(allowedTypes ? { destinatarioTipo: { in: allowedTypes } } : {}),
    };
    return { esGestion, where };
  }

  async findAll(dto: PaginationDto, rolUsuario?: string) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const { where } = this.scopeFor(rolUsuario);

    const [items, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          publicadoPor: { select: { id: true, email: true } },
          aula:         { select: { id: true, nombre: true } },
          _count:       { select: { envios: true } },
        },
      }),
      this.prisma.comunicado.count({ where }),
    ]);

    const enriched = await Promise.all(
      items.map(async (c) => {
        const [enviados, total_envios] = await Promise.all([
          this.prisma.comunicadoEnvio.count({ where: { comunicadoId: c.id, estado: EstadoEnvio.enviado } }),
          this.prisma.comunicadoEnvio.count({ where: { comunicadoId: c.id } }),
        ]);
        const pct_enviado = total_envios > 0 ? Math.round((enviados / total_envios) * 100) : 0;
        return { ...c, pct_enviado };
      }),
    );

    return paginate(enriched, total, page, limit);
  }

  async findOne(id: string, rolUsuario?: string) {
    const { esGestion, where: scope } = this.scopeFor(rolUsuario);

    const comunicado = await this.prisma.comunicado.findFirst({
      // Aplica el mismo alcance que findAll: un no-gestor no puede abrir por id
      // un borrador ni un comunicado dirigido a otro rol.
      where: { id, ...scope },
      include: {
        publicadoPor: { select: { id: true, email: true } },
        aula:         { select: { id: true, nombre: true } },
        // Métricas y detalle de envíos: SOLO para gestión.
        ...(esGestion ? {
          _count: { select: { envios: true } },
          envios: {
            select: {
              id: true, usuarioId: true, canal: true,
              estado: true, enviadoAt: true, errorDetalle: true,
            },
            orderBy: { enviadoAt: 'desc' },
            take: 10,
          },
        } : {}),
      },
    });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');

    // Los no-gestores no reciben métricas de envío.
    if (!esGestion) return comunicado;

    const [enviados, total_envios] = await Promise.all([
      this.prisma.comunicadoEnvio.count({ where: { comunicadoId: id, estado: EstadoEnvio.enviado } }),
      this.prisma.comunicadoEnvio.count({ where: { comunicadoId: id } }),
    ]);
    const pct_enviado = total_envios > 0 ? Math.round((enviados / total_envios) * 100) : 0;

    return { ...comunicado, pct_enviado };
  }

  async create(dto: CreateComunicadoDto, publicadoPorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const comunicado = await tx.comunicado.create({
        data: {
          titulo:           dto.titulo,
          cuerpo:           dto.cuerpo,
          destinatarioTipo: (dto.destinatario_tipo as TipoDestinatario) ?? TipoDestinatario.todos,
          aulaId:           dto.aula_id,
          canalSistema:     dto.canal_sistema ?? true,
          canalWhatsapp:    dto.canal_whatsapp ?? false,
          publicadoPorId,
          publicadoAt:      dto.publicar_ahora ? new Date() : null,
        },
      });

      // Crear envíos pendientes según destinatario_tipo (canal sistema)
      if (dto.canal_sistema !== false) {
        // Filtrar por rol cuando el destinatario es específico
        const rolFiltro: Record<string, Rol | undefined> = {
          docentes:   Rol.docente,
          alumnos:    Rol.alumno,
          apoderados: Rol.apoderado,
        };
        const rolDestino = rolFiltro[dto.destinatario_tipo ?? ''];
        const destinatarios = await tx.usuario.findMany({
          where: {
            activo: true,
            deletedAt: null,
            ...(rolDestino ? { rol: rolDestino } : {}),
          },
          select: { id: true },
        });
        if (destinatarios.length > 0) {
          const ahora = new Date();
          await tx.comunicadoEnvio.createMany({
            data: destinatarios.map((u) => ({
              comunicadoId: comunicado.id,
              usuarioId:    u.id,
              canal:        CanalEnvio.sistema,
              estado:       EstadoEnvio.enviado,
              enviadoAt:    ahora,
            })),
          });
        }
      }

      return comunicado;
    });
  }

  async update(id: string, dto: UpdateComunicadoDto) {
    const comunicado = await this.prisma.comunicado.findFirst({ where: { id } });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');

    return this.prisma.comunicado.update({
      where: { id },
      data: {
        ...(dto.titulo         !== undefined && { titulo:        dto.titulo }),
        ...(dto.cuerpo         !== undefined && { cuerpo:        dto.cuerpo }),
        ...(dto.canal_sistema  !== undefined && { canalSistema:  dto.canal_sistema }),
        ...(dto.canal_whatsapp !== undefined && { canalWhatsapp: dto.canal_whatsapp }),
        // Publicar borrador: solo aplica si aún no fue publicado
        ...(dto.publicar_ahora === true && !comunicado.publicadoAt && { publicadoAt: new Date() }),
      },
      include: {
        publicadoPor: { select: { id: true, email: true } },
        aula:         { select: { id: true, nombre: true } },
        _count:       { select: { envios: true } },
      },
    });
  }

  async remove(id: string) {
    const comunicado = await this.prisma.comunicado.findFirst({ where: { id } });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');

    // Eliminar en transacción: primero los envíos (FK) y luego el comunicado
    await this.prisma.$transaction([
      this.prisma.comunicadoEnvio.deleteMany({ where: { comunicadoId: id } }),
      this.prisma.comunicado.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  async marcarLeido(comunicadoId: string, usuarioId: string) {
    const envio = await this.prisma.comunicadoEnvio.findFirst({
      where: { comunicadoId, usuarioId, canal: CanalEnvio.sistema },
    });
    if (!envio) return { success: false, message: 'Envío no encontrado para este usuario' };

    if (!envio.leidoEn) {
      await this.prisma.comunicadoEnvio.update({
        where: { id: envio.id },
        data: { leidoEn: new Date() },
      });
    }
    return { success: true };
  }

  /** Marca como leídos TODOS los comunicados del usuario aún sin leer. */
  async marcarTodosLeidos(usuarioId: string) {
    await this.prisma.comunicadoEnvio.updateMany({
      where: { usuarioId, canal: CanalEnvio.sistema, leidoEn: null },
      data: { leidoEn: new Date() },
    });
    return { success: true };
  }

  /** IDs de comunicados ya leídos por el usuario (para hidratar el frontend). */
  async leidosDelUsuario(usuarioId: string): Promise<string[]> {
    const rows = await this.prisma.comunicadoEnvio.findMany({
      where: { usuarioId, canal: CanalEnvio.sistema, leidoEn: { not: null } },
      select: { comunicadoId: true },
    });
    return rows.map((r) => r.comunicadoId);
  }
}
