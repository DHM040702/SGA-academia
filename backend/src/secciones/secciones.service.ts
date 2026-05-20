import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeccionDto } from './dto/create-seccion.dto';
import { UpdateSeccionDto } from './dto/update-seccion.dto';

@Injectable()
export class SeccionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(ciclo_id?: string) {
    const where = {
      deleted_at: null,
      ...(ciclo_id ? { ciclo_id } : {}),
    };

    return this.prisma.seccion.findMany({
      where,
      orderBy: [{ ciclo: { fecha_inicio: 'desc' } }, { nombre: 'asc' }],
      include: {
        ciclo: { select: { id: true, nombre: true, activo: true } },
        _count: { select: { alumnos: true, horarios: true } },
      },
    });
  }

  async findOne(id: string) {
    const seccion = await this.prisma.seccion.findFirst({
      where: { id, deleted_at: null },
      include: {
        ciclo: { select: { id: true, nombre: true, activo: true, fecha_inicio: true, fecha_fin: true } },
        alumnos: {
          where: { deleted_at: null },
          orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
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
          orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        },
      },
    });

    if (!seccion) throw new NotFoundException('Sección no encontrada');
    return seccion;
  }

  async create(dto: CreateSeccionDto) {
    const cicloExists = await this.prisma.ciclo.findFirst({
      where: { id: dto.ciclo_id, deleted_at: null },
    });
    if (!cicloExists) throw new BadRequestException('El ciclo especificado no existe');

    return this.prisma.seccion.create({
      data: {
        nombre: dto.nombre,
        ciclo_id: dto.ciclo_id,
        aula: dto.aula,
      },
      include: {
        ciclo: { select: { id: true, nombre: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSeccionDto) {
    await this.findOne(id);

    if (dto.ciclo_id) {
      const cicloExists = await this.prisma.ciclo.findFirst({
        where: { id: dto.ciclo_id, deleted_at: null },
      });
      if (!cicloExists) throw new BadRequestException('El ciclo especificado no existe');
    }

    return this.prisma.seccion.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.ciclo_id !== undefined && { ciclo_id: dto.ciclo_id }),
        ...(dto.aula !== undefined && { aula: dto.aula }),
      },
      include: {
        ciclo: { select: { id: true, nombre: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.seccion.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { success: true };
  }
}
