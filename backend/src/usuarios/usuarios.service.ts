import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import type { UpdateUsuarioDto } from './dto/update-usuario.dto';
import type { FilterUsuariosDto } from './dto/filter-usuarios.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  alumno:    { select: { id: true, nombre: true, apellidos: true } },
  docente:   { select: { id: true, nombre: true, apellidos: true } },
  apoderado: { select: { id: true, nombre: true, apellidos: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterUsuariosDto) {
    const { page = 1, limit = 20, rol, search } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (rol)    where.rol = rol;
    if (search) where.email = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const u = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
      select: SAFE_SELECT,
    });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  async create(dto: CreateUsuarioDto) {
    const exists = await this.prisma.usuario.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (exists) throw new BadRequestException('Ya existe un usuario con ese email');

    // Docentes y alumnos se crean a través de sus propios módulos
    if (dto.rol === Rol.docente || dto.rol === Rol.alumno) {
      throw new BadRequestException(
        `Los usuarios con rol "${dto.rol}" deben crearse desde el módulo de ${dto.rol}s`,
      );
    }

    // Apoderado requiere datos de perfil
    if (dto.rol === Rol.apoderado && !dto.perfil) {
      throw new BadRequestException('Los apoderados requieren datos de perfil (nombre, apellidos, DNI, teléfono)');
    }

    // Verificar DNI único para apoderado
    if (dto.rol === Rol.apoderado && dto.perfil) {
      const dniExists = await this.prisma.apoderado.findFirst({
        where: { dni: dto.perfil.dni },
      });
      if (dniExists) throw new BadRequestException('Ya existe un apoderado con ese DNI');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Apoderado: crear usuario + perfil en una transacción
    if (dto.rol === Rol.apoderado && dto.perfil) {
      return this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            email: dto.email,
            passwordHash,
            rol: Rol.apoderado,
            activo: dto.activo ?? true,
          },
        });

        await tx.apoderado.create({
          data: {
            usuarioId:        usuario.id,
            nombre:           dto.perfil!.nombre,
            apellidos:        dto.perfil!.apellidos,
            dni:              dto.perfil!.dni,
            telefonoWhatsapp: dto.perfil!.telefono_whatsapp,
          },
        });

        return tx.usuario.findUnique({ where: { id: usuario.id }, select: SAFE_SELECT });
      });
    }

    // Admin, director, vigilante: solo usuario
    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        passwordHash,
        rol: dto.rol,
        activo: dto.activo ?? true,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUsuarioDto, requesterId: string) {
    const u = await this.prisma.usuario.findFirst({ where: { id, deletedAt: null } });
    if (!u) throw new NotFoundException('Usuario no encontrado');

    // Un admin no puede desactivarse a sí mismo
    if (id === requesterId && dto.activo === false) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    const data: any = {};

    if (dto.email !== undefined) {
      const dup = await this.prisma.usuario.findFirst({
        where: { email: dto.email, deletedAt: null, id: { not: id } },
      });
      if (dup) throw new BadRequestException('Ya existe otro usuario con ese email');
      data.email = dto.email;
    }

    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.rol     !== undefined) data.rol    = dto.rol;
    if (dto.activo  !== undefined) data.activo = dto.activo;

    // Si hay datos de perfil de apoderado, actualizar en transacción
    if (dto.perfil && Object.keys(dto.perfil).length > 0) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.usuario.update({ where: { id }, data, select: SAFE_SELECT });

        const perfilData: any = {};
        if (dto.perfil!.nombre            !== undefined) perfilData.nombre           = dto.perfil!.nombre;
        if (dto.perfil!.apellidos         !== undefined) perfilData.apellidos        = dto.perfil!.apellidos;
        if (dto.perfil!.dni               !== undefined) perfilData.dni              = dto.perfil!.dni;
        if (dto.perfil!.telefono_whatsapp !== undefined) perfilData.telefonoWhatsapp = dto.perfil!.telefono_whatsapp;

        if (Object.keys(perfilData).length > 0) {
          await tx.apoderado.updateMany({ where: { usuarioId: id }, data: perfilData });
        }

        return updated;
      });
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    const u = await this.prisma.usuario.findFirst({ where: { id, deletedAt: null } });
    if (!u) throw new NotFoundException('Usuario no encontrado');

    // Soft-delete
    return this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
      select: SAFE_SELECT,
    });
  }
}
