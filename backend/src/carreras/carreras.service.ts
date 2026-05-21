import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Area } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';

@Injectable()
export class CarrerasService {
  constructor(private prisma: PrismaService) {}

  findAll(area?: Area) {
    return this.prisma.carrera.findMany({
      where: { ...(area ? { area } : {}), activo: true },
      orderBy: [{ area: 'asc' }, { nombre: 'asc' }],
      include: { _count: { select: { alumnos: true } } },
    });
  }

  async findOne(id: string) {
    const carrera = await this.prisma.carrera.findFirst({
      where: { id },
      include: { _count: { select: { alumnos: true } } },
    });
    if (!carrera) throw new NotFoundException('Carrera no encontrada');
    return carrera;
  }

  create(dto: CreateCarreraDto) {
    return this.prisma.carrera.create({
      data: { nombre: dto.nombre, area: dto.area, activo: dto.activo ?? true },
    });
  }

  async update(id: string, dto: UpdateCarreraDto) {
    await this.findOne(id);
    return this.prisma.carrera.update({
      where: { id },
      data: {
        ...(dto.nombre  !== undefined && { nombre:  dto.nombre }),
        ...(dto.area    !== undefined && { area:    dto.area }),
        ...(dto.activo  !== undefined && { activo:  dto.activo }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const alumnos = await this.prisma.alumno.count({
      where: { carreraId: id, deletedAt: null },
    });
    if (alumnos > 0)
      throw new BadRequestException('No se puede eliminar una carrera con alumnos asignados');
    await this.prisma.carrera.delete({ where: { id } });
    return { success: true };
  }
}
