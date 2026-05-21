import { Injectable, NotFoundException } from '@nestjs/common';
import { CanalEnvio, EstadoEnvio, TipoDestinatario } from '@prisma/client';
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          publicadoPor: { select: { id: true, email: true } },
          seccion:      { select: { id: true, nombre: true } },
          _count:       { select: { envios: true } },
        },
      }),
      this.prisma.comunicado.count(),
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

  async findOne(id: string) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: { id },
      include: {
        publicadoPor: { select: { id: true, email: true } },
        seccion:      { select: { id: true, nombre: true } },
        envios: {
          select: {
            id: true, usuarioId: true, canal: true,
            estado: true, enviadoAt: true, errorDetalle: true,
          },
        },
      },
    });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');
    return comunicado;
  }

  async create(dto: CreateComunicadoDto, publicadoPorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const comunicado = await tx.comunicado.create({
        data: {
          titulo:           dto.titulo,
          cuerpo:           dto.cuerpo,
          destinatarioTipo: (dto.destinatario_tipo as TipoDestinatario) ?? TipoDestinatario.todos,
          seccionId:        dto.seccion_id,
          canalSistema:     dto.canal_sistema ?? true,
          canalWhatsapp:    dto.canal_whatsapp ?? false,
          publicadoPorId,
          publicadoAt:      dto.publicar_ahora ? new Date() : null,
        },
      });

      // Crear envíos pendientes para todos los usuarios activos (canal sistema)
      if (dto.canal_sistema !== false) {
        const destinatarios = await tx.usuario.findMany({
          where: { activo: true, deletedAt: null },
          select: { id: true },
        });
        if (destinatarios.length > 0) {
          await tx.comunicadoEnvio.createMany({
            data: destinatarios.map((u) => ({
              comunicadoId: comunicado.id,
              usuarioId:    u.id,
              canal:        CanalEnvio.sistema,
              estado:       EstadoEnvio.pendiente,
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
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.cuerpo !== undefined && { cuerpo: dto.cuerpo }),
      },
    });
  }

  async remove(id: string) {
    const comunicado = await this.prisma.comunicado.findFirst({ where: { id } });
    if (!comunicado) throw new NotFoundException('Comunicado no encontrado');
    await this.prisma.comunicado.delete({ where: { id } });
    return { success: true };
  }

  async marcarLeido(comunicadoId: string, usuarioId: string) {
    const envio = await this.prisma.comunicadoEnvio.findFirst({
      where: { comunicadoId, usuarioId, canal: CanalEnvio.sistema },
    });
    if (!envio) return { success: false, message: 'Envío no encontrado para este usuario' };

    await this.prisma.comunicadoEnvio.update({
      where: { id: envio.id },
      data: { estado: EstadoEnvio.enviado, enviadoAt: new Date() },
    });
    return { success: true };
  }
}
