import { Injectable } from '@nestjs/common';
import { EstadoAsistencia, TipoAsistencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AsistenciaGeneralParams {
  ciclo_id?: string;
  seccion_id?: string;
  desde?: string;
  hasta?: string;
}

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async asistenciaGeneral(params: AsistenciaGeneralParams) {
    const { ciclo_id, seccion_id, desde, hasta } = params;

    // ─── Rango de fechas ─────────────────────────────────────────────────────
    const ahora = new Date();
    const fechaHasta = hasta
      ? new Date(hasta)
      : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde
      ? new Date(desde)
      : new Date(fechaHasta.getTime() - 29 * 24 * 3600 * 1000);

    // ─── Where base para asistencia ──────────────────────────────────────────
    const whereBase: any = {
      deleted_at: null,
      fecha: { gte: fechaDesde, lte: fechaHasta },
    };

    // ─── Filtro por sección (directo o via ciclo) ─────────────────────────────
    let seccionIds: string[] | undefined;
    if (seccion_id) {
      seccionIds = [seccion_id];
    } else if (ciclo_id) {
      const secciones = await this.prisma.seccion.findMany({
        where: { ciclo_id, deleted_at: null },
        select: { id: true },
      });
      seccionIds = secciones.map((s) => s.id);
    }

    if (seccionIds && seccionIds.length > 0) {
      whereBase.OR = [
        { alumno: { seccion_id: { in: seccionIds } } },
        { horario: { seccion_id: { in: seccionIds } } },
      ];
    }

    // ─── KPIs globales ────────────────────────────────────────────────────────
    const whereAlumno = { ...whereBase, tipo: TipoAsistencia.alumno };
    const whereDocente = { ...whereBase, tipo: TipoAsistencia.docente };

    const [totalAlumno, presentesAlumno, tardanzasAlumno, ausentesAlumno] = await Promise.all([
      this.prisma.asistencia.count({ where: whereAlumno }),
      this.prisma.asistencia.count({ where: { ...whereAlumno, estado: EstadoAsistencia.presente } }),
      this.prisma.asistencia.count({ where: { ...whereAlumno, estado: EstadoAsistencia.tardanza } }),
      this.prisma.asistencia.count({ where: { ...whereAlumno, estado: EstadoAsistencia.ausente } }),
    ]);

    const [totalDocente, puntualDocente] = await Promise.all([
      this.prisma.asistencia.count({ where: whereDocente }),
      this.prisma.asistencia.count({ where: { ...whereDocente, estado: EstadoAsistencia.presente } }),
    ]);

    const asistencia_media =
      totalAlumno > 0
        ? Math.round(((presentesAlumno + tardanzasAlumno) / totalAlumno) * 100)
        : 0;
    const tardanzas_pct =
      totalAlumno > 0 ? Math.round((tardanzasAlumno / totalAlumno) * 100) : 0;
    const puntualidad_docentes =
      totalDocente > 0 ? Math.round((puntualDocente / totalDocente) * 100) : 0;

    // Sesiones de horario (programadas vs dictadas según asistencia de docentes)
    const sesiones_programadas = totalDocente;
    const sesiones_dictadas = presentesAlumno > 0 || puntualDocente > 0 ? puntualDocente : 0;

    // ─── Por sección ──────────────────────────────────────────────────────────
    const secciones = seccionIds
      ? await this.prisma.seccion.findMany({
          where: { id: { in: seccionIds }, deleted_at: null },
          select: { id: true, nombre: true },
        })
      : await this.prisma.seccion.findMany({
          where: {
            deleted_at: null,
            ...(ciclo_id ? { ciclo_id } : {}),
          },
          select: { id: true, nombre: true },
        });

    const por_seccion = await Promise.all(
      secciones.map(async (sec) => {
        const whereSeccion = {
          deleted_at: null,
          tipo: TipoAsistencia.alumno,
          fecha: { gte: fechaDesde, lte: fechaHasta },
          alumno: { seccion_id: sec.id },
        };

        const [total, presentes, tardanzas, ausentes, total_alumnos] = await Promise.all([
          this.prisma.asistencia.count({ where: whereSeccion }),
          this.prisma.asistencia.count({ where: { ...whereSeccion, estado: EstadoAsistencia.presente } }),
          this.prisma.asistencia.count({ where: { ...whereSeccion, estado: EstadoAsistencia.tardanza } }),
          this.prisma.asistencia.count({ where: { ...whereSeccion, estado: EstadoAsistencia.ausente } }),
          this.prisma.alumno.count({ where: { seccion_id: sec.id, deleted_at: null } }),
        ]);

        const pct_asistencia = total > 0 ? Math.round(((presentes + tardanzas) / total) * 100) : 0;
        const pct_tardanza = total > 0 ? Math.round((tardanzas / total) * 100) : 0;
        const pct_ausencia = total > 0 ? Math.round((ausentes / total) * 100) : 0;

        return {
          seccion_id: sec.id,
          nombre: sec.nombre,
          total_alumnos,
          pct_asistencia,
          pct_tardanza,
          pct_ausencia,
        };
      }),
    );

    // ─── Por docente ─────────────────────────────────────────────────────────
    const docentes = await this.prisma.docente.findMany({
      where: { deleted_at: null },
      select: { id: true, nombres: true, apellidos: true },
    });

    const por_docente = await Promise.all(
      docentes.map(async (doc) => {
        const whereDoc = {
          deleted_at: null,
          tipo: TipoAsistencia.docente,
          docente_id: doc.id,
          fecha: { gte: fechaDesde, lte: fechaHasta },
        };

        const [total, puntuales] = await Promise.all([
          this.prisma.asistencia.count({ where: whereDoc }),
          this.prisma.asistencia.count({
            where: { ...whereDoc, estado: EstadoAsistencia.presente },
          }),
        ]);

        return {
          docente_id: doc.id,
          nombre: `${doc.nombres} ${doc.apellidos}`,
          asistencia_ciclo: total > 0 ? Math.round(((puntuales + 0) / total) * 100) : 0,
          puntualidad: total > 0 ? Math.round((puntuales / total) * 100) : 0,
        };
      }),
    );

    // Excluir docentes sin registros en el rango
    const por_docente_filtrado = por_docente.filter((d) => d.asistencia_ciclo > 0 || d.puntualidad > 0);

    // ─── Tendencia 30 días ────────────────────────────────────────────────────
    const tendencia_30d: { fecha: string; pct: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const dia = new Date(fechaHasta.getTime() - i * 24 * 3600 * 1000);
      const diaStart = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());

      const whereDia: any = {
        deleted_at: null,
        tipo: TipoAsistencia.alumno,
        fecha: diaStart,
      };

      if (seccionIds && seccionIds.length > 0) {
        whereDia.alumno = { seccion_id: { in: seccionIds } };
      }

      const [totalDia, presentesDia, tardanzasDia] = await Promise.all([
        this.prisma.asistencia.count({ where: whereDia }),
        this.prisma.asistencia.count({ where: { ...whereDia, estado: EstadoAsistencia.presente } }),
        this.prisma.asistencia.count({ where: { ...whereDia, estado: EstadoAsistencia.tardanza } }),
      ]);

      const pct = totalDia > 0 ? Math.round(((presentesDia + tardanzasDia) / totalDia) * 100) : 0;
      tendencia_30d.push({
        fecha: diaStart.toISOString().split('T')[0],
        pct,
      });
    }

    return {
      kpis: {
        asistencia_media,
        tardanzas_pct,
        puntualidad_docentes,
        sesiones_dictadas,
        sesiones_programadas,
      },
      por_seccion,
      por_docente: por_docente_filtrado,
      tendencia_30d,
    };
  }
}
