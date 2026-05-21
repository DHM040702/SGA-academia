import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { FilterAlumnosDto } from './dto/filter-alumnos.dto';

/** Estado derivado del porcentaje de asistencia */
function estadoFromPct(pct: number): string {
  if (pct >= 85) return 'activo';
  if (pct >= 75) return 'observado';
  return 'riesgo';
}

/** Genera código de barras de 6 dígitos único */
async function nextCodigo(prisma: PrismaService): Promise<string> {
  const last = await prisma.alumno.findFirst({
    orderBy: { codigoBarras: 'desc' },
    select: { codigoBarras: true },
  });
  const next = last ? parseInt(last.codigoBarras) + 1 : 100001;
  return String(next).padStart(6, '0');
}

@Injectable()
export class AlumnosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterAlumnosDto) {
    const { page = 1, limit = 20, q, ciclo_id, aula_id } = dto as any;
    const skip = (page - 1) * limit;

    const searchWhere = q
      ? {
          OR: [
            { nombre:       { contains: q, mode: 'insensitive' as const } },
            { apellidos:    { contains: q, mode: 'insensitive' as const } },
            { codigoBarras: { contains: q } },
            { dni:          { contains: q } },
          ],
        }
      : {};

    const aulaWhere  = aula_id  ? { aulaId: aula_id } : {};
    const cicloWhere = ciclo_id ? { aula: { cicloId: ciclo_id } } : {};

    const where = {
      deletedAt: null,
      ...searchWhere,
      ...aulaWhere,
      ...cicloWhere,
    };

    const [items, total] = await Promise.all([
      this.prisma.alumno.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
        include: {
          usuario: { select: { email: true, activo: true, rol: true } },
          aula:    { include: { ciclo: { select: { id: true, nombre: true } } } },
          carrera: { select: { id: true, nombre: true, area: true } },
        },
      }),
      this.prisma.alumno.count({ where }),
    ]);

    // Calcula % asistencia: días con registro / días con al menos un registro en el aula
    const enriched = await Promise.all(
      items.map(async (a) => {
        const asistencias = await this.prisma.asistencia.findMany({
          where: { alumnoId: a.id, tipoPersona: 'alumno' },
          select: { fecha: true },
        });
        const diasAlumno = new Set(
          asistencias.map((x) => x.fecha.toISOString().split('T')[0]),
        ).size;

        let diasAula = diasAlumno;
        if (a.aulaId) {
          const aulaAsist = await this.prisma.asistencia.findMany({
            where: { tipoPersona: 'alumno', alumno: { aulaId: a.aulaId } },
            select: { fecha: true },
            distinct: ['fecha'],
          });
          diasAula = aulaAsist.length;
        }

        const pct = diasAula > 0 ? Math.round((diasAlumno / diasAula) * 100) : 100;
        return {
          ...a,
          nombres: a.nombre,
          codigo_barra: a.codigoBarras,
          asistencia_pct: pct,
          estado: estadoFromPct(pct),
        };
      }),
    );

    const filtered = (dto as any).estado
      ? enriched.filter((a) => a.estado === (dto as any).estado)
      : enriched;

    return paginate(filtered, total, page, limit);
  }

  async findOne(id: string) {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuario:  { select: { email: true, activo: true, rol: true } },
        aula:     { include: { ciclo: true } },
        carrera:  { select: { id: true, nombre: true, area: true } },
        apoderados: {
          where: { apoderado: { deletedAt: null } },
          include: { apoderado: { include: { usuario: { select: { email: true } } } } },
        },
        asistencias: {
          orderBy: { fecha: 'desc' },
          take: 30,
        },
      },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    const asistencias = await this.prisma.asistencia.findMany({
      where: { alumnoId: alumno.id, tipoPersona: 'alumno' },
      select: { fecha: true },
    });
    const diasAlumno = new Set(
      asistencias.map((x) => x.fecha.toISOString().split('T')[0]),
    ).size;
    let diasAula = diasAlumno;
    if (alumno.aulaId) {
      const aulaAsist = await this.prisma.asistencia.findMany({
        where: { tipoPersona: 'alumno', alumno: { aulaId: alumno.aulaId } },
        select: { fecha: true },
        distinct: ['fecha'],
      });
      diasAula = aulaAsist.length;
    }
    const pct = diasAula > 0 ? Math.round((diasAlumno / diasAula) * 100) : 100;

    return {
      ...alumno,
      nombres: alumno.nombre,
      codigo_barra: alumno.codigoBarras,
      fecha_nacimiento: alumno.fechaNacimiento?.toISOString().split('T')[0] ?? null,
      created_at: alumno.createdAt.toISOString(),
      asistencia_pct: pct,
      estado: estadoFromPct(pct),
    };
  }

  async create(dto: CreateAlumnoDto) {
    const existing = await this.prisma.alumno.findFirst({
      where: { dni: dto.dni, deletedAt: null },
    });
    if (existing) throw new BadRequestException('Ya existe un alumno con ese DNI');

    const hash = await bcrypt.hash(dto.password, 12);
    const codigoBarras = await nextCodigo(this.prisma);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email,
          passwordHash: hash,
          rol: Rol.alumno,
        },
      });

      return tx.alumno.create({
        data: {
          usuarioId:       usuario.id,
          nombre:          dto.nombres,
          apellidos:       dto.apellidos,
          dni:             dto.dni,
          codigoBarras,
          fechaNacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
          telefono:        dto.telefono,
          aulaId:          dto.aula_id,
          carreraId:       dto.carrera_id,
        },
        include: {
          usuario: { select: { email: true } },
          aula:    true,
          carrera: { select: { id: true, nombre: true, area: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateAlumnoDto) {
    await this.findOne(id);
    const { password, email, ...rest } = dto as any;

    return this.prisma.$transaction(async (tx) => {
      const alumno = await tx.alumno.findFirst({ where: { id } });
      if (email || password) {
        const userUpdate: any = {};
        if (email) userUpdate.email = email;
        if (password) userUpdate.passwordHash = await bcrypt.hash(password, 12);
        await tx.usuario.update({ where: { id: alumno!.usuarioId }, data: userUpdate });
      }

      return tx.alumno.update({
        where: { id },
        data: {
          ...(rest.nombres          && { nombre:          rest.nombres }),
          ...(rest.apellidos        && { apellidos:        rest.apellidos }),
          ...(rest.dni              && { dni:              rest.dni }),
          ...(rest.fecha_nacimiento && { fechaNacimiento:  new Date(rest.fecha_nacimiento) }),
          ...(rest.telefono  !== undefined && { telefono:  rest.telefono }),
          ...(rest.aula_id   !== undefined && { aulaId:    rest.aula_id }),
          ...(rest.carrera_id !== undefined && { carreraId: rest.carrera_id }),
        },
        include: {
          usuario: { select: { email: true } },
          aula:    true,
          carrera: { select: { id: true, nombre: true, area: true } },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const alumno = await tx.alumno.update({
        where: { id },
        data: { deletedAt: now },
      });
      await tx.usuario.update({
        where: { id: alumno.usuarioId },
        data: { activo: false, deletedAt: now },
      });
      return { success: true };
    });
  }

  async importar(rows: CreateAlumnoDto[]) {
    const results = { ok: 0, errores: [] as { fila: number; msg: string }[] };
    for (let i = 0; i < rows.length; i++) {
      try {
        await this.create(rows[i]);
        results.ok++;
      } catch (e: any) {
        results.errores.push({ fila: i + 1, msg: e.message });
      }
    }
    return results;
  }
}
