import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoRecurso } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { FilterBibliotecaDto } from './dto/filter-biblioteca.dto';

@Injectable()
export class BibliotecaService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterBibliotecaDto) {
    const { page = 1, limit = 20, q, tipo, curso_id } = dto;
    const skip = (page - 1) * limit;

    const where: any = { activo: true };
    if (tipo)     where.tipo    = tipo;
    if (curso_id) where.cursoId = curso_id;
    if (q) {
      where.OR = [
        { titulo:      { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.recursoBiblioteca.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subidoPor: { select: { id: true, email: true } },
          curso:     { select: { id: true, nombre: true, codigo: true } },
        },
      }),
      this.prisma.recursoBiblioteca.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const recurso = await this.prisma.recursoBiblioteca.findFirst({
      where: { id, activo: true },
      include: {
        subidoPor: { select: { id: true, email: true } },
        curso:     { select: { id: true, nombre: true, codigo: true } },
      },
    });
    if (!recurso) throw new NotFoundException('Recurso de biblioteca no encontrado');

    // Incrementar contador de descargas en background
    void this.prisma.recursoBiblioteca.update({
      where: { id },
      data: { descargas: { increment: 1 } },
    });

    return recurso;
  }

  async create(dto: CreateRecursoDto, subidoPorId: string) {
    return this.prisma.recursoBiblioteca.create({
      data: {
        titulo:       dto.titulo,
        descripcion:  dto.descripcion,
        tipo:         dto.tipo,
        url:          dto.url,
        nivel:        dto.nivel,
        cursoId:      dto.curso_id ?? null,
        subidoPorId,
        activo:       true,
      },
      include: {
        subidoPor: { select: { id: true, email: true } },
        curso:     { select: { id: true, nombre: true } },
      },
    });
  }

  async update(id: string, dto: UpdateRecursoDto) {
    await this.findOne(id);
    return this.prisma.recursoBiblioteca.update({
      where: { id },
      data: {
        ...(dto.titulo       !== undefined && { titulo:       dto.titulo }),
        ...(dto.descripcion  !== undefined && { descripcion:  dto.descripcion }),
        ...(dto.tipo         !== undefined && { tipo:         dto.tipo }),
        ...(dto.url          !== undefined && { url:          dto.url }),
        ...(dto.nivel        !== undefined && { nivel:        dto.nivel }),
        ...(dto.curso_id     !== undefined && { cursoId:      dto.curso_id }),
      },
      include: {
        subidoPor: { select: { id: true, email: true } },
        curso:     { select: { id: true, nombre: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.recursoBiblioteca.update({
      where: { id },
      data: { activo: false },
    });
    return { success: true };
  }

  async stats() {
    const [total_pdf, total_video, total_enlace, total_iframe] = await Promise.all([
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.pdf,     activo: true } }),
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.video,   activo: true } }),
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.enlace,  activo: true } }),
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.iframe,  activo: true } }),
    ]);
    return { total_pdf, total_video, total_enlace, total_iframe };
  }
}
