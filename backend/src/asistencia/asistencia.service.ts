import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoAsistencia, TipoAsistencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { RegisterScanDto } from './dto/register-scan.dto';
import { ManualCorrectionDto } from './dto/manual-correction.dto';
import { FilterAsistenciaDto } from './dto/filter-asistencia.dto';

@Injectable()
export class AsistenciaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra asistencia por escaneo de código de barras.
   * Auto-detecta tipo: alumno (6 dígitos) o docente (DNI).
   */
  async scan(dto: RegisterScanDto) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // --- Detectar tipo ---
    let tipo = dto.tipo;
    if (!tipo) {
      tipo = /^\d{6}$/.test(dto.codigo) ? TipoAsistencia.alumno : TipoAsistencia.docente;
    }

    let alumno_id: string | undefined;
    let docente_id: string | undefined;
    let horario_id: string | undefined;

    if (tipo === TipoAsistencia.alumno) {
      const alumno = await this.prisma.alumno.findFirst({
        where: { codigo_barra: dto.codigo, deleted_at: null },
      });
      if (!alumno) throw new NotFoundException(`Alumno con código ${dto.codigo} no encontrado`);
      alumno_id = alumno.id;

      // Buscar horario activo del día para la sección del alumno
      if (alumno.seccion_id) {
        const diaSemana = this._diaSemanaActual(now);
        const horario = await this.prisma.horario.findFirst({
          where: {
            seccion_id: alumno.seccion_id,
            dia_semana: diaSemana as any,
            deleted_at: null,
          },
          orderBy: { hora_inicio: 'asc' },
        });
        if (horario) horario_id = horario.id;
      }
    } else {
      const docente = await this.prisma.docente.findFirst({
        where: { dni: dto.codigo, deleted_at: null },
      });
      if (!docente) throw new NotFoundException(`Docente con DNI ${dto.codigo} no encontrado`);
      docente_id = docente.id;
    }

    // --- Verificar si ya existe registro del día ---
    const existente = await this.prisma.asistencia.findFirst({
      where: {
        tipo,
        ...(alumno_id ? { alumno_id } : {}),
        ...(docente_id ? { docente_id } : {}),
        fecha: today,
        deleted_at: null,
      },
      include: {
        alumno: { select: { nombres: true, apellidos: true, codigo_barra: true } },
        docente: { select: { nombres: true, apellidos: true, dni: true } },
      },
    });

    if (existente) return existente;

    // --- Determinar estado: puntual vs tardanza ---
    let estado: EstadoAsistencia = EstadoAsistencia.presente;

    if (horario_id) {
      const horario = await this.prisma.horario.findUnique({ where: { id: horario_id } });
      if (horario) {
        const claseMs =
          horario.hora_inicio.getHours() * 3600000 + horario.hora_inicio.getMinutes() * 60000;
        const ahoraMs = now.getHours() * 3600000 + now.getMinutes() * 60000;
        const TARDANZA_MS = 15 * 60 * 1000;
        if (ahoraMs - claseMs > TARDANZA_MS) estado = EstadoAsistencia.tardanza;
      }
    }

    // --- Crear registro ---
    return this.prisma.asistencia.create({
      data: {
        tipo,
        alumno_id: alumno_id ?? null,
        docente_id: docente_id ?? null,
        horario_id: horario_id ?? null,
        fecha: today,
        hora_llegada: now,
        estado,
        correccion_manual: false,
      },
      include: {
        alumno: { select: { nombres: true, apellidos: true, codigo_barra: true } },
        docente: { select: { nombres: true, apellidos: true, dni: true } },
      },
    });
  }

  async findAll(dto: FilterAsistenciaDto) {
    const { page = 1, limit = 20, fecha, seccion_id, tipo, estado } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (fecha) {
      const d = new Date(fecha);
      where.fecha = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (seccion_id) {
      where.OR = [
        { alumno: { seccion_id } },
        { horario: { seccion_id } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.asistencia.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ fecha: 'desc' }, { hora_llegada: 'asc' }],
        include: {
          alumno: { select: { nombres: true, apellidos: true, codigo_barra: true } },
          docente: { select: { nombres: true, apellidos: true, dni: true } },
        },
      }),
      this.prisma.asistencia.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findByAlumno(alumno_id: string, limit = 50) {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id: alumno_id, deleted_at: null },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    return this.prisma.asistencia.findMany({
      where: { alumno_id, tipo: TipoAsistencia.alumno, deleted_at: null },
      orderBy: { fecha: 'desc' },
      take: limit,
    });
  }

  async corregir(id: string, dto: ManualCorrectionDto, registrado_por_id: string) {
    const registro = await this.prisma.asistencia.findFirst({
      where: { id, deleted_at: null },
    });
    if (!registro) throw new NotFoundException('Registro de asistencia no encontrado');

    let hora_llegada: Date | undefined;
    if (dto.hora_llegada) {
      const [hh, mm] = dto.hora_llegada.split(':').map(Number);
      const d = new Date(registro.fecha);
      d.setHours(hh, mm, 0, 0);
      hora_llegada = d;
    }

    return this.prisma.asistencia.update({
      where: { id },
      data: {
        estado: dto.estado,
        observacion: dto.observacion ?? registro.observacion,
        ...(hora_llegada ? { hora_llegada } : {}),
        correccion_manual: true,
        registrado_por_id,
      },
      include: {
        alumno: { select: { nombres: true, apellidos: true, codigo_barra: true } },
        docente: { select: { nombres: true, apellidos: true, dni: true } },
      },
    });
  }

  async stats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [presentes, tardanzas, ausentes, total] = await Promise.all([
      this.prisma.asistencia.count({
        where: { fecha: today, estado: EstadoAsistencia.presente, deleted_at: null },
      }),
      this.prisma.asistencia.count({
        where: { fecha: today, estado: EstadoAsistencia.tardanza, deleted_at: null },
      }),
      this.prisma.asistencia.count({
        where: { fecha: today, estado: EstadoAsistencia.ausente, deleted_at: null },
      }),
      this.prisma.asistencia.count({
        where: { fecha: today, deleted_at: null },
      }),
    ]);

    const pct_asistencia = total > 0 ? Math.round(((presentes + tardanzas) / total) * 100) : 0;

    return { presentes, tardanzas, ausentes, total, pct_asistencia };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private _diaSemanaActual(date: Date): string {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return dias[date.getDay()];
  }
}
