import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { FilterDocentesDto } from './dto/filter-docentes.dto';

@Injectable()
export class DocentesService {
  constructor(
    private prisma: PrismaService,
    private minio:  MinioService,
  ) {}

  async findAll(dto: FilterDocentesDto) {
    const { page = 1, limit = 20, q, curso_id, activo, ciclo_id } = dto as any;
    const skip = (page - 1) * limit;

    const searchWhere = q
      ? {
          OR: [
            { nombre:    { contains: q, mode: 'insensitive' as const } },
            { apellidos: { contains: q, mode: 'insensitive' as const } },
            { dni:       { contains: q } },
          ],
        }
      : {};

    // NO se filtra la LISTA por ciclo (los docentes siguen visibles aunque no
    // tengan horario ese semestre); lo que cambia por ciclo son sus cursos y
    // secciones mostrados (ver el `where` del include de horarios más abajo).
    const cursoWhere  = curso_id ? { horarios: { some: { cursoId: curso_id } } } : {};
    const activoWhere = activo !== undefined ? { usuario: { activo } } : {};

    const where = {
      deletedAt: null,
      ...searchWhere,
      ...cursoWhere,
      ...activoWhere,
    };

    const [items, total] = await Promise.all([
      this.prisma.docente.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
        include: {
          usuario: { select: { id: true, email: true, activo: true, rol: true } },
          horarios: {
            // Los cursos/secciones mostrados son los del ciclo seleccionado.
            where: ciclo_id ? { aula: { cicloId: ciclo_id } } : undefined,
            include: {
              curso:   { select: { id: true, nombre: true, codigo: true } },
              aula: { select: { id: true, nombre: true } },
            },
          },
        },
      }),
      this.prisma.docente.count({ where }),
    ]);

    const firmados = await Promise.all(
      items.map(async (d) => ({ ...d, fotoUrl: (await this.minio.presign(d.fotoUrl)) ?? d.fotoUrl })),
    );

    return paginate(firmados, total, page, limit);
  }

  async findOne(id: string) {
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const docente = await this.prisma.docente.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuario: { select: { id: true, email: true, activo: true, rol: true } },
        horarios: {
          include: {
            curso:   { select: { id: true, nombre: true, codigo: true } },
            aula: { select: { id: true, nombre: true } },
          },
        },
        asistencias: {
          where: { fecha: { gte: treintaDiasAtras } },
          orderBy: { fecha: 'desc' },
          take: 30,
        },
      },
    });

    if (!docente) throw new NotFoundException('Docente no encontrado');
    return { ...docente, fotoUrl: (await this.minio.presign(docente.fotoUrl)) ?? docente.fotoUrl };
  }

  async create(dto: CreateDocenteDto) {
    const existingDni = await this.prisma.docente.findFirst({
      where: { dni: dto.dni, deletedAt: null },
    });
    if (existingDni) throw new BadRequestException('Ya existe un docente con ese DNI');

    // El correo es opcional (no se reparten correos): si no viene, se genera a
    // partir del DNI, con la misma convención que alumnos/apoderados.
    const email = dto.email && /^\S+@\S+\.\S+$/.test(dto.email)
      ? dto.email
      : `doc.${dto.dni}@academia.edu`;

    const existingEmail = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
    });
    if (existingEmail) throw new BadRequestException('Ya existe un usuario con ese email');

    // Contraseña temporal = DNI (cambio obligatorio al primer ingreso)
    const hash = await bcrypt.hash(dto.password || dto.dni, 12);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          email,
          passwordHash: hash,
          rol: Rol.docente,
          // El DNI del docente también sirve como DNI de acceso al sistema
          dni: dto.dni,
        },
      });

      return tx.docente.create({
        data: {
          usuarioId:        usuario.id,
          nombre:           dto.nombres,
          apellidos:        dto.apellidos,
          dni:              dto.dni,
          telefonoWhatsapp: dto.telefono,
          especialidad:     dto.especialidad,
        },
        include: { usuario: { select: { id: true, email: true, activo: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateDocenteDto) {
    await this.findOne(id);
    type DocenteFields = { dni?: string; nombres?: string; apellidos?: string; telefono?: string; especialidad?: string };
    const { password, email, ...rest } = dto as DocenteFields & { password?: string; email?: string };

    return this.prisma.$transaction(async (tx) => {
      const docente = await tx.docente.findFirst({ where: { id } });
      if (!docente) throw new NotFoundException('Docente no encontrado');

      if (email || password) {
        const userUpdate: Record<string, unknown> = {};
        if (email) {
          const emailExists = await tx.usuario.findFirst({
            where: { email, deletedAt: null, NOT: { id: docente.usuarioId } },
          });
          if (emailExists) throw new BadRequestException('Ese email ya está en uso');
          userUpdate.email = email;
        }
        if (password) userUpdate.passwordHash = await bcrypt.hash(password, 12);
        await tx.usuario.update({ where: { id: docente.usuarioId }, data: userUpdate });
      }

      if (rest.dni) {
        const dniExists = await tx.docente.findFirst({
          where: { dni: rest.dni, deletedAt: null, NOT: { id } },
        });
        if (dniExists) throw new BadRequestException('Ya existe un docente con ese DNI');
      }

      return tx.docente.update({
        where: { id },
        data: {
          ...(rest.nombres      !== undefined && { nombre:           rest.nombres }),
          ...(rest.apellidos    !== undefined && { apellidos:         rest.apellidos }),
          ...(rest.dni          !== undefined && { dni:               rest.dni }),
          ...(rest.telefono     !== undefined && { telefonoWhatsapp:  rest.telefono }),
          ...(rest.especialidad !== undefined && { especialidad:      rest.especialidad }),
        },
        include: { usuario: { select: { id: true, email: true, activo: true } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const docente = await tx.docente.update({
        where: { id },
        data: { deletedAt: now },
      });
      await tx.usuario.update({
        where: { id: docente.usuarioId },
        data: { activo: false, deletedAt: now },
      });
      return { success: true };
    });
  }

  /* ── Foto de perfil ──────────────────────────────────────── */

  /** Sube o reemplaza la foto del docente */
  async subirFoto(id: string, file: Express.Multer.File): Promise<{ foto_url: string }> {
    if (!file) throw new BadRequestException('No se proporcionó archivo');

    const docente = await this.prisma.docente.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!docente) throw new NotFoundException('Docente no encontrado');

    const url = await this.minio.subirFoto('docentes', id, file.buffer, file.mimetype);

    await this.prisma.docente.update({
      where: { id },
      data:  { fotoUrl: url },
    });

    return { foto_url: (await this.minio.presign(url)) ?? url };
  }

  /** Elimina la foto del docente (pone fotoUrl en null) */
  async eliminarFoto(id: string): Promise<{ ok: boolean }> {
    const docente = await this.prisma.docente.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, fotoUrl: true },
    });
    if (!docente) throw new NotFoundException('Docente no encontrado');

    if (docente.fotoUrl) {
      await this.minio.eliminarFotoPorUrl(docente.fotoUrl);
      await this.prisma.docente.update({ where: { id }, data: { fotoUrl: null } });
    }

    return { ok: true };
  }
}
