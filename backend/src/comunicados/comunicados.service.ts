import { Injectable, NotFoundException } from '@nestjs/common';
import { CanalComunicado, EstadoEnvio } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';
import { UpdateComunicadoDto } from './dto/update-comunicado.dto';

@Injectable()
export class ComunicadosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          autor: {
            select: {
              id: true,
              email: true,
              alumno: { select: { nombres: true, apellidos: true } },
              docente: { select: { nombres: true, apellidos: true } },
            },
          },
          _count: { select: { envios: true } },
        },
      }),
      this.prisma.comunicado.count({ where: { deleted_at: null } }),
    ]);

    // Enriquecer con porcentaje leído
    const enriched = await Promise.all(
      items.map(async (c) => {
        const [enviados, total_envios] = await Promise.all([
          this.prisma.comunicadoEnvio.count({
            where: { comunicado_id: c.id, estado: EstadoEnvio.enviado, deleted_at: null },
          }),
          this.prisma.comunicadoEnvio.count({
            where: { comunicado_id: c.id, deleted_at: null },
          }),
        ]);
        const pct_leido = total_envios > 0 ? Math.round((enviados / total_envios) * 100) : 0;
        return { ...c, pct_leido };
      }),
    );

    return paginate(enriched, total, page, limit);
  }

  async findOne(id: string) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: { id, deleted_at: null },
      include: {
        autor: {
          select: {
            id: true,
            email: true,
            alumno: { select: { nombres: true, apellidos: true } },
            docente: { select: { nombres: true, apellidos: true } },
          },
        },
        envios: {
          where: { deleted_at: null },
          select: {
            id: true,
            destinatario_id: true,
            canal: true,
            estado: true,
            enviado_at: true,
            error_mensaje: true,
          },
        },
      },
    });

    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');

    // Estadísticas por canal
    const stats_por_canal = await this.prisma.comunicadoEnvio.groupBy({
      by: ['canal', 'estado'],
      where: { comunicado_id: id, deleted_at: null },
      _count: { id: true },
    });

    return { ...comunicado, stats_por_canal };
  }

  async create(dto: CreateComunicadoDto, autor_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const comunicado = await tx.comunicado.create({
        data: {
          titulo: dto.titulo,
          contenido: dto.contenido,
          canales: dto.canales,
          roles_destino: dto.roles_destino,
          autor_id,
        },
      });

      // Para canal 'interno': crear ComunicadoEnvio por cada usuario con rol destino
      if (dto.canales.includes(CanalComunicado.interno)) {
        const destinatarios = await tx.usuario.findMany({
          where: {
            rol: { in: dto.roles_destino },
            activo: true,
            deleted_at: null,
          },
          select: { id: true },
        });

        if (destinatarios.length > 0) {
          await tx.comunicadoEnvio.createMany({
            data: destinatarios.map((u) => ({
              comunicado_id: comunicado.id,
              destinatario_id: u.id,
              canal: CanalComunicado.interno,
              estado: EstadoEnvio.pendiente,
            })),
          });
        }
      }

      // Para WhatsApp / SMS: crear registros pendientes (integración Twilio futura)
      for (const canal of dto.canales) {
        if (canal === CanalComunicado.interno) continue;

        const destinatarios = await tx.usuario.findMany({
          where: {
            rol: { in: dto.roles_destino },
            activo: true,
            deleted_at: null,
          },
          select: { id: true },
        });

        if (destinatarios.length > 0) {
          await tx.comunicadoEnvio.createMany({
            data: destinatarios.map((u) => ({
              comunicado_id: comunicado.id,
              destinatario_id: u.id,
              canal,
              estado: EstadoEnvio.pendiente,
            })),
          });
        }
      }

      return comunicado;
    });
  }

  async update(id: string, dto: UpdateComunicadoDto) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: { id, deleted_at: null },
    });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');

    return this.prisma.comunicado.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.contenido !== undefined && { contenido: dto.contenido }),
      },
    });
  }

  async remove(id: string) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: { id, deleted_at: null },
    });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');

    await this.prisma.comunicado.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }

  async marcarLeido(comunicado_id: string, usuario_id: string) {
    const envio = await this.prisma.comunicadoEnvio.findFirst({
      where: {
        comunicado_id,
        destinatario_id: usuario_id,
        canal: CanalComunicado.interno,
        deleted_at: null,
      },
    });

    if (!envio) {
      // Comunicado no dirigido al usuario o ya no existe; no es un error crítico
      return { success: false, message: 'No se encontró envío para este usuario' };
    }

    await this.prisma.comunicadoEnvio.update({
      where: { id: envio.id },
      data: {
        estado: EstadoEnvio.enviado,
        enviado_at: new Date(),
      },
    });

    return { success: true };
  }
}
