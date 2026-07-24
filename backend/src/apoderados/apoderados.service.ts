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
    // El correo es opcional (no se reparten correos): si no viene, se genera a
    // partir del DNI del apoderado (misma convención que el resto del sistema).
    const email = dto.email && /^\S+@\S+\.\S+$/.test(dto.email)
      ? dto.email
      : `apo.${dto.dni}@academia.edu`;

    const emailExists = await this.prisma.usuario.findFirst({ where: { email } });
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
        data: { email, passwordHash, rol: Rol.apoderado, activo: true, dni: dto.dni },
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
    const { page = 1, limit = 20, search, ciclo_id } = dto as any;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    // Scope por ciclo: apoderados con al menos un pupilo en un aula de ese ciclo.
    if (ciclo_id) {
      where.alumnos = { some: { alumno: { deletedAt: null, aula: { cicloId: ciclo_id } } } };
    }
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
    const ap = await this.prisma.apoderado.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, usuarioId: true },
    });
    if (!ap) throw new NotFoundException('Apoderado no encontrado');

    // Si cambia el correo, verificar que no esté en uso por otra cuenta.
    if (dto.email !== undefined) {
      const otro = await this.prisma.usuario.findFirst({
        where: { email: dto.email, NOT: { id: ap.usuarioId } },
      });
      if (otro) throw new BadRequestException('Ya existe un usuario con ese email');
    }

    return this.prisma.$transaction(async (tx) => {
      // Datos de la cuenta (correo / estado)
      if (dto.email !== undefined || dto.activo !== undefined) {
        await tx.usuario.update({
          where: { id: ap.usuarioId },
          data: {
            ...(dto.email  !== undefined && { email:  dto.email }),
            ...(dto.activo !== undefined && { activo: dto.activo }),
          },
        });
      }
      // Perfil del apoderado
      return tx.apoderado.update({
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
    });
  }

  /** Restablece la contraseña de la cuenta del apoderado (fuerza cambio al ingresar). */
  async resetPassword(id: string, password: string) {
    const ap = await this.prisma.apoderado.findFirst({
      where: { id, deletedAt: null },
      select: { usuarioId: true },
    });
    if (!ap) throw new NotFoundException('Apoderado no encontrado');

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.usuario.update({
      where: { id: ap.usuarioId },
      data: { passwordHash, debeCambiarPassword: true },
    });
    // Cerrar sesiones activas por seguridad (si la tabla existe).
    try {
      await this.prisma.$executeRaw`DELETE FROM refresh_tokens WHERE usuario_id = ${ap.usuarioId}::uuid`;
    } catch { /* tabla aún no creada */ }
    return { success: true };
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
