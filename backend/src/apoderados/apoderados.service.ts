import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { FilterApoderadosDto } from './dto/filter-apoderados.dto';
import { UpdateApoderadoDto } from './dto/update-apoderado.dto';

@Injectable()
export class ApoderadosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterApoderadosDto) {
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { nombre:           { contains: search, mode: 'insensitive' } },
        { apellidos:        { contains: search, mode: 'insensitive' } },
        { dni:              { contains: search } },
        { telefonoWhatsapp: { contains: search } },
        { usuario: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.apoderado.findMany({
        where, skip, take: limit,
        orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
        select: {
          id: true, nombre: true, apellidos: true, dni: true, telefonoWhatsapp: true, createdAt: true,
          usuario: { select: { email: true, activo: true } },
          _count: { select: { alumnos: true } },
        },
      }),
      this.prisma.apoderado.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const apoderado = await this.prisma.apoderado.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, nombre: true, apellidos: true, dni: true, telefonoWhatsapp: true, createdAt: true,
        usuario: { select: { id: true, email: true, activo: true } },
        alumnos: {
          where: { alumno: { deletedAt: null } },
          orderBy: { esPrincipal: 'desc' },
          select: {
            parentesco: true,
            esPrincipal: true,
            alumno: {
              select: {
                id: true, nombre: true, apellidos: true, codigoBarras: true, dni: true,
                aula: {
                  select: {
                    nombre: true, turno: true, area: true,
                    ciclo: { select: { nombre: true, activo: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
    return apoderado;
  }

  async update(id: string, dto: UpdateApoderadoDto) {
    await this.findOne(id);
    return this.prisma.apoderado.update({
      where: { id },
      data: {
        ...(dto.nombre            !== undefined && { nombre:           dto.nombre }),
        ...(dto.apellidos         !== undefined && { apellidos:        dto.apellidos }),
        ...(dto.telefono_whatsapp !== undefined && { telefonoWhatsapp: dto.telefono_whatsapp }),
      },
      select: {
        id: true, nombre: true, apellidos: true, dni: true, telefonoWhatsapp: true,
        usuario: { select: { email: true, activo: true } },
        _count: { select: { alumnos: true } },
      },
    });
  }
}
