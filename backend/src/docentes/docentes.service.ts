import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { FilterDocentesDto } from './dto/filter-docentes.dto';

@Injectable()
export class DocentesService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterDocentesDto) {
    const { page = 1, limit = 20, q, curso_id, activo } = dto;
    const skip = (page - 1) * limit;

    const searchWhere = q
      ? {
          OR: [
            { nombres: { contains: q, mode: 'insensitive' as const } },
            { apellidos: { contains: q, mode: 'insensitive' as const } },
            { dni: { contains: q } },
          ],
        }
      : {};

    const cursoWhere = curso_id
      ? { horarios: { some: { curso_id, deleted_at: null } } }
      : {};

    const activoWhere =
      activo !== undefined
        ? { usuario: { activo } }
        : {};

    const where = {
      deleted_at: null,
      ...searchWhere,
      ...cursoWhere,
      ...activoWhere,
    };

    const [items, total] = await Promise.all([
      this.prisma.docente.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        include: {
          usuario: { select: { id: true, email: true, activo: true, rol: true } },
          horarios: {
            where: { deleted_at: null },
            include: {
              curso: { select: { id: true, nombre: true, codigo: true } },
              seccion: { select: { id: true, nombre: true, aula: true } },
            },
          },
        },
      }),
      this.prisma.docente.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const docente = await this.prisma.docente.findFirst({
      where: { id, deleted_at: null },
      include: {
        usuario: { select: { id: true, email: true, activo: true, rol: true } },
        horarios: {
          where: { deleted_at: null },
          include: {
            curso: { select: { id: true, nombre: true, codigo: true } },
            seccion: { select: { id: true, nombre: true, aula: true } },
          },
        },
        asistencias: {
          where: {
            deleted_at: null,
            fecha: { gte: treintaDiasAtras },
          },
          orderBy: { fecha: 'desc' },
          take: 30,
        },
      },
    });

    if (!docente) throw new NotFoundException('Docente no encontrado');
    return docente;
  }

  async create(dto: CreateDocenteDto) {
    const existingDni = await this.prisma.docente.findFirst({
      where: { dni: dto.dni, deleted_at: null },
    });
    if (existingDni) {
      throw new BadRequestException('Ya existe un docente con ese DNI');
    }

    const existingEmail = await this.prisma.usuario.findFirst({
      where: { email: dto.email, deleted_at: null },
    });
    if (existingEmail) {
      throw new BadRequestException('Ya existe un usuario con ese email');
    }

    const hash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email,
          password_hash: hash,
          rol: 'docente',
        },
      });

      return tx.docente.create({
        data: {
          usuario_id: usuario.id,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          dni: dto.dni,
          telefono: dto.telefono,
          especialidad: dto.especialidad,
        },
        include: {
          usuario: { select: { id: true, email: true, activo: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateDocenteDto) {
    await this.findOne(id);
    const { password, email, ...rest } = dto as UpdateDocenteDto & { password?: string; email?: string };

    return this.prisma.$transaction(async (tx) => {
      const docente = await tx.docente.findFirst({ where: { id } });
      if (!docente) throw new NotFoundException('Docente no encontrado');

      if (email || password) {
        const userUpdate: Record<string, unknown> = {};
        if (email) {
          const emailExists = await tx.usuario.findFirst({
            where: { email, deleted_at: null, NOT: { id: docente.usuario_id } },
          });
          if (emailExists) throw new BadRequestException('Ese email ya está en uso');
          userUpdate.email = email;
        }
        if (password) {
          userUpdate.password_hash = await bcrypt.hash(password, 12);
        }
        await tx.usuario.update({ where: { id: docente.usuario_id }, data: userUpdate });
      }

      if (rest.dni) {
        const dniExists = await tx.docente.findFirst({
          where: { dni: rest.dni, deleted_at: null, NOT: { id } },
        });
        if (dniExists) throw new BadRequestException('Ya existe un docente con ese DNI');
      }

      return tx.docente.update({
        where: { id },
        data: {
          ...(rest.nombres !== undefined && { nombres: rest.nombres }),
          ...(rest.apellidos !== undefined && { apellidos: rest.apellidos }),
          ...(rest.dni !== undefined && { dni: rest.dni }),
          ...(rest.telefono !== undefined && { telefono: rest.telefono }),
          ...(rest.especialidad !== undefined && { especialidad: rest.especialidad }),
        },
        include: {
          usuario: { select: { id: true, email: true, activo: true } },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const docente = await tx.docente.update({
        where: { id },
        data: { deleted_at: now },
      });
      await tx.usuario.update({
        where: { id: docente.usuario_id },
        data: { activo: false, deleted_at: now },
      });
      return { success: true };
    });
  }
}
