import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCicloDto } from './dto/create-ciclo.dto';
import { UpdateCicloDto } from './dto/update-ciclo.dto';

@Injectable()
export class CiclosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const ciclos = await this.prisma.ciclo.findMany({
      where: { deleted_at: null },
      orderBy: { fecha_inicio: 'desc' },
      include: {
        _count: {
          select: { secciones: true },
        },
        secciones: {
          where: { deleted_at: null },
          select: {
            _count: { select: { alumnos: true } },
          },
        },
      },
    });

    return ciclos.map((c) => {
      const total_alumnos = c.secciones.reduce(
        (sum, s) => sum + s._count.alumnos,
        0,
      );
      const { secciones, ...rest } = c;
      return {
        ...rest,
        total_secciones: c._count.secciones,
        total_alumnos,
      };
    });
  }

  async findOne(id: string) {
    const ciclo = await this.prisma.ciclo.findFirst({
      where: { id, deleted_at: null },
      include: {
        secciones: {
          where: { deleted_at: null },
          include: {
            alumnos: {
              where: { deleted_at: null },
              include: {
                usuario: { select: { email: true, activo: true } },
              },
            },
            horarios: {
              where: { deleted_at: null },
              include: {
                docente: { select: { id: true, nombres: true, apellidos: true } },
                curso: { select: { id: true, nombre: true, codigo: true } },
              },
            },
          },
        },
      },
    });

    if (!ciclo) throw new NotFoundException('Ciclo no encontrado');
    return ciclo;
  }

  async create(dto: CreateCicloDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.activo) {
        await tx.ciclo.updateMany({
          where: { activo: true, deleted_at: null },
          data: { activo: false },
        });
      }

      return tx.ciclo.create({
        data: {
          nombre: dto.nombre,
          fecha_inicio: new Date(dto.fecha_inicio),
          fecha_fin: new Date(dto.fecha_fin),
          activo: dto.activo ?? false,
        },
      });
    });
  }

  async update(id: string, dto: UpdateCicloDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.activo === true) {
        await tx.ciclo.updateMany({
          where: { activo: true, deleted_at: null, NOT: { id } },
          data: { activo: false },
        });
      }

      return tx.ciclo.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined && { nombre: dto.nombre }),
          ...(dto.fecha_inicio !== undefined && { fecha_inicio: new Date(dto.fecha_inicio) }),
          ...(dto.fecha_fin !== undefined && { fecha_fin: new Date(dto.fecha_fin) }),
          ...(dto.activo !== undefined && { activo: dto.activo }),
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const tieneAsistencias = await this.prisma.asistencia.count({
      where: {
        deleted_at: null,
        horario: {
          seccion: { ciclo_id: id },
        },
      },
    });

    if (tieneAsistencias > 0) {
      throw new BadRequestException(
        'No se puede eliminar un ciclo que tiene asistencias registradas',
      );
    }

    const now = new Date();
    await this.prisma.ciclo.update({
      where: { id },
      data: { deleted_at: now },
    });

    return { success: true };
  }
}
