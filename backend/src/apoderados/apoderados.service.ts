import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { FilterApoderadosDto } from './dto/filter-apoderados.dto';
import { UpdateApoderadoDto } from './dto/update-apoderado.dto';
import { CreateApoderadoDto } from './dto/create-apoderado.dto';

@Injectable()
export class ApoderadosService {
  constructor(private prisma: PrismaService) {}

  /** Crea la cuenta de usuario (rol apoderado) + el perfil del apoderado. */
  async create(dto: CreateApoderadoDto) {
    const emailExists = await this.prisma.usuario.findFirst({ where: { email: dto.email } });
    if (emailExists) {
      throw new BadRequestException(
        emailExists.deletedAt
          ? 'Ya existe un usuario eliminado con ese email.'
          : 'Ya existe un usuario con ese email',
      );
    }
    const dniUsuario = await this.prisma.usuario.findFirst({ where: { dni: dto.dni } });
    if (dniUsuario) throw new BadRequestException('Ya existe un usuario con ese DNI');
    const dniApod = await this.prisma.apoderado.findFirst({ where: { dni: dto.dni } });
    if (dniApod) throw new BadRequestException('Ya existe un apoderado con ese DNI');

    const passwordHash = await bcrypt.hash(dto.password || dto.dni, 10);
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { email: dto.email, passwordHash, rol: Rol.apoderado, activo: true, dni: dto.dni },
      });
      return tx.apoderado.create({
        data: {
          usuarioId:        usuario.id,
          nombre:           dto.nombre,
          apellidos:        dto.apellidos,
          dni:              dto.dni,
          telefonoWhatsapp: dto.telefono_whatsapp,
        },
        select: {
          id: true, nombre: true, apellidos: true, dni: true, telefonoWhatsapp: true,
          usuario: { select: { email: true, activo: true } },
          _count: { select: { alumnos: true } },
        },
      });
    });
  }

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

  /** Elimina el apoderado: quita sus vínculos, lo marca como borrado y desactiva su cuenta. */
  async remove(id: string) {
    const ap = await this.prisma.apoderado.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, usuarioId: true },
    });
    if (!ap) throw new NotFoundException('Apoderado no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.alumnoApoderado.deleteMany({ where: { apoderadoId: id } });
      await tx.apoderado.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.usuario.update({
        where: { id: ap.usuarioId },
        data: { activo: false, deletedAt: new Date() },
      });
    });
    return { success: true };
  }
}
