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
import type { FilterInasistenciasDto } from './dto/filter-inasistencias.dto';

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
    // (cubre también horarios contiguos: el segundo scan del mismo día es ignorado)
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

    // ── Determinación de tardanza ─────────────────────────────────────────────
    // Alumnos: siempre "presente" al escanear (sin chequeo de horario por TurnoConfig).
    // Docentes: comparar hora de llegada con horaInicio de su primera clase del día.
    //   · Si llega después de horaInicio → tardanza.
    //   · Si llega antes o exactamente a tiempo → puntual.
    //   · Tolerancia de 5 minutos incluida.
    //   · Si no tiene horario hoy → presente por defecto.
    let esTardanza = false;

    if (docenteId) {
      // Día de la semana: 0=Dom → 7, 1=Lun → 1, …, 6=Sáb → 6
      const diaSemana = now.getDay() === 0 ? 7 : now.getDay();

      const horariosHoy = await this.prisma.horario.findMany({
        where:   { docenteId, diaSemana },
        orderBy: { horaInicio: 'asc' },
        select:  { horaInicio: true, horaFin: true },
      });

      if (horariosHoy.length > 0) {
        // Primera clase del día
        const primera = horariosHoy[0];
        const TOLERANCIA_MS = 5 * 60_000; // 5 minutos de margen

        const inicioMs =
          primera.horaInicio.getUTCHours()   * 3_600_000 +
          primera.horaInicio.getUTCMinutes() * 60_000;

        const ahoraMs =
          now.getHours()   * 3_600_000 +
          now.getMinutes() * 60_000;

        esTardanza = ahoraMs > inicioMs + TOLERANCIA_MS;
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

  async findAll(dto: FilterAsistenciaDto, caller?: { id: string; rol: string }) {
    const { page = 1, limit = 20, fecha, desde, hasta, aula_id, alumno_id, docente_id, tipo } = dto as any;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Use Date.UTC to avoid timezone offset shifting the date when server != UTC
    const toUtc = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    };

    if (fecha) {
      where.fecha = toUtc(fecha);
    } else if (desde || hasta) {
      where.fecha = {
        ...(desde && { gte: toUtc(desde) }),
        ...(hasta && { lte: toUtc(hasta) }),
      };
    }
    if (tipo) where.tipoPersona = tipo;
    if (docente_id) where.docenteId = docente_id;
    if (aula_id) {
      where.alumno = { aulaId: aula_id };
    }

    // ── Control de acceso por rol ────────────────────────────────────────────
    if (caller?.rol === 'alumno') {
      // El alumno solo puede ver su propia asistencia
      const alumno = await this.prisma.alumno.findFirst({
        where: { usuarioId: caller.id, deletedAt: null },
        select: { id: true },
      });
      if (!alumno) throw new NotFoundException('Alumno no encontrado');
      where.alumnoId = alumno.id;
      where.tipoPersona = TipoPersona.alumno;
    } else if (caller?.rol === 'apoderado') {
      // El apoderado solo puede ver la asistencia de sus pupilos
      const apoderado = await this.prisma.apoderado.findFirst({
        where: { usuarioId: caller.id, deletedAt: null },
        select: { alumnos: { select: { alumnoId: true } } },
      });
      const alumnoIds = apoderado?.alumnos.map((a) => a.alumnoId) ?? [];
      if (alumnoIds.length === 0) return { data: [], total: 0, page, limit, totalPages: 0 };
      // Si pasa un alumno_id específico, verificar que sea su pupilo
      if (alumno_id) {
        if (!alumnoIds.includes(alumno_id)) throw new NotFoundException('Alumno no encontrado');
        where.alumnoId = alumno_id;
      } else {
        where.alumnoId = { in: alumnoIds };
      }
      where.tipoPersona = TipoPersona.alumno;
    } else if (caller?.rol === 'docente') {
      // El docente ve SOLO: su propia asistencia (tipo=docente) o los alumnos
      // de las aulas a las que está asignado (vista, sin editar).
      const docente = await this.prisma.docente.findFirst({
        where: { usuarioId: caller.id, deletedAt: null },
        select: { id: true },
      });
      if (!docente) throw new NotFoundException('Docente no encontrado');

      if (tipo === TipoPersona.docente) {
        where.docenteId = docente.id;
        where.tipoPersona = TipoPersona.docente;
      } else {
        const horarios = await this.prisma.horario.findMany({
          where: { docenteId: docente.id },
          select: { aulaId: true },
        });
        const aulaIds = [...new Set(horarios.map((h) => h.aulaId))];
        where.tipoPersona = TipoPersona.alumno;
        if (aula_id) {
          // Solo puede filtrar por un aula que le pertenece.
          if (!aulaIds.includes(aula_id)) throw new NotFoundException('Aula no asignada al docente');
          where.alumno = { aulaId: aula_id };
        } else {
          where.alumno = { aulaId: { in: aulaIds } };
        }
      }
    } else {
      // admin, director, auxiliar: aplica filtro si viene en el query
      if (alumno_id) where.alumnoId = alumno_id;
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
              aula: { select: { id: true, nombre: true, area: true } },
            },
          },
          docente: { select: { nombre: true, apellidos: true, dni: true } },
          justificadoPor: { select: { id: true, nombre: true, apellidos: true, rol: true } },
        },
      }),
      this.prisma.asistencia.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findByAlumno(alumnoId: string, limit = 50, caller?: { id: string; rol: string }) {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id: alumnoId, deletedAt: null },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    // ── Verificar propiedad ──────────────────────────────────────────────────
    if (caller?.rol === 'alumno') {
      if (alumno.usuarioId !== caller.id) throw new NotFoundException('Alumno no encontrado');
    } else if (caller?.rol === 'apoderado') {
      const apoderado = await this.prisma.apoderado.findFirst({
        where: { usuarioId: caller.id, deletedAt: null },
        select: { alumnos: { where: { alumnoId }, select: { alumnoId: true } } },
      });
      if (!apoderado?.alumnos.length) throw new NotFoundException('Alumno no encontrado');
    }

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

  /**
   * Cambia SOLO el flag puntual/tardanza de un registro. Función legítima del
   * auxiliar en el kiosco al momento de registrar (no es "editar" el registro
   * completo, que sigue restringido a admin/director).
   */
  async setTardanza(id: string, esTardanza: boolean, registradoPorId: string) {
    const registro = await this.prisma.asistencia.findFirst({ where: { id } });
    if (!registro) throw new NotFoundException('Registro de asistencia no encontrado');
    if (registro.esAusente) throw new BadRequestException('No aplica tardanza a una inasistencia');

    return this.prisma.asistencia.update({
      where: { id },
      data: { esTardanza, esManual: true, registradoPorId },
      include: {
        alumno:  { select: { nombre: true, apellidos: true, codigoBarras: true, aula: { select: { id: true, nombre: true } } } },
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

  /** Datos enriquecidos de docentes para exportar a Excel */
  async exportDocentes(fecha: string) {
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(Date.UTC(y, m - 1, d));

    // día de la semana: Dom=0 → 7, Lun=1 → 1 … Sab=6 → 6
    const jsDay    = new Date(y, m - 1, d).getDay();
    const diaSemana = jsDay === 0 ? 7 : jsDay;

    const registros = await this.prisma.asistencia.findMany({
      where: { fecha: fechaDate, tipoPersona: 'docente' },
      orderBy: { horaIngreso: 'asc' },
      include: {
        docente: {
          select: {
            id: true, dni: true, nombre: true, apellidos: true,
            horarios: {
              where: { diaSemana },
              orderBy: { horaInicio: 'asc' },
              take: 1,
              select: {
                horaInicio: true,
                horaFin:    true,
                curso: { select: { nombre: true } },
                aula:  { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    return registros.map(r => {
      const h = r.docente?.horarios?.[0];
      return {
        id:          r.id,
        dni:         r.docente?.dni ?? '',
        apellidos:   r.docente?.apellidos ?? '',
        nombre:      r.docente?.nombre ?? '',
        curso:       h?.curso?.nombre ?? '',
        aula:        h?.aula?.nombre ?? '',
        horaIngreso: r.horaIngreso,
        fecha:       r.fecha,
        esTardanza:  r.esTardanza,
        motivoManual: r.motivoManual ?? '',
      };
    });
  }

  /**
   * Panel de inasistencias: lista las faltas (esAusente) de alumnos en un rango
   * de fechas, con su estado de justificación. Ordenadas por fecha desc y
   * apellidos. Pensado para justificar en lote desde un panel dedicado.
   */
  async inasistencias(dto: FilterInasistenciasDto) {
    const toUtcDate = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    };

    // Rango por defecto: últimos 30 días hasta hoy.
    const now = new Date();
    const hoy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const hasta = dto.hasta ? toUtcDate(dto.hasta) : hoy;
    const desde = dto.desde
      ? toUtcDate(dto.desde)
      : new Date(hasta.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      tipoPersona: TipoPersona.alumno,
      esAusente: true,
      fecha: { gte: desde, lte: hasta },
    };
    if (dto.aula_id) where.alumno = { aulaId: dto.aula_id };
    if (dto.estado === 'pendientes') where.justificacionRazon = null;
    else if (dto.estado === 'justificadas') where.justificacionRazon = { not: null };

    const items = await this.prisma.asistencia.findMany({
      where,
      orderBy: [{ fecha: 'desc' }, { alumno: { apellidos: 'asc' } }],
      include: {
        alumno: {
          select: {
            id: true, nombre: true, apellidos: true, codigoBarras: true, dni: true,
            aula: { select: { id: true, nombre: true, area: true } },
          },
        },
        justificadoPor: { select: { id: true, nombre: true, apellidos: true, rol: true } },
      },
    });

    const justificadas = items.filter((i) => i.justificacionRazon).length;
    return {
      data: items,
      total: items.length,
      justificadas,
      pendientes: items.length - justificadas,
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0],
    };
  }

  async justificar(id: string, dto: JustificarAusenciaDto, justificadoPorId: string) {
    const registro = await this.prisma.asistencia.findFirst({ where: { id } });
    if (!registro) throw new NotFoundException('Registro de asistencia no encontrado');

    // Solo se justifican inasistencias: la justificación no aplica a registros
    // de asistencia presente o tardanza.
    if (!registro.esAusente) {
      throw new BadRequestException('Solo se pueden justificar inasistencias');
    }

    return this.prisma.asistencia.update({
      where: { id },
      data: {
        justificacionRazon: dto.razon,
        justificacionDoc:   dto.doc_num,
        justificadoPorId,
        justificadoEn:      new Date(),
      },
      include: {
        alumno:  { select: { nombre: true, apellidos: true, codigoBarras: true, aula: { select: { id: true, nombre: true } } } },
        docente: { select: { nombre: true, apellidos: true, dni: true } },
        justificadoPor: { select: { id: true, nombre: true, apellidos: true, rol: true } },
      },
    });
  }
}
