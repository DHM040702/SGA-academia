import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeccionDto } from './dto/create-seccion.dto';
import { UpdateSeccionDto } from './dto/update-seccion.dto';

@Injectable()
export class SeccionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(ciclo_id?: string) {
    return this.prisma.seccion.findMany({
      where: ciclo_id ? { cicloId: ciclo_id } : undefined,
      orderBy: [{ ciclo: { fechaInicio: 'desc' } }, { nombre: 'asc' }],
      include: {
        ciclo: { select: { id: true, nombre: true, activo: true } },
        _count: { select: { alumnos: true, horarios: true } },
      },
    });
  }

  async findOne(id: string) {
    const seccion = await this.prisma.seccion.findFirst({
      where: { id },
      include: {
        ciclo: { select: { id: true, nombre: true, activo: true, fechaInicio: true, fechaFin: true } },
        alumnos: {
          where: { deletedAt: null },
          orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
          include: { usuario: { select: { email: true, activo: true } } },
        },
        horarios: {
          include: {
            docente: { select: { id: true, nombre: true, apellidos: true } },
            curso:   { select: { id: true, nombre: true, codigo: true } },
          },
          orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
        },
      },
    });

    if (!seccion) throw new NotFoundException('Sección no encontrada');
    return seccion;
  }

  async create(dto: CreateSeccionDto) {
    const ciclo = await this.prisma.ciclo.findFirst({ where: { id: dto.ciclo_id } });
    if (!ciclo) throw new BadRequestException('El ciclo especificado no existe');

    return this.prisma.seccion.create({
      data: {
        nombre:     dto.nombre,
        cicloId:    dto.ciclo_id,
        turno:      dto.turno,
        nivel:      dto.nivel,
        cupoMaximo: dto.cupo_maximo,
      },
      include: { ciclo: { select: { id: true, nombre: true } } },
    });
  }

  async update(id: string, dto: UpdateSeccionDto) {
    await this.findOne(id);

    if (dto.ciclo_id) {
      const ciclo = await this.prisma.ciclo.findFirst({ where: { id: dto.ciclo_id } });
      if (!ciclo) throw new BadRequestException('El ciclo especificado no existe');
    }

    return this.prisma.seccion.update({
      where: { id },
      data: {
        ...(dto.nombre      !== undefined && { nombre:     dto.nombre }),
        ...(dto.ciclo_id    !== undefined && { cicloId:    dto.ciclo_id }),
        ...(dto.turno       !== undefined && { turno:      dto.turno }),
        ...(dto.nivel       !== undefined && { nivel:      dto.nivel }),
        ...(dto.cupo_maximo !== undefined && { cupoMaximo: dto.cupo_maximo }),
      },
      include: { ciclo: { select: { id: true, nombre: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Verificar si hay alumnos o comunicados vinculados
    const alumnos = await this.prisma.alumno.count({ where: { seccionId: id, deletedAt: null } });
    if (alumnos > 0) throw new BadRequestException('No se puede eliminar una sección con alumnos');
    await this.prisma.seccion.delete({ where: { id } });
    return { success: true };
  }
}
