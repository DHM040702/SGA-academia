import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { FilterAlumnosDto } from './dto/filter-alumnos.dto';
import { VincularApoderadoDto } from './dto/vincular-apoderado.dto';

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
  constructor(
    private prisma: PrismaService,
    private minio:  MinioService,
  ) {}

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

    // ── Cálculo de asistencia en batch ────────────────────────────
    // Una sola query para todos los alumnos de la página — evita el
    // problema de pg "client already executing a query" que ocurría
    // con Promise.all + distinct por relación.
    const alumnoIds = items.map((a) => a.id);

    const asistPerAlumno: Record<string, Set<string>> = {};
    const fechasPorAula:  Record<string, Set<string>> = {};

    if (alumnoIds.length > 0) {
      const rows = await this.prisma.asistencia.findMany({
        where: { alumnoId: { in: alumnoIds }, tipoPersona: 'alumno' },
        select: { alumnoId: true, fecha: true },
      });

      for (const r of rows) {
        if (!r.alumnoId) continue;          // alumnoId es nullable en el schema
        const key = r.fecha.toISOString().split('T')[0];

        if (!asistPerAlumno[r.alumnoId]) asistPerAlumno[r.alumnoId] = new Set();
        asistPerAlumno[r.alumnoId].add(key);

        // Agrupar por aula para calcular el denominador
        const alumno = items.find((a) => a.id === r.alumnoId);
        if (alumno?.aulaId) {
          if (!fechasPorAula[alumno.aulaId]) fechasPorAula[alumno.aulaId] = new Set();
          fechasPorAula[alumno.aulaId].add(key);
        }
      }
    }

    const enriched = items.map((a) => {
      const diasAlumno = asistPerAlumno[a.id]?.size ?? 0;
      const diasAula   = a.aulaId ? (fechasPorAula[a.aulaId]?.size ?? diasAlumno) : diasAlumno;
      const pct        = diasAula > 0 ? Math.round((diasAlumno / diasAula) * 100) : 100;
      return {
        ...a,
        nombres:        a.nombre,
        codigo_barra:   a.codigoBarras,
        asistencia_pct: pct,
        estado:         estadoFromPct(pct),
      };
    });

    const filtered = (dto as any).estado
      ? enriched.filter((a) => a.estado === (dto as any).estado)
      : enriched;

    return paginate(filtered, total, page, limit);
  }

  async findOne(id: string) {
    // ── Query principal ───────────────────────────────────────────
    // Incluye aula.horarios para mostrar los cursos del alumno.
    const alumno = await this.prisma.alumno.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuario: { select: { email: true, activo: true, rol: true } },
        aula: {
          include: {
            ciclo: true,
            horarios: {
              include: {
                curso:   { select: { id: true, nombre: true, codigo: true } },
                docente: { select: { id: true, nombre: true, apellidos: true } },
              },
              orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
            },
          },
        },
        carrera: { select: { id: true, nombre: true, area: true } },
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

    // ── Cálculo de asistencia secuencial ─────────────────────────
    // Se ejecutan en serie para evitar que pg reciba queries
    // concurrentes sobre el mismo cliente (deprecation warning).

    const asistenciasAlumno = await this.prisma.asistencia.findMany({
      where: { alumnoId: alumno.id, tipoPersona: 'alumno' },
      select: { fecha: true },
    });
    const diasAlumno = new Set(
      asistenciasAlumno.map((x) => x.fecha.toISOString().split('T')[0]),
    ).size;

    let diasAula = diasAlumno;
    if (alumno.aulaId) {
      // Obtener IDs de compañeros de aula y luego sus fechas —
      // evita el filtro por relación que causaba el problema con distinct.
      const companeros = await this.prisma.alumno.findMany({
        where: { aulaId: alumno.aulaId, deletedAt: null },
        select: { id: true },
      });
      const companeroIds = companeros.map((c) => c.id);
      const fechasAula = await this.prisma.asistencia.findMany({
        where: { alumnoId: { in: companeroIds }, tipoPersona: 'alumno' },
        select: { fecha: true },
      });
      diasAula = new Set(fechasAula.map((x) => x.fecha.toISOString().split('T')[0])).size;
    }

    const pct = diasAula > 0 ? Math.round((diasAlumno / diasAula) * 100) : 100;

    return {
      ...alumno,
      nombres:          alumno.nombre,
      codigo_barra:     alumno.codigoBarras,
      fecha_nacimiento: alumno.fechaNacimiento?.toISOString().split('T')[0] ?? null,
      created_at:       alumno.createdAt.toISOString(),
      asistencia_pct:   pct,
      estado:           estadoFromPct(pct),
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
          email:        dto.email,
          passwordHash: hash,
          rol:          Rol.alumno,
          // El DNI del alumno también sirve como DNI de acceso al sistema
          dni:          dto.dni,
        },
      });

      const alumno = await tx.alumno.create({
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
          aula:    { include: { ciclo: true, horarios: { include: { curso: true, docente: true } } } },
          carrera: { select: { id: true, nombre: true, area: true } },
        },
      });

      // ── Vincular/crear apoderado en la misma transacción ─────────
      if (dto.apoderado) {
        const { accion, parentesco, es_principal = true } = dto.apoderado;
        let apoderadoId: string;

        if (accion === 'nuevo') {
          if (!dto.apoderado.nuevo) throw new BadRequestException('Datos del nuevo apoderado requeridos');
          const { nombre, apellidos, dni: apDni, telefono_whatsapp, email: apEmail, password: apPassword } = dto.apoderado.nuevo;

          const emailAp = await tx.usuario.findFirst({ where: { email: apEmail } });
          if (emailAp) throw new BadRequestException('Ya existe un usuario con ese email para el apoderado');

          const dniAp = await tx.apoderado.findFirst({ where: { dni: apDni } });
          if (dniAp) throw new BadRequestException('Ya existe un apoderado con ese DNI');

          const apHash = await bcrypt.hash(apPassword, 12);
          const usuarioAp = await tx.usuario.create({
            data: { email: apEmail, passwordHash: apHash, rol: Rol.apoderado, dni: apDni },
          });
          const ap = await tx.apoderado.create({
            data: { usuarioId: usuarioAp.id, nombre, apellidos, dni: apDni, telefonoWhatsapp: telefono_whatsapp },
          });
          apoderadoId = ap.id;

        } else {
          if (!dto.apoderado.apoderado_id) throw new BadRequestException('ID del apoderado requerido');
          const ap = await tx.apoderado.findFirst({ where: { id: dto.apoderado.apoderado_id } });
          if (!ap) throw new NotFoundException('Apoderado no encontrado');

          // Verificar que no esté ya vinculado
          const linkExistente = await tx.alumnoApoderado.findFirst({
            where: { alumnoId: alumno.id, apoderadoId: dto.apoderado.apoderado_id },
          });
          if (linkExistente) throw new BadRequestException('El apoderado ya está vinculado a este alumno');

          apoderadoId = dto.apoderado.apoderado_id;
        }

        // Si será el principal, quitar el flag de los demás
        if (es_principal) {
          await tx.alumnoApoderado.updateMany({
            where: { alumnoId: alumno.id, esPrincipal: true },
            data: { esPrincipal: false },
          });
        }

        await tx.alumnoApoderado.create({
          data: { alumnoId: alumno.id, apoderadoId, parentesco, esPrincipal: es_principal },
        });
      }

      return alumno;
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
          ...(rest.nombres           && { nombre:          rest.nombres }),
          ...(rest.apellidos         && { apellidos:        rest.apellidos }),
          ...(rest.dni               && { dni:              rest.dni }),
          ...(rest.fecha_nacimiento  && { fechaNacimiento:  new Date(rest.fecha_nacimiento) }),
          ...(rest.telefono  !== undefined && { telefono:   rest.telefono }),
          ...(rest.aula_id   !== undefined && { aulaId:     rest.aula_id }),
          ...(rest.carrera_id !== undefined && { carreraId: rest.carrera_id }),
        },
        include: {
          usuario: { select: { email: true } },
          aula:    { include: { ciclo: true, horarios: { include: { curso: true, docente: true } } } },
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

  // ── Gestión de vínculos alumno ↔ apoderado ───────────────────────

  async getApoderados(alumnoId: string) {
    await this.findOne(alumnoId); // valida existencia
    return this.prisma.alumnoApoderado.findMany({
      where: { alumnoId },
      include: {
        apoderado: {
          include: { usuario: { select: { id: true, email: true, activo: true } } },
        },
      },
      orderBy: { esPrincipal: 'desc' },
    });
  }

  async vincularApoderado(alumnoId: string, dto: VincularApoderadoDto) {
    await this.findOne(alumnoId);
    const { accion, parentesco, es_principal = false } = dto;

    return this.prisma.$transaction(async (tx) => {
      let apoderadoId: string;

      if (accion === 'nuevo') {
        if (!dto.nuevo) throw new BadRequestException('Datos del nuevo apoderado requeridos');
        const { nombre, apellidos, dni, telefono_whatsapp, email, password } = dto.nuevo;

        const emailAp = await tx.usuario.findFirst({ where: { email } });
        if (emailAp) throw new BadRequestException('Ya existe un usuario con ese email');

        const dniAp = await tx.apoderado.findFirst({ where: { dni } });
        if (dniAp) throw new BadRequestException('Ya existe un apoderado con ese DNI');

        const apHash = await bcrypt.hash(password, 12);
        const usuarioAp = await tx.usuario.create({
          data: { email, passwordHash: apHash, rol: Rol.apoderado, dni },
        });
        const ap = await tx.apoderado.create({
          data: { usuarioId: usuarioAp.id, nombre, apellidos, dni, telefonoWhatsapp: telefono_whatsapp },
        });
        apoderadoId = ap.id;

      } else {
        if (!dto.apoderado_id) throw new BadRequestException('ID del apoderado requerido');
        const ap = await tx.apoderado.findFirst({ where: { id: dto.apoderado_id } });
        if (!ap) throw new NotFoundException('Apoderado no encontrado');
        apoderadoId = dto.apoderado_id;
      }

      // Verificar que no exista el vínculo
      const existing = await tx.alumnoApoderado.findFirst({ where: { alumnoId, apoderadoId } });
      if (existing) throw new BadRequestException('El apoderado ya está vinculado a este alumno');

      // Si es principal, quitar el flag de los demás
      if (es_principal) {
        await tx.alumnoApoderado.updateMany({
          where: { alumnoId, esPrincipal: true },
          data: { esPrincipal: false },
        });
      }

      return tx.alumnoApoderado.create({
        data: { alumnoId, apoderadoId, parentesco, esPrincipal: es_principal },
        include: {
          apoderado: {
            include: { usuario: { select: { id: true, email: true, activo: true } } },
          },
        },
      });
    });
  }

  async desvincularApoderado(alumnoId: string, apoderadoId: string) {
    const link = await this.prisma.alumnoApoderado.findFirst({ where: { alumnoId, apoderadoId } });
    if (!link) throw new NotFoundException('Vínculo no encontrado');
    await this.prisma.alumnoApoderado.delete({
      where: { alumnoId_apoderadoId: { alumnoId, apoderadoId } },
    });
    return { success: true };
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

  /** Mapa (nombre_aula_lower|turno) → aulaId para el controller de importación */
  async getAulaMap(): Promise<Map<string, string>> {
    const aulas = await this.prisma.aula.findMany({
      select: { id: true, nombre: true, turno: true },
    });
    const map = new Map<string, string>();
    for (const a of aulas) {
      map.set(`${a.nombre.toLowerCase()}|${a.turno}`, a.id);
    }
    return map;
  }

  /* ── Foto de perfil ──────────────────────────────────────── */

  /**
   * Sube o reemplaza la foto del alumno.
   * La foto anterior en MinIO se sobreescribe (misma clave).
   */
  async subirFoto(id: string, file: Express.Multer.File): Promise<{ foto_url: string }> {
    if (!file) throw new BadRequestException('No se proporcionó archivo');

    const alumno = await this.prisma.alumno.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    const url = await this.minio.subirFoto('alumnos', id, file.buffer, file.mimetype);

    await this.prisma.alumno.update({
      where: { id },
      data:  { fotoUrl: url },
    });

    return { foto_url: url };
  }

  /** Elimina la foto del alumno (pone fotoUrl en null) */
  async eliminarFoto(id: string): Promise<{ ok: boolean }> {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, fotoUrl: true },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    if (alumno.fotoUrl) {
      await this.minio.eliminarFotoPorUrl(alumno.fotoUrl);
      await this.prisma.alumno.update({ where: { id }, data: { fotoUrl: null } });
    }

    return { ok: true };
  }
}
