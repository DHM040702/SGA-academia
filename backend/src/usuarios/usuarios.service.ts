import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import type { UpdateUsuarioDto } from './dto/update-usuario.dto';
import type { FilterUsuariosDto } from './dto/filter-usuarios.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  rol: true,
  nombre: true,
  apellidos: true,
  dni: true,
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
    if (rol) where.rol = rol;
    if (search) {
      where.OR = [
        { email:     { contains: search, mode: 'insensitive' } },
        { nombre:    { contains: search, mode: 'insensitive' } },
        { apellidos: { contains: search, mode: 'insensitive' } },
        { dni:       { contains: search } },
        // Buscar también en perfil de apoderado
        { apoderado: { OR: [
          { nombre:    { contains: search, mode: 'insensitive' } },
          { apellidos: { contains: search, mode: 'insensitive' } },
          { dni:       { contains: search } },
        ]}},
      ];
    }

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
    // Verificar email (incluyendo soft-deleted para respetar la restricción única de BD)
    const emailExists = await this.prisma.usuario.findFirst({
      where: { email: dto.email },
    });
    if (emailExists) {
      const msg = emailExists.deletedAt
        ? 'Ya existe un usuario eliminado con ese email. Contacta al administrador para reactivarlo.'
        : 'Ya existe un usuario con ese email';
      throw new BadRequestException(msg);
    }

    // Verificar DNI único en la tabla usuarios (si se proporciona)
    const dniLogin = dto.rol === Rol.apoderado ? dto.perfil?.dni : dto.dni;
    if (dniLogin) {
      const dniExistsUsuario = await this.prisma.usuario.findFirst({
        where: { dni: dniLogin },
      });
      if (dniExistsUsuario) throw new BadRequestException('Ya existe un usuario con ese DNI');
    }

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

    // Verificar DNI único para apoderado en tabla apoderados
    if (dto.rol === Rol.apoderado && dto.perfil) {
      const dniExists = await this.prisma.apoderado.findFirst({
        where: { dni: dto.perfil.dni },
      });
      if (dniExists) throw new BadRequestException('Ya existe un apoderado con ese DNI');
    }

    try {
      // Apoderado: crear usuario + perfil en una transacción
      if (dto.rol === Rol.apoderado && dto.perfil) {
        // Contraseña temporal = DNI (cambio obligatorio al primer ingreso)
        const passwordHash = await bcrypt.hash(dto.password || dto.perfil.dni, 10);
        return await this.prisma.$transaction(async (tx) => {
          const usuario = await tx.usuario.create({
            data: {
              email:     dto.email,
              passwordHash,
              rol:       Rol.apoderado,
              activo:    dto.activo ?? true,
              // El DNI de ingreso del apoderado coincide con su DNI personal
              dni:       dto.perfil!.dni,
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

      // Admin, director, vigilante: usuario con nombre/apellidos/dni opcionales
      if (!dto.password && !dto.dni) {
        throw new BadRequestException('Debe indicar el DNI: se usa como contraseña temporal');
      }
      // Contraseña temporal = DNI (cambio obligatorio al primer ingreso)
      const passwordHash = await bcrypt.hash(dto.password || dto.dni!, 10);
      return await this.prisma.usuario.create({
        data: {
          email:        dto.email,
          passwordHash,
          rol:          dto.rol,
          activo:       dto.activo ?? true,
          nombre:       dto.nombre    ?? null,
          apellidos:    dto.apellidos ?? null,
          dni:          dto.dni       ?? null,
        },
        select: SAFE_SELECT,
      });
    } catch (err: any) {
      // Capturar violación de unicidad que se escapó del check previo (race condition)
      if (err?.code === 'P2002') {
        throw new BadRequestException('Ya existe un usuario con ese email');
      }
      throw err;
    }
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
        where: { email: dto.email, id: { not: id } },
      });
      if (dup) throw new BadRequestException('Ya existe otro usuario con ese email');
      data.email = dto.email;
    }

    if (dto.dni !== undefined) {
      const dupDni = await this.prisma.usuario.findFirst({
        where: { dni: dto.dni, id: { not: id } },
      });
      if (dupDni) throw new BadRequestException('Ya existe otro usuario con ese DNI');
      data.dni = dto.dni;
    }

    if (dto.password  !== undefined) data.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.rol       !== undefined) data.rol          = dto.rol;
    if (dto.activo    !== undefined) data.activo       = dto.activo;
    if (dto.nombre    !== undefined) data.nombre       = dto.nombre;
    if (dto.apellidos !== undefined) data.apellidos    = dto.apellidos;

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

        // Sincronizar usuarios.dni cuando el DNI del perfil apoderado cambia
        if (dto.perfil?.dni !== undefined && data.dni === undefined) {
          await tx.usuario.update({ where: { id }, data: { dni: dto.perfil.dni } });
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

  /** Alumnos vinculados a un usuario apoderado */
  async getAlumnosByApoderado(userId: string) {
    const apoderado = await this.prisma.apoderado.findFirst({
      where: { usuarioId: userId },
    });
    if (!apoderado) throw new NotFoundException('Perfil de apoderado no encontrado para este usuario');

    return this.prisma.alumnoApoderado.findMany({
      where: { apoderadoId: apoderado.id },
      include: {
        alumno: {
          include: {
            aula:    { include: { ciclo: { select: { id: true, nombre: true } } } },
            carrera: { select: { id: true, nombre: true, area: true } },
          },
        },
      },
      orderBy: { esPrincipal: 'desc' },
    });
  }

  /**
   * Restablece la contraseña de un usuario a su número de DNI y obliga a cambiarla
   * en el próximo inicio de sesión. Solo lo ejecuta un administrador (controller).
   */
  async resetPassword(id: string) {
    const u = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, dni: true },
    });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (!u.dni) {
      throw new BadRequestException('El usuario no tiene DNI para usarlo como contraseña temporal');
    }

    const hash = await bcrypt.hash(u.dni, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash: hash, debeCambiarPassword: true },
    });

    // Revocar sesiones activas para forzar reingreso con la contraseña temporal
    try {
      await this.prisma.$executeRaw`DELETE FROM refresh_tokens WHERE usuario_id = ${id}::uuid`;
    } catch { /* tabla aún no creada — ignorar */ }

    return { ok: true, mensaje: 'Contraseña restablecida al DNI; el usuario deberá cambiarla al ingresar' };
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
