import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCicloDto } from './dto/create-ciclo.dto';
import { UpdateCicloDto } from './dto/update-ciclo.dto';

@Injectable()
export class CiclosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const ciclos = await this.prisma.ciclo.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        _count: { select: { aulas: true } },
        aulas: {
          select: { _count: { select: { alumnos: true } } },
        },
      },
    });

    return ciclos.map((c) => {
      const total_alumnos = c.aulas.reduce((sum, a) => sum + a._count.alumnos, 0);
      const { aulas, ...rest } = c;
      return { ...rest, total_secciones: c._count.aulas, total_alumnos };
    });
  }

  async findOne(id: string) {
    const ciclo = await this.prisma.ciclo.findFirst({
      where: { id },
      include: {
        aulas: {
          include: {
            alumnos: {
              where: { deletedAt: null },
              include: { usuario: { select: { email: true, activo: true } } },
            },
            horarios: {
              include: {
                docente: { select: { id: true, nombre: true, apellidos: true } },
                curso:   { select: { id: true, nombre: true, codigo: true } },
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
        await tx.ciclo.updateMany({ where: { activo: true }, data: { activo: false } });
      }
      return tx.ciclo.create({
        data: {
          nombre:      dto.nombre,
          fechaInicio: new Date(dto.fecha_inicio),
          fechaFin:    new Date(dto.fecha_fin),
          activo:      dto.activo ?? false,
        },
      });
    });
  }

  async update(id: string, dto: UpdateCicloDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.activo === true) {
        await tx.ciclo.updateMany({ where: { activo: true, NOT: { id } }, data: { activo: false } });
      }
      return tx.ciclo.update({
        where: { id },
        data: {
          ...(dto.nombre        !== undefined && { nombre:      dto.nombre }),
          ...(dto.fecha_inicio  !== undefined && { fechaInicio: new Date(dto.fecha_inicio) }),
          ...(dto.fecha_fin     !== undefined && { fechaFin:    new Date(dto.fecha_fin) }),
          ...(dto.activo        !== undefined && { activo:      dto.activo }),
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const totalAlumnos = await this.prisma.alumno.count({
      where: { aula: { cicloId: id }, deletedAt: null },
    });
    if (totalAlumnos > 0) {
      throw new BadRequestException('No se puede eliminar un ciclo con alumnos matriculados');
    }
    await this.prisma.ciclo.delete({ where: { id } });
    return { success: true };
  }
}
