import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';

@Injectable()
export class CursosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.curso.findMany({
      where: { deleted_at: null },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { horarios: true } },
      },
    });
  }

  async findOne(id: string) {
    const curso = await this.prisma.curso.findFirst({
      where: { id, deleted_at: null },
      include: {
        horarios: {
          where: { deleted_at: null },
          include: {
            docente: { select: { id: true, nombres: true, apellidos: true } },
            seccion: {
              select: {
                id: true,
                nombre: true,
                aula: true,
                ciclo: { select: { id: true, nombre: true } },
              },
            },
          },
        },
        _count: { select: { horarios: true } },
      },
    });

    if (!curso) throw new NotFoundException('Curso no encontrado');
    return curso;
  }

  async create(dto: CreateCursoDto) {
    const existing = await this.prisma.curso.findFirst({
      where: { codigo: dto.codigo, deleted_at: null },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un curso con el código '${dto.codigo}'`);
    }

    return this.prisma.curso.create({
      data: {
        nombre: dto.nombre,
        codigo: dto.codigo,
      },
    });
  }

  async update(id: string, dto: UpdateCursoDto) {
    await this.findOne(id);

    if (dto.codigo) {
      const existing = await this.prisma.curso.findFirst({
        where: { codigo: dto.codigo, deleted_at: null, NOT: { id } },
      });
      if (existing) {
        throw new BadRequestException(`Ya existe un curso con el código '${dto.codigo}'`);
      }
    }

    return this.prisma.curso.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.codigo !== undefined && { codigo: dto.codigo }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.curso.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { success: true };
  }
}
