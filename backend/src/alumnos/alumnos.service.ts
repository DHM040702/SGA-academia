import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import AdmZip from 'adm-zip';
import { Rol, Area, Turno, Prisma } from '@prisma/client';
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

/* ─── Import de semestre (CSV oficial de matrícula) ──────────────── */

/** "Área de Carrera" del CSV (número) → enum del sistema. */
const AREA_POR_NUMERO: Record<string, Area> = {
  '1': Area.ciencias,
  '2': Area.letras,
  '3': Area.medicas,
};

/** Prefijo de sección por área: ciencias=C, letras=L, medicas=M. */
const PREFIJO_AREA: Record<Area, string> = {
  ciencias: 'C',
  letras:   'L',
  medicas:  'M',
};

/**
 * Busca qué DNI(s) conocidos aparecen dentro del nombre de archivo de una foto.
 * El nombre oficial embebe el DNI entre otros dígitos (p. ej.
 * "030960522696432026-I29.jpg" contiene 60522696), así que se prueban todas las
 * ventanas de 8–12 dígitos de cada tramo numérico contra el padrón de DNIs.
 * Devolver más de uno significa que el archivo es ambiguo.
 */
function dnisEnNombre(nombre: string, dnis: Set<string>): string[] {
  const encontrados = new Set<string>();
  for (const tramo of nombre.match(/\d+/g) ?? []) {
    for (let len = 8; len <= 12; len++) {
      for (let i = 0; i + len <= tramo.length; i++) {
        const cand = tramo.slice(i, i + len);
        if (dnis.has(cand)) encontrados.add(cand);
      }
    }
  }
  return [...encontrados];
}

interface ImagenExtraida { nombre: string; data: Buffer }

// Import dinámico REAL (no transpilado a require por TS): funciona tanto si
// node-unrar-js es CommonJS como ESM-only, en un backend compilado a CJS.
const importESM = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

/**
 * Extrae las imágenes (.jpg/.jpeg/.png) de un archivo comprimido en memoria.
 * Soporta ZIP (adm-zip) y RAR (node-unrar-js, WASM). Ignora carpetas y basura
 * de macOS. El formato se detecta por la firma de bytes (RAR = "Rar!").
 */
async function extraerImagenes(buffer: Buffer): Promise<ImagenExtraida[]> {
  const esImagen = (n: string) =>
    /\.(jpe?g|png)$/i.test(n) && !n.split(/[\\/]/).some((p) => p === '__MACOSX');

  const esRar =
    buffer.length >= 4 &&
    buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 && buffer[3] === 0x21;

  if (esRar) {
    const { createExtractorFromData } = await importESM('node-unrar-js');
    // Copia el ArrayBuffer exacto (evita offsets del pool de Buffer de Node).
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const extractor = await createExtractorFromData({ data: ab });
    const extracted = extractor.extract();
    const out: ImagenExtraida[] = [];
    for (const f of extracted.files) {
      if (f.fileHeader.flags.directory || !f.extraction) continue;
      if (!esImagen(f.fileHeader.name)) continue;
      out.push({ nombre: f.fileHeader.name, data: Buffer.from(f.extraction) });
    }
    return out;
  }

  // ZIP por defecto.
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new BadRequestException('El archivo no es un ZIP ni un RAR válido');
  }
  return zip
    .getEntries()
    .filter((e) => !e.isDirectory && esImagen(e.entryName))
    .map((e) => ({ nombre: e.entryName, data: e.getData() }));
}

/** Fila ya normalizada del CSV oficial (el controller hace el parseo/limpieza). */
export interface SemestreImportRow {
  fila:               number;
  dni:                string;
  nombres:            string;
  apellidos:          string;
  codigoInscripcion?: string;
  telefono?:          string;
  email?:             string;
  area?:              Area;
  carrera?:           string;
  turno:              Turno;
  colegio?:           string;
  quinto?:            boolean;
  vecesMatriculado?:  number;
  fechaMatricula?:    string;
  apoderado?:         { nombre: string; apellidos: string };
  pago?: {
    tipoPago?:    string;
    banco?:       string;
    codigoCuota?: string;
    fechaCuota?:  string;
    monto?:       number;
  };
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

    const aulaWhere = aula_id ? { aulaId: aula_id } : {};

    // Scoping por ciclo: si se pide un ciclo explícito, ese; si no se pide ni
    // ciclo ni aula, se limita al SEMESTRE ACTIVO (los alumnos de semestres
    // cerrados no deben aparecer en el activo). Solo si no hay ciclo activo se
    // muestran todos (estado legado / sin semestre en curso).
    // estado=inactivo → listar alumnos dados de baja (soft-delete) para poder
    // reactivarlos. Se muestran solo a admin (control en el controller/frontend).
    const wantInactive = (dto as any).estado === 'inactivo';

    let cicloWhere: any = {};
    if (ciclo_id) {
      cicloWhere = { aula: { cicloId: ciclo_id } };
    } else if (!aula_id && !wantInactive) {
      // Para inactivos NO se limita al ciclo activo: un alumno dado de baja por
      // error puede pertenecer a cualquier semestre y debe poder encontrarse.
      const activo = await this.prisma.ciclo.findFirst({
        where: { activo: true },
        select: { id: true },
      });
      if (activo) cicloWhere = { aula: { cicloId: activo.id } };
    }

    const where = {
      deletedAt: wantInactive ? { not: null } : null,
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

    const enriched = await Promise.all(items.map(async (a) => {
      const diasAlumno = asistPerAlumno[a.id]?.size ?? 0;
      const diasAula   = a.aulaId ? (fechasPorAula[a.aulaId]?.size ?? diasAlumno) : diasAlumno;
      const pct        = diasAula > 0 ? Math.round((diasAlumno / diasAula) * 100) : 100;
      return {
        ...a,
        nombres:        a.nombre,
        codigo_barra:   a.codigoBarras,
        fotoUrl:        (await this.minio.presign(a.fotoUrl)) ?? a.fotoUrl,
        asistencia_pct: pct,
        estado:         wantInactive ? 'inactivo' : estadoFromPct(pct),
      };
    }));

    const filtered = ((dto as any).estado && !wantInactive)
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
      fotoUrl:          (await this.minio.presign(alumno.fotoUrl)) ?? alumno.fotoUrl,
      fecha_nacimiento: alumno.fechaNacimiento?.toISOString().split('T')[0] ?? null,
      created_at:       alumno.createdAt.toISOString(),
      asistencia_pct:   pct,
      estado:           estadoFromPct(pct),
    };
  }

  /**
   * Busca un alumno por DNI (incluye dados de baja) para autocompletar el
   * formulario de alta. Devuelve `{ encontrado }` y, si existe, sus datos.
   */
  async buscarPorDni(dni: string) {
    const limpio = String(dni ?? '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(limpio)) {
      throw new BadRequestException('DNI inválido (se esperan 8 dígitos)');
    }
    const alumno = await this.prisma.alumno.findFirst({
      where: { dni: limpio },
      include: {
        usuario: { select: { email: true } },
        aula:    { select: { id: true, nombre: true, ciclo: { select: { id: true, nombre: true } } } },
        carrera: { select: { id: true, nombre: true } },
        apoderados: {
          where: { apoderado: { deletedAt: null } },
          include: { apoderado: { include: { usuario: { select: { email: true } } } } },
          orderBy: { esPrincipal: 'desc' },
        },
      },
    });
    if (!alumno) return { encontrado: false as const };
    return {
      encontrado: true as const,
      activo:     !alumno.deletedAt, // false = dado de baja
      alumno: {
        id:               alumno.id,
        dni:              alumno.dni,
        nombres:          alumno.nombre,
        apellidos:        alumno.apellidos,
        codigo:           alumno.codigoBarras,
        genero:           alumno.genero ?? '',
        telefono:         alumno.telefono ?? '',
        email:            alumno.usuario?.email ?? '',
        colegio:          alumno.colegio ?? '',
        quinto:           alumno.quinto ?? null,
        fecha_nacimiento: alumno.fechaNacimiento ? alumno.fechaNacimiento.toISOString().slice(0, 10) : '',
        aula:             alumno.aula ?? null,
        carrera:          alumno.carrera ?? null,
        apoderados: alumno.apoderados.map((v) => ({
          id:          v.apoderado.id,
          nombre:      v.apoderado.nombre,
          apellidos:   v.apoderado.apellidos,
          dni:         v.apoderado.dni ?? '',
          email:       v.apoderado.usuario?.email ?? '',
          parentesco:  v.parentesco,
          es_principal: v.esPrincipal,
        })),
      },
    };
  }

  async create(dto: CreateAlumnoDto) {
    const existing = await this.prisma.alumno.findFirst({
      where: { dni: dto.dni, deletedAt: null },
    });
    if (existing) throw new BadRequestException('Ya existe un alumno con ese DNI');

    // Contraseña temporal = DNI (cambio obligatorio al primer ingreso)
    const hash = await bcrypt.hash(dto.password || dto.dni, 12);

    // Código de barras: el ingresado (validando unicidad) o autogenerado.
    let codigoBarras: string;
    if ((dto as any).codigo) {
      const codigo = String((dto as any).codigo);
      const choque = await this.prisma.alumno.findFirst({
        where: { codigoBarras: codigo },
        select: { dni: true },
      });
      if (choque) throw new BadRequestException(`El código ${codigo} ya lo usa el alumno con DNI ${choque.dni}`);
      codigoBarras = codigo;
    } else {
      codigoBarras = await nextCodigo(this.prisma);
    }

    // El correo es opcional (no se reparten correos): si no viene, se genera a
    // partir del código de barras, igual que en el import por semestre.
    const email = dto.email && /^\S+@\S+\.\S+$/.test(dto.email)
      ? dto.email
      : `${codigoBarras}@academia.edu`;

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          email,
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
          genero:          dto.genero ?? null,
          fechaNacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
          telefono:        dto.telefono,
          colegio:         dto.colegio ?? null,
          quinto:          dto.quinto ?? null,
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
        await this.vincularApoderadoEnTx(tx, alumno.id, dto.apoderado);
      }

      return alumno;
    });
  }

  /**
   * Crea (o reutiliza) y vincula un apoderado al alumno dentro de una
   * transacción. Reutilizado por create() y update() para no duplicar lógica.
   * El email del apoderado nuevo es opcional: si no viene, se autogenera.
   */
  private async vincularApoderadoEnTx(
    tx: Prisma.TransactionClient,
    alumnoId: string,
    ap: VincularApoderadoDto,
  ): Promise<void> {
    const { accion, parentesco, es_principal = true } = ap;
    let apoderadoId: string;

    if (accion === 'nuevo') {
      if (!ap.nuevo) throw new BadRequestException('Datos del nuevo apoderado requeridos');
      const { nombre, apellidos, dni: apDni, telefono_whatsapp, email: apEmail, password: apPassword } = ap.nuevo;

      const emailAp = apEmail && /^\S+@\S+\.\S+$/.test(apEmail)
        ? apEmail
        : `apo.${apDni}@academia.edu`;

      const emailEnUso = await tx.usuario.findFirst({ where: { email: emailAp } });
      if (emailEnUso) throw new BadRequestException('Ya existe un usuario con ese email para el apoderado');

      const dniAp = await tx.apoderado.findFirst({ where: { dni: apDni } });
      if (dniAp) throw new BadRequestException('Ya existe un apoderado con ese DNI');

      const apHash = await bcrypt.hash(apPassword, 12);
      const usuarioAp = await tx.usuario.create({
        data: { email: emailAp, passwordHash: apHash, rol: Rol.apoderado, dni: apDni },
      });
      const creado = await tx.apoderado.create({
        data: { usuarioId: usuarioAp.id, nombre, apellidos, dni: apDni, telefonoWhatsapp: telefono_whatsapp },
      });
      apoderadoId = creado.id;

    } else {
      if (!ap.apoderado_id) throw new BadRequestException('ID del apoderado requerido');
      const existe = await tx.apoderado.findFirst({ where: { id: ap.apoderado_id } });
      if (!existe) throw new NotFoundException('Apoderado no encontrado');

      const linkExistente = await tx.alumnoApoderado.findFirst({
        where: { alumnoId, apoderadoId: ap.apoderado_id },
      });
      if (linkExistente) throw new BadRequestException('El apoderado ya está vinculado a este alumno');

      apoderadoId = ap.apoderado_id;
    }

    // Si será el principal, quitar el flag de los demás.
    if (es_principal) {
      await tx.alumnoApoderado.updateMany({
        where: { alumnoId, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }

    await tx.alumnoApoderado.create({
      data: { alumnoId, apoderadoId, parentesco, esPrincipal: es_principal },
    });
  }

  async update(id: string, dto: UpdateAlumnoDto) {
    // Se usa findFirst (no findOne) para permitir actualizar/reactivar también a
    // los dados de baja (re-matrícula desde el formulario de alta por DNI).
    const alumno = await this.prisma.alumno.findFirst({ where: { id } });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');
    const { password, email, codigo, apoderado, ...rest } = dto as any;

    // Código: si viene, validar unicidad excluyendo a este mismo alumno.
    let codigoBarras: string | undefined;
    if (codigo) {
      const choque = await this.prisma.alumno.findFirst({
        where: { codigoBarras: String(codigo), id: { not: id } },
        select: { dni: true },
      });
      if (choque) throw new BadRequestException(`El código ${codigo} ya lo usa el alumno con DNI ${choque.dni}`);
      codigoBarras = String(codigo);
    }

    return this.prisma.$transaction(async (tx) => {
      if (email || password || alumno.deletedAt) {
        const userUpdate: any = {};
        if (email) userUpdate.email = email;
        if (password) userUpdate.passwordHash = await bcrypt.hash(password, 12);
        // Reactivar la cuenta si el alumno estaba dado de baja.
        if (alumno.deletedAt) { userUpdate.activo = true; userUpdate.deletedAt = null; }
        await tx.usuario.update({ where: { id: alumno.usuarioId }, data: userUpdate });
      }

      const actualizado = await tx.alumno.update({
        where: { id },
        data: {
          ...(rest.nombres           && { nombre:          rest.nombres }),
          ...(rest.apellidos         && { apellidos:        rest.apellidos }),
          ...(rest.dni               && { dni:              rest.dni }),
          ...(codigoBarras           && { codigoBarras }),
          ...(rest.genero    !== undefined && { genero:     rest.genero || null }),
          ...(rest.fecha_nacimiento  && { fechaNacimiento:  new Date(rest.fecha_nacimiento) }),
          ...(rest.telefono  !== undefined && { telefono:   rest.telefono }),
          ...(rest.colegio   !== undefined && { colegio:    rest.colegio || null }),
          ...(rest.quinto    !== undefined && { quinto:     rest.quinto }),
          ...(rest.aula_id   !== undefined && { aulaId:     rest.aula_id }),
          ...(rest.carrera_id !== undefined && { carreraId: rest.carrera_id }),
          ...(alumno.deletedAt ? { deletedAt: null } : {}),
        },
        include: {
          usuario: { select: { email: true } },
          aula:    { include: { ciclo: true, horarios: { include: { curso: true, docente: true } } } },
          carrera: { select: { id: true, nombre: true, area: true } },
        },
      });

      // Vincular/crear apoderado si el formulario lo envía (p. ej. al re-matricular
      // desde el alta por DNI se puede agregar un apoderado al alumno hallado).
      if (apoderado) {
        await this.vincularApoderadoEnTx(tx, id, apoderado);
      }

      return actualizado;
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

  /** Reactiva un alumno dado de baja (limpia soft-delete y reactiva su cuenta). */
  async restore(id: string) {
    const alumno = await this.prisma.alumno.findFirst({ where: { id } });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');
    if (!alumno.deletedAt) return { success: true }; // ya estaba activo
    return this.prisma.$transaction(async (tx) => {
      await tx.alumno.update({ where: { id }, data: { deletedAt: null } });
      await tx.usuario.update({
        where: { id: alumno.usuarioId },
        data: { activo: true, deletedAt: null },
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

        // El email del apoderado es opcional: si no viene, se autogenera.
        const emailAp = email && /^\S+@\S+\.\S+$/.test(email)
          ? email
          : `apo.${dni}@academia.edu`;

        const emailEnUso = await tx.usuario.findFirst({ where: { email: emailAp } });
        if (emailEnUso) throw new BadRequestException('Ya existe un usuario con ese email');

        const dniAp = await tx.apoderado.findFirst({ where: { dni } });
        if (dniAp) throw new BadRequestException('Ya existe un apoderado con ese DNI');

        const apHash = await bcrypt.hash(password, 12);
        const usuarioAp = await tx.usuario.create({
          data: { email: emailAp, passwordHash: apHash, rol: Rol.apoderado, dni },
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
    // `ok` = total de filas procesadas con éxito (creados + actualizados),
    // se mantiene por compatibilidad con el frontend; el desglose permite
    // distinguir altas nuevas de re-matrículas al ciclo activo.
    const results = {
      ok: 0,
      creados: 0,
      actualizados: 0,
      errores: [] as { fila: number; msg: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const dto = rows[i];
      try {
        // Sin aula no se puede matricular: el aulaMap ya está scopeado al
        // ciclo activo, así que un aula vacía significa que el AULA/TURNO del
        // Excel no existe en el ciclo en curso.
        if (!dto.aula_id) {
          throw new BadRequestException('Aula no encontrada en el ciclo activo (revisa AULA y TURNO)');
        }

        // El DNI es único global → un alumno que regresa YA existe (incluso si
        // fue dado de baja). En vez de rechazarlo, se re-matricula al aula del
        // ciclo activo. Esto desbloquea los portales del nuevo semestre.
        const existente = await this.prisma.alumno.findFirst({
          where: { dni: dto.dni },
        });

        if (existente) {
          await this.rematricular(existente.id, dto);
          results.actualizados++;
        } else {
          await this.create(dto);
          results.creados++;
        }
        results.ok++;
      } catch (e: any) {
        results.errores.push({ fila: i + 1, msg: e.message });
      }
    }
    return results;
  }

  /**
   * Re-matrícula: mueve un alumno existente al aula del ciclo activo.
   * Reactiva su cuenta si estaba dada de baja y refresca nombres si vienen
   * en el Excel (correcciones), pero NO toca email ni contraseña.
   */
  private async rematricular(id: string, dto: CreateAlumnoDto) {
    return this.prisma.$transaction(async (tx) => {
      const alumno = await tx.alumno.findUnique({ where: { id } });
      if (!alumno) throw new NotFoundException('Alumno no encontrado');

      await tx.alumno.update({
        where: { id },
        data: {
          aulaId:    dto.aula_id,
          deletedAt: null,
          ...(dto.nombres   && { nombre:    dto.nombres }),
          ...(dto.apellidos && { apellidos: dto.apellidos }),
        },
      });

      // Reactivar la cuenta de acceso por si el alumno estaba inactivo.
      await tx.usuario.update({
        where: { id: alumno.usuarioId },
        data:  { activo: true, deletedAt: null },
      });
    });
  }

  /**
   * Mapa (nombre_aula_lower|turno) → aulaId para el controller de importación.
   * Scopeado al CICLO ACTIVO: los nombres de aula (p. ej. "A-101") se repiten
   * entre ciclos, así que sin este filtro el Map resolvía al aula de un ciclo
   * viejo y los alumnos quedaban fuera del semestre en curso.
   */
  async getAulaMap(): Promise<Map<string, string>> {
    const activo = await this.prisma.ciclo.findFirst({
      where: { activo: true },
      select: { id: true },
    });
    const aulas = await this.prisma.aula.findMany({
      where: activo ? { cicloId: activo.id } : {},
      select: { id: true, nombre: true, turno: true },
    });
    const map = new Map<string, string>();
    for (const a of aulas) {
      map.set(`${a.nombre.toLowerCase()}|${a.turno}`, a.id);
    }
    return map;
  }

  /**
   * Importa alumnos desde el CSV oficial de matrícula de un semestre.
   * - Upsert por DNI (re-matricula a los que regresan; reactiva su cuenta).
   * - codigoBarras = "Código de Inscripción" (6 díg.); reporta colisiones.
   * - Upsert de carrera (nombre + área) y auto-distribución de aula por
   *   área+turno respetando el cupo (C-001, L-001, M-001…).
   * - Apoderado parcial con cuenta derivada del DNI del alumno (login "9"+DNI).
   * - Registra la cuota (tabla `pagos`).
   */
  async importarSemestre(rows: SemestreImportRow[]) {
    const activo = await this.prisma.ciclo.findFirst({
      where: { activo: true },
      select: { id: true },
    });
    if (!activo) {
      throw new BadRequestException('No hay un ciclo activo: activa el ciclo antes de importar.');
    }
    const cicloId = activo.id;

    const results = {
      ok: 0,
      creados: 0,
      actualizados: 0,
      apoderados: 0,
      pagos: 0,
      errores: [] as { fila: number; msg: string }[],
    };

    for (const row of rows) {
      try {
        if (!row.dni || !/^\d{8,12}$/.test(row.dni)) {
          throw new BadRequestException('DNI inválido (se esperan 8–12 dígitos)');
        }
        if (!row.area) {
          throw new BadRequestException('Área desconocida (se espera 1=ciencias, 2=letras, 3=medicas)');
        }

        // Código de barras = Código de Inscripción normalizado a 6 dígitos;
        // si no viene, se autogenera de forma secuencial.
        const codigo = row.codigoInscripcion
          ? String(row.codigoInscripcion).replace(/\D/g, '').padStart(6, '0').slice(-6)
          : await nextCodigo(this.prisma);

        // Contraseña temporal = DNI del alumno (misma para su cuenta y la del
        // apoderado). Se hashea fuera de la transacción para no alargarla.
        const hash = await bcrypt.hash(row.dni, 12);
        const email = row.email && /^\S+@\S+\.\S+$/.test(row.email)
          ? row.email
          : `${codigo}@academia.edu`;

        await this.prisma.$transaction(async (tx) => {
          // El código de inscripción debe ser único; si ya lo tiene OTRO alumno,
          // es un error de datos que se reporta por fila.
          const choque = await tx.alumno.findFirst({
            where: { codigoBarras: codigo, dni: { not: row.dni } },
            select: { dni: true },
          });
          if (choque) {
            throw new BadRequestException(`Código de inscripción ${codigo} ya usado por el DNI ${choque.dni}`);
          }

          const carreraId = await this.upsertCarreraTx(tx, row.carrera, row.area!);
          const existente = await tx.alumno.findFirst({ where: { dni: row.dni } });

          // Aula: si el alumno ya está en un aula del ciclo activo con la misma
          // área+turno, se conserva; si no, se auto-distribuye.
          const aulaId = await this.resolverAulaTx(tx, cicloId, row.area!, row.turno, existente?.aulaId ?? null);

          const fechaMat = row.fechaMatricula ? new Date(row.fechaMatricula) : undefined;

          let alumnoId: string;
          if (existente) {
            await tx.alumno.update({
              where: { id: existente.id },
              data: {
                nombre:            row.nombres || existente.nombre,
                apellidos:         row.apellidos || existente.apellidos,
                codigoBarras:      codigo,
                telefono:          row.telefono ?? existente.telefono,
                aulaId,
                carreraId:         carreraId ?? existente.carreraId,
                colegio:           row.colegio ?? existente.colegio,
                quinto:            row.quinto ?? existente.quinto,
                vecesMatriculado:  row.vecesMatriculado ?? existente.vecesMatriculado,
                codigoInscripcion: row.codigoInscripcion ?? existente.codigoInscripcion,
                ...(fechaMat ? { fechaMatricula: fechaMat } : {}),
                deletedAt:         null,
              },
            });
            await tx.usuario.update({
              where: { id: existente.usuarioId },
              data:  { activo: true, deletedAt: null },
            });
            alumnoId = existente.id;
            results.actualizados++;
          } else {
            const usuario = await tx.usuario.create({
              data: { email, passwordHash: hash, rol: Rol.alumno, dni: row.dni },
            });
            const creado = await tx.alumno.create({
              data: {
                usuarioId:         usuario.id,
                dni:               row.dni,
                nombre:            row.nombres,
                apellidos:         row.apellidos,
                codigoBarras:      codigo,
                telefono:          row.telefono,
                aulaId,
                carreraId:         carreraId ?? undefined,
                colegio:           row.colegio,
                quinto:            row.quinto,
                vecesMatriculado:  row.vecesMatriculado,
                codigoInscripcion: row.codigoInscripcion,
                fechaMatricula:    fechaMat,
              },
              select: { id: true },
            });
            alumnoId = creado.id;
            results.creados++;
          }

          if (row.apoderado?.nombre) {
            const creado = await this.crearApoderadoParcialTx(tx, alumnoId, row.dni, hash, row.apoderado);
            if (creado) results.apoderados++;
          }

          if (row.pago && (row.pago.codigoCuota || row.pago.monto != null)) {
            const yaExiste = row.pago.codigoCuota
              ? await tx.pago.findFirst({ where: { alumnoId, codigoCuota: row.pago.codigoCuota } })
              : null;
            if (!yaExiste) {
              await tx.pago.create({
                data: {
                  alumnoId,
                  tipoPago:       row.pago.tipoPago,
                  bancoTesoreria: row.pago.banco,
                  codigoCuota:    row.pago.codigoCuota,
                  fechaCuota:     row.pago.fechaCuota ? new Date(row.pago.fechaCuota) : null,
                  monto:          row.pago.monto != null ? row.pago.monto : null,
                },
              });
              results.pagos++;
            }
          }
        });

        results.ok++;
      } catch (e: any) {
        results.errores.push({ fila: row.fila, msg: e?.message ?? 'Error desconocido' });
      }
    }

    return results;
  }

  /** Upsert de carrera por (nombre, área). Devuelve su id (o null si sin nombre). */
  private async upsertCarreraTx(
    tx: Prisma.TransactionClient, nombre: string | undefined, area: Area,
  ): Promise<string | null> {
    const n = (nombre ?? '').trim();
    if (!n) return null;
    const existe = await tx.carrera.findFirst({
      where: { nombre: { equals: n, mode: 'insensitive' }, area },
      select: { id: true },
    });
    if (existe) return existe.id;
    const nueva = await tx.carrera.create({ data: { nombre: n, area }, select: { id: true } });
    return nueva.id;
  }

  /**
   * Resuelve el aula del alumno: conserva la actual si ya es del ciclo activo y
   * coincide en área+turno; si no, auto-distribuye en la primera sección con
   * cupo (C-001, C-002…) creando la siguiente si todas están llenas.
   */
  private async resolverAulaTx(
    tx: Prisma.TransactionClient, cicloId: string, area: Area, turno: Turno, aulaActualId: string | null,
  ): Promise<string> {
    if (aulaActualId) {
      const actual = await tx.aula.findUnique({
        where: { id: aulaActualId },
        select: { cicloId: true, area: true, turno: true },
      });
      if (actual && actual.cicloId === cicloId && actual.area === area && actual.turno === turno) {
        return aulaActualId;
      }
    }

    const prefijo = PREFIJO_AREA[area];
    const aulas = await tx.aula.findMany({
      where: { cicloId, area, turno, nombre: { startsWith: `${prefijo}-` } },
      select: { id: true, nombre: true, cupoMaximo: true },
      orderBy: { nombre: 'asc' },
    });

    for (const a of aulas) {
      const ocupados = await tx.alumno.count({ where: { aulaId: a.id, deletedAt: null } });
      if (ocupados < a.cupoMaximo) return a.id;
    }

    // Todas llenas (o no existen): crear la siguiente sección con cupo 40.
    let maxNum = 0;
    for (const a of aulas) {
      const m = a.nombre.match(/-(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    const nombre = `${prefijo}-${String(maxNum + 1).padStart(3, '0')}`;
    const nueva = await tx.aula.create({
      data: { cicloId, nombre, area, turno, cupoMaximo: 40 },
      select: { id: true },
    });
    return nueva.id;
  }

  /**
   * Crea (o reutiliza) el apoderado parcial y lo vincula al alumno. La cuenta se
   * genera con login derivado del DNI del alumno ("9"+DNI) y contraseña = DNI del
   * alumno. Idempotente: en re-imports reutiliza usuario/apoderado/vínculo.
   * Devuelve true si creó un apoderado nuevo.
   */
  private async crearApoderadoParcialTx(
    tx: Prisma.TransactionClient,
    alumnoId: string,
    alumnoDni: string,
    hash: string,
    ap: { nombre: string; apellidos: string },
  ): Promise<boolean> {
    const loginDni = ('9' + alumnoDni).slice(0, 12); // login propio, numérico
    let usuarioAp = await tx.usuario.findFirst({ where: { dni: loginDni } });
    if (!usuarioAp) {
      usuarioAp = await tx.usuario.create({
        data: {
          email:        `apo.${alumnoDni}@academia.edu`,
          passwordHash: hash,
          rol:          Rol.apoderado,
          dni:          loginDni,
          nombre:       ap.nombre,
          apellidos:    ap.apellidos,
        },
      });
    }

    let apoderado = await tx.apoderado.findFirst({ where: { usuarioId: usuarioAp.id } });
    let creadoNuevo = false;
    if (!apoderado) {
      apoderado = await tx.apoderado.create({
        data: {
          usuarioId:        usuarioAp.id,
          nombre:           ap.nombre,
          apellidos:        ap.apellidos,
          dni:              null,
          telefonoWhatsapp: null,
        },
      });
      creadoNuevo = true;
    }

    const vinculo = await tx.alumnoApoderado.findUnique({
      where: { alumnoId_apoderadoId: { alumnoId, apoderadoId: apoderado.id } },
    });
    if (!vinculo) {
      await tx.alumnoApoderado.create({
        data: { alumnoId, apoderadoId: apoderado.id, parentesco: 'Apoderado', esPrincipal: true },
      });
    }

    return creadoNuevo;
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

    return { foto_url: (await this.minio.presign(url)) ?? url };
  }

  /**
   * Carga masiva de fotos desde un ZIP. Cada imagen se asocia a su alumno por el
   * DNI embebido en el nombre del archivo (el nombre oficial lo incluye), se sube
   * a MinIO y se guarda en `fotoUrl`. Reporta las que no casan o son ambiguas.
   */
  async importarFotos(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se proporcionó archivo');

    const entradas = await extraerImagenes(file.buffer);
    if (!entradas.length) {
      throw new BadRequestException('El archivo no contiene imágenes (.jpg, .jpeg o .png)');
    }

    const alumnos = await this.prisma.alumno.findMany({
      where:  { deletedAt: null },
      select: { id: true, dni: true },
    });
    const porDni = new Map(alumnos.map((a) => [a.dni, a.id]));
    const dnis   = new Set(porDni.keys());

    const res = {
      procesados:      entradas.length,
      actualizados:    0,
      sinCoincidencia: [] as string[],
      ambiguos:        [] as string[],
      errores:         [] as { archivo: string; msg: string }[],
    };

    for (const e of entradas) {
      const archivo = e.nombre.split(/[\\/]/).pop() ?? e.nombre;
      try {
        const coincidencias = dnisEnNombre(archivo, dnis);
        if (coincidencias.length === 0) { res.sinCoincidencia.push(archivo); continue; }
        if (coincidencias.length > 1)   { res.ambiguos.push(archivo); continue; }

        const alumnoId = porDni.get(coincidencias[0])!;
        const mimetype = /\.png$/i.test(archivo) ? 'image/png' : 'image/jpeg';
        const url = await this.minio.subirFoto('alumnos', alumnoId, e.data, mimetype);
        await this.prisma.alumno.update({ where: { id: alumnoId }, data: { fotoUrl: url } });
        res.actualizados++;
      } catch (err: any) {
        res.errores.push({ archivo, msg: err?.message ?? 'Error al procesar la imagen' });
      }
    }

    return res;
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
