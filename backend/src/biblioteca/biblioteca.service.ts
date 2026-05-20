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
    const { page = 1, limit = 20, q, tipo, curso_id, seccion_id } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (tipo) where.tipo = tipo;
    if (curso_id) where.curso_id = curso_id;
    if (seccion_id) where.seccion_id = seccion_id;
    if (q) {
      where.OR = [
        { titulo: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.recursoBiblioteca.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          autor: {
            select: {
              id: true,
              email: true,
              docente: { select: { nombres: true, apellidos: true } },
              alumno: { select: { nombres: true, apellidos: true } },
            },
          },
          curso: { select: { id: true, nombre: true, codigo: true } },
          seccion: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.recursoBiblioteca.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const recurso = await this.prisma.recursoBiblioteca.findFirst({
      where: { id, deleted_at: null },
      include: {
        autor: {
          select: {
            id: true,
            email: true,
            docente: { select: { nombres: true, apellidos: true } },
            alumno: { select: { nombres: true, apellidos: true } },
          },
        },
        curso: { select: { id: true, nombre: true, codigo: true } },
        seccion: { select: { id: true, nombre: true } },
      },
    });

    if (!recurso) throw new NotFoundException('Recurso de biblioteca no encontrado');
    return recurso;
  }

  async create(dto: CreateRecursoDto, subido_por_id: string) {
    return this.prisma.recursoBiblioteca.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        url: dto.url,
        seccion_id: dto.seccion_id ?? null,
        curso_id: dto.curso_id ?? null,
        subido_por: subido_por_id,
      },
      include: {
        autor: { select: { id: true, email: true } },
        curso: { select: { id: true, nombre: true } },
        seccion: { select: { id: true, nombre: true } },
      },
    });
  }

  async update(id: string, dto: UpdateRecursoDto) {
    await this.findOne(id);

    return this.prisma.recursoBiblioteca.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.seccion_id !== undefined && { seccion_id: dto.seccion_id }),
        ...(dto.curso_id !== undefined && { curso_id: dto.curso_id }),
      },
      include: {
        autor: { select: { id: true, email: true } },
        curso: { select: { id: true, nombre: true } },
        seccion: { select: { id: true, nombre: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.recursoBiblioteca.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }

  async stats() {
    const [total_pdf, total_video, total_enlace] = await Promise.all([
      this.prisma.recursoBiblioteca.count({
        where: { tipo: TipoRecurso.pdf, deleted_at: null },
      }),
      this.prisma.recursoBiblioteca.count({
        where: { tipo: TipoRecurso.video, deleted_at: null },
      }),
      this.prisma.recursoBiblioteca.count({
        where: { tipo: TipoRecurso.enlace, deleted_at: null },
      }),
    ]);

    return {
      total_pdf,
      total_video,
      total_enlace,
      storage_used: 0, // Integración MinIO futura
    };
  }
}
