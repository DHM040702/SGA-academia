import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoPersona } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import type { RegisterScanDto } from './dto/register-scan.dto';
import type { ManualCorrectionDto } from './dto/manual-correction.dto';
import type { FilterAsistenciaDto } from './dto/filter-asistencia.dto';
import type { CreateManualAsistenciaDto } from './dto/create-manual-asistencia.dto';
import type { CerrarTurnoDto } from './dto/cerrar-turno.dto';
import type { JustificarAusenciaDto } from './dto/justificar-ausencia.dto';

@Injectable()
export class AsistenciaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra asistencia por escaneo de código de barras.
   * - 6 dígitos numéricos → alumno (por codigoBarras)
   * - 8 dígitos → docente (por DNI)
   */
  async scan(dto: RegisterScanDto, registradoPorId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const esAlumno = /^\d{6}$/.test(dto.codigo);
    const tipoPersona: TipoPersona = esAlumno ? TipoPersona.alumno : TipoPersona.docente;

    let alumnoId: string | undefined;
    let docenteId: string | undefined;

    if (esAlumno) {
      const alumno = await this.prisma.alumno.findFirst({
        where: { codigoBarras: dto.codigo, deletedAt: null },
      });
      if (!alumno) throw new NotFoundException(`Alumno con código ${dto.codigo} no encontrado`);
      alumnoId = alumno.id;
    } else {
      const docente = await this.prisma.docente.findFirst({
        where: { dni: dto.codigo, deletedAt: null },
      });
      if (!docente) throw new NotFoundException(`Docente con DNI ${dto.codigo} no encontrado`);
      docenteId = docente.id;
    }

    // Verificar si ya existe registro del día
    const existente = await this.prisma.asistencia.findFirst({
      where: {
        tipoPersona,
        ...(alumnoId  ? { alumnoId }  : {}),
        ...(docenteId ? { docenteId } : {}),
        fecha: today,
      },
      include: {
        alumno:  { select: { nombre: true, apellidos: true, codigoBarras: true, aula: { select: { id: true, nombre: true } } } },
        docente: { select: { nombre: true, apellidos: true, dni: true } },
      },
    });
    if (existente) return existente;

    // Determinar tardanza usando TurnoConfig (horaLimitePuntual del turno del aula).
    // Si no hay config activa para el turno, el registro se asume puntual (false).
    let esTardanza = false;
    if (alumnoId) {
      const alumno = await this.prisma.alumno.findUnique({
        where: { id: alumnoId },
        include: { aula: { select: { turno: true } } },
      });
      if (alumno?.aula?.turno) {
        const config = await this.prisma.turnoConfig.findUnique({
          where: { turno: alumno.aula.turno },
        });
        if (config?.activo) {
          const limite = config.horaLimitePuntual;
          const limiteMs = limite.getUTCHours() * 3_600_000 + limite.getUTCMinutes() * 60_000;
          const ahoraMs  = now.getHours() * 3_600_000 + now.getMinutes() * 60_000;
          esTardanza = ahoraMs > limiteMs;
        }
      }
    }

    return this.prisma.asistencia.create({
      data: {
        tipoPersona,
        alumnoId:        alumnoId  ?? null,
        docenteId:       docenteId ?? null,
        fecha:           today,
        horaIngreso:     now,
        esTardanza,
        esManual:        false,
        registradoPorId,
      },
      include: {
        alumno:  {
          select: {
            nombre: true, apellidos: true, codigoBarras: true,
            aula: { select: { id: true, nombre: true } },
          },
        },
        docente: { select: { nombre: true, apellidos: true, dni: true } },
      },
    });
  }

  async createManual(dto: CreateManualAsistenciaDto, registradoPorId: string) {
    if (dto.tipo_persona === TipoPersona.alumno) {
      if (!dto.alumno_id) throw new BadRequestException('alumno_id es requerido para tipo alumno');
      const alumno = await this.prisma.alumno.findFirst({ where: { id: dto.alumno_id, deletedAt: null } });
      if (!alumno) throw new NotFoundException('Alumno no encontrado');
    } else {
      if (!dto.docente_id) throw new BadRequestException('docente_id es requerido para tipo docente');
      const docente = await this.prisma.docente.findFirst({ where: { id: dto.docente_id, deletedAt: null } });
      if (!docente) throw new NotFoundException('Docente no encontrado');
    }

    const [year, month, day] = dto.fecha.split('-').map(Number);
    const fechaDate   = new Date(year, month - 1, day);
    const [hh, mm]    = dto.hora_llegada.split(':').map(Number);
    const horaIngreso = new Date(year, month - 1, day, hh, mm, 0);

    const existente = await this.prisma.asistencia.findFirst({
      where: {
        tipoPersona: dto.tipo_persona,
        ...(dto.alumno_id  ? { alumnoId:  dto.alumno_id  } : {}),
        ...(dto.docente_id ? { docenteId: dto.docente_id } : {}),
        fecha: fechaDate,
      },
    });
    if (existente) throw new BadRequestException('Ya existe un registro de asistencia para esta persona en esa fecha');

    return this.prisma.asistencia.create({
      data: {
        tipoPersona:    dto.tipo_persona,
        alumnoId:       dto.alumno_id  ?? null,
        docenteId:      dto.docente_id ?? null,
        fecha:          fechaDate,
        horaIngreso,
        esTardanza:     dto.es_tardanza  ?? false,
        esManual:       true,
        motivoManual:   dto.observacion  ?? null,
        registradoPorId,
      },
      include: {
        alumno:  { select: { nombre: true, apellidos: true, codigoBarras: true, aula: { select: { id: true, nombre: true } } } },
        docente: { select: { nombre: true, apellidos: true, dni: true } },
      },
    });
  }

  async findAll(dto: FilterAsistenciaDto) {
    const { page = 1, limit = 20, fecha, aula_id, alumno_id, docente_id, tipo } = dto as any;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (fecha) {
      // Use Date.UTC to avoid timezone offset shifting the date when server != UTC
      const [y, m, d] = fecha.split('-').map(Number);
      where.fecha = new Date(Date.UTC(y, m - 1, d));
    }
    if (tipo) where.tipoPersona = tipo;
    if (alumno_id) where.alumnoId = alumno_id;
    if (docente_id) where.docenteId = docente_id;
    if (aula_id) {
      where.alumno = { aulaId: aula_id };
    }

    const [items, total] = await Promise.all([
      this.prisma.asistencia.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ fecha: 'desc' }, { horaIngreso: 'asc' }],
        include: {
          alumno:  {
            select: {
              nombre: true, apellidos: true, codigoBarras: true,
              aula: { select: { id: true, nombre: true } },
            },
          },
          docente: { select: { nombre: true, apellidos: true, dni: true } },
        },
      }),
      this.prisma.asistencia.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findByAlumno(alumnoId: string, limit = 50) {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id: alumnoId, deletedAt: null },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    return this.prisma.asistencia.findMany({
      where: { alumnoId, tipoPersona: TipoPersona.alumno },
      orderBy: { fecha: 'desc' },
      take: limit,
    });
  }

  async corregir(id: string, dto: ManualCorrectionDto, registradoPorId: string) {
    const registro = await this.prisma.asistencia.findFirst({ where: { id } });
    if (!registro) throw new NotFoundException('Registro de asistencia no encontrado');

    let horaIngreso: Date | undefined;
    if (dto.hora_llegada) {
      const [hh, mm] = dto.hora_llegada.split(':').map(Number);
      const d = new Date(registro.fecha);
      d.setHours(hh, mm, 0, 0);
      horaIngreso = d;
    }

    return this.prisma.asistencia.update({
      where: { id },
      data: {
        esTardanza:   dto.es_tardanza ?? registro.esTardanza,
        motivoManual: dto.observacion ?? registro.motivoManual,
        ...(horaIngreso ? { horaIngreso } : {}),
        esManual: true,
        registradoPorId,
      },
      include: {
        alumno:  {
          select: {
            nombre: true, apellidos: true, codigoBarras: true,
            aula: { select: { id: true, nombre: true } },
          },
        },
        docente: { select: { nombre: true, apellidos: true, dni: true } },
      },
    });
  }

  async stats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [presentes, tardanzas, ausentes, docentesHoy, totalMatriculados] = await Promise.all([
      // Presentes: asistieron a tiempo y NO están marcados como ausentes
      this.prisma.asistencia.count({
        where: { fecha: today, tipoPersona: TipoPersona.alumno, esTardanza: false, esAusente: false },
      }),
      // Tardanzas: llegaron pero fuera de hora
      this.prisma.asistencia.count({
        where: { fecha: today, tipoPersona: TipoPersona.alumno, esTardanza: true },
      }),
      // Ausentes: registros de falta (generados por cerrarTurno)
      this.prisma.asistencia.count({
        where: { fecha: today, tipoPersona: TipoPersona.alumno, esAusente: true },
      }),
      // Docentes con algún registro hoy
      this.prisma.asistencia.count({
        where: { fecha: today, tipoPersona: TipoPersona.docente },
      }),
      // Total matriculados activos en el sistema
      this.prisma.alumno.count({ where: { deletedAt: null } }),
    ]);

    const total_asistieron = presentes + tardanzas;
    // Alumnos sin ningún registro hoy (ni asistencia ni falta cerrada)
    const sin_registro = Math.max(0, totalMatriculados - total_asistieron - ausentes);
    const pct_asistencia = totalMatriculados > 0
      ? Math.round((total_asistieron / totalMatriculados) * 100)
      : 0;

    return {
      presentes,
      tardanzas,
      ausentes,
      sin_registro,
      total_alumno: totalMatriculados,
      pct_asistencia,
      docentes_hoy: docentesHoy,
    };
  }

  async remove(id: string) {
    const registro = await this.prisma.asistencia.findFirst({ where: { id } });
    if (!registro) throw new NotFoundException('Registro de asistencia no encontrado');
    return this.prisma.asistencia.delete({ where: { id } });
  }

  async cerrarTurno(dto: CerrarTurnoDto, registradoPorId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Verificar que el turno ya haya finalizado según TurnoConfig
    const config = await this.prisma.turnoConfig.findUnique({ where: { turno: dto.turno } });
    if (config?.activo) {
      const finMs  = config.horaFin.getUTCHours() * 3_600_000 + config.horaFin.getUTCMinutes() * 60_000;
      const ahoraMs = now.getHours() * 3_600_000 + now.getMinutes() * 60_000;
      if (ahoraMs < finMs) {
        const hh = String(config.horaFin.getUTCHours()).padStart(2, '0');
        const mm = String(config.horaFin.getUTCMinutes()).padStart(2, '0');
        const label = dto.turno === 'manana' ? 'mañana' : 'tarde';
        throw new BadRequestException(
          `El turno ${label} no ha finalizado. Podrás cerrar a partir de las ${hh}:${mm}.`,
        );
      }
    }

    const alumnos = await this.prisma.alumno.findMany({
      where: { deletedAt: null, aula: { turno: dto.turno } },
      select: { id: true },
    });

    const existentes = await this.prisma.asistencia.findMany({
      where: { fecha: today, tipoPersona: TipoPersona.alumno },
      select: { alumnoId: true },
    });
    const yaRegistrados = new Set(existentes.map((e) => e.alumnoId));

    const ausentes = alumnos.filter((a) => !yaRegistrados.has(a.id));
    if (ausentes.length === 0) {
      return { created: 0, message: 'Todos los alumnos ya tienen registro hoy' };
    }

    await this.prisma.asistencia.createMany({
      data: ausentes.map((a) => ({
        tipoPersona:    TipoPersona.alumno,
        alumnoId:       a.id,
        fecha:          today,
        horaIngreso:    now,
        esTardanza:     false,
        esManual:       true,
        esAusente:      true,
        registradoPorId,
      })),
    });

    return { created: ausentes.length, message: `${ausentes.length} ausencia(s) registrada(s)` };
  }

  async justificar(id: string, dto: JustificarAusenciaDto) {
    const registro = await this.prisma.asistencia.findFirst({ where: { id } });
    if (!registro) throw new NotFoundException('Registro de asistencia no encontrado');

    return this.prisma.asistencia.update({
      where: { id },
      data: { justificacionRazon: dto.razon, justificacionDoc: dto.doc_num ?? null },
      include: {
        alumno:  { select: { nombre: true, apellidos: true, codigoBarras: true, aula: { select: { id: true, nombre: true } } } },
        docente: { select: { nombre: true, apellidos: true, dni: true } },
      },
    });
  }
}
