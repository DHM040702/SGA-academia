import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

/** Genera código de 6 dígitos numérico único */
async function nextCodigo(prisma: PrismaService): Promise<string> {
  const last = await prisma.alumno.findFirst({
    orderBy: { codigo_barra: 'desc' },
    select: { codigo_barra: true },
  });
  const next = last ? parseInt(last.codigo_barra) + 1 : 100001;
  return String(next).padStart(6, '0');
}

@Injectable()
export class AlumnosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterAlumnosDto) {
    const { page = 1, limit = 20, q, ciclo_id, seccion_id } = dto;
    const skip = (page - 1) * limit;

    // Construye condición de búsqueda de texto
    const searchWhere = q
      ? {
          OR: [
            { nombres: { contains: q, mode: 'insensitive' as const } },
            { apellidos: { contains: q, mode: 'insensitive' as const } },
            { codigo_barra: { contains: q } },
            { dni: { contains: q } },
          ],
        }
      : {};

    const sectionWhere = seccion_id ? { seccion_id } : {};
    const cicloWhere = ciclo_id ? { seccion: { ciclo_id } } : {};

    const where = {
      deleted_at: null,
      ...searchWhere,
      ...sectionWhere,
      ...cicloWhere,
    };

    const [items, total] = await Promise.all([
      this.prisma.alumno.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        include: {
          usuario: { select: { email: true, activo: true, rol: true } },
          seccion: { include: { ciclo: { select: { id: true, nombre: true } } } },
        },
      }),
      this.prisma.alumno.count({ where }),
    ]);

    // Calcula % asistencia y estado para cada alumno
    const enriched = await Promise.all(
      items.map(async (a) => {
        const total_sesiones = await this.prisma.asistencia.count({
          where: { alumno_id: a.id, deleted_at: null },
        });
        const presentes = await this.prisma.asistencia.count({
          where: {
            alumno_id: a.id,
            deleted_at: null,
            estado: { in: ['presente', 'tardanza', 'justificado'] },
          },
        });
        const pct = total_sesiones > 0 ? Math.round((presentes / total_sesiones) * 100) : 100;
        return { ...a, asistencia_pct: pct, estado: estadoFromPct(pct) };
      }),
    );

    // Filtro por estado (post-cálculo)
    const filtered = dto.estado
      ? enriched.filter((a) => a.estado === dto.estado)
      : enriched;

    return paginate(filtered, total, page, limit);
  }

  async findOne(id: string) {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id, deleted_at: null },
      include: {
        usuario: { select: { email: true, activo: true, rol: true } },
        seccion: { include: { ciclo: true } },
        apoderados: {
          where: { deleted_at: null },
          include: { apoderado: { include: { usuario: { select: { email: true } } } } },
        },
        asistencias: {
          where: { deleted_at: null },
          orderBy: { fecha: 'desc' },
          take: 30,
        },
      },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');
    return alumno;
  }

  async create(dto: CreateAlumnoDto) {
    // Verifica DNI único
    const existing = await this.prisma.alumno.findFirst({
      where: { dni: dto.dni, deleted_at: null },
    });
    if (existing) throw new BadRequestException('Ya existe un alumno con ese DNI');

    const hash = await bcrypt.hash(dto.password, 12);
    const codigo_barra = await nextCodigo(this.prisma);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email,
          password_hash: hash,
          rol: 'alumno',
        },
      });

      return tx.alumno.create({
        data: {
          usuario_id: usuario.id,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          dni: dto.dni,
          codigo_barra,
          fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
          telefono: dto.telefono,
          seccion_id: dto.seccion_id,
        },
        include: { usuario: { select: { email: true } }, seccion: true },
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
        if (password) userUpdate.password_hash = await bcrypt.hash(password, 12);
        await tx.usuario.update({ where: { id: alumno!.usuario_id }, data: userUpdate });
      }

      return tx.alumno.update({
        where: { id },
        data: {
          ...(rest.nombres && { nombres: rest.nombres }),
          ...(rest.apellidos && { apellidos: rest.apellidos }),
          ...(rest.dni && { dni: rest.dni }),
          ...(rest.fecha_nacimiento && { fecha_nacimiento: new Date(rest.fecha_nacimiento) }),
          ...(rest.telefono !== undefined && { telefono: rest.telefono }),
          ...(rest.seccion_id !== undefined && { seccion_id: rest.seccion_id }),
        },
        include: { usuario: { select: { email: true } }, seccion: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const alumno = await tx.alumno.update({
        where: { id },
        data: { deleted_at: now },
      });
      await tx.usuario.update({
        where: { id: alumno.usuario_id },
        data: { activo: false, deleted_at: now },
      });
      return { success: true };
    });
  }

  /** Importación masiva desde Excel (array de filas ya parseadas) */
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
