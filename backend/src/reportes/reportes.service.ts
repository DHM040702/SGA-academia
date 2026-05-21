import { Injectable } from '@nestjs/common';
import { TipoPersona } from '@prisma/client';
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

    const ahora = new Date();
    const fechaHasta = hasta
      ? new Date(hasta)
      : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde
      ? new Date(desde)
      : new Date(fechaHasta.getTime() - 29 * 24 * 3600 * 1000);

    // ─── Filtro por sección / ciclo ───────────────────────────────
    let seccionIds: string[] | undefined;
    if (seccion_id) {
      seccionIds = [seccion_id];
    } else if (ciclo_id) {
      const secciones = await this.prisma.seccion.findMany({
        where: { cicloId: ciclo_id },
        select: { id: true },
      });
      seccionIds = secciones.map((s) => s.id);
    }

    // ─── KPIs: asistencia alumnos ─────────────────────────────────
    const whereAlumno: any = {
      tipoPersona: TipoPersona.alumno,
      fecha: { gte: fechaDesde, lte: fechaHasta },
    };
    if (seccionIds?.length) {
      whereAlumno.alumno = { seccionId: { in: seccionIds } };
    }

    const whereDocente: any = {
      tipoPersona: TipoPersona.docente,
      fecha: { gte: fechaDesde, lte: fechaHasta },
    };

    const [totalAlumno, puntualAlumno, tardanzaAlumno, totalDocente, puntualDocente] =
      await Promise.all([
        this.prisma.asistencia.count({ where: whereAlumno }),
        this.prisma.asistencia.count({ where: { ...whereAlumno, esTardanza: false } }),
        this.prisma.asistencia.count({ where: { ...whereAlumno, esTardanza: true } }),
        this.prisma.asistencia.count({ where: whereDocente }),
        this.prisma.asistencia.count({ where: { ...whereDocente, esTardanza: false } }),
      ]);

    const asistencia_media =
      totalAlumno > 0 ? Math.round(((puntualAlumno + tardanzaAlumno) / totalAlumno) * 100) : 0;
    const tardanzas_pct =
      totalAlumno > 0 ? Math.round((tardanzaAlumno / totalAlumno) * 100) : 0;
    const puntualidad_docentes =
      totalDocente > 0 ? Math.round((puntualDocente / totalDocente) * 100) : 0;

    // ─── Por sección ──────────────────────────────────────────────
    const secciones = await this.prisma.seccion.findMany({
      where: seccionIds?.length ? { id: { in: seccionIds } } : undefined,
      select: { id: true, nombre: true },
    });

    const por_seccion = await Promise.all(
      secciones.map(async (sec) => {
        const ws = {
          tipoPersona: TipoPersona.alumno,
          fecha: { gte: fechaDesde, lte: fechaHasta },
          alumno: { seccionId: sec.id },
        };
        const [total, puntuales, tardanzas, total_alumnos] = await Promise.all([
          this.prisma.asistencia.count({ where: ws }),
          this.prisma.asistencia.count({ where: { ...ws, esTardanza: false } }),
          this.prisma.asistencia.count({ where: { ...ws, esTardanza: true } }),
          this.prisma.alumno.count({ where: { seccionId: sec.id, deletedAt: null } }),
        ]);
        const pct_asistencia = total > 0 ? Math.round(((puntuales + tardanzas) / total) * 100) : 0;
        const pct_tardanza   = total > 0 ? Math.round((tardanzas / total) * 100) : 0;
        return { seccion_id: sec.id, nombre: sec.nombre, total_alumnos, pct_asistencia, pct_tardanza };
      }),
    );

    // ─── Por docente ──────────────────────────────────────────────
    const docentes = await this.prisma.docente.findMany({
      where: { deletedAt: null },
      select: { id: true, nombre: true, apellidos: true },
    });

    const por_docente_raw = await Promise.all(
      docentes.map(async (doc) => {
        const wd = {
          tipoPersona: TipoPersona.docente,
          docenteId: doc.id,
          fecha: { gte: fechaDesde, lte: fechaHasta },
        };
        const [total, puntuales] = await Promise.all([
          this.prisma.asistencia.count({ where: wd }),
          this.prisma.asistencia.count({ where: { ...wd, esTardanza: false } }),
        ]);
        return {
          docente_id: doc.id,
          nombre: `${doc.nombre} ${doc.apellidos}`,
          asistencia_pct: total > 0 ? Math.round((total / total) * 100) : 0,
          puntualidad:    total > 0 ? Math.round((puntuales / total) * 100) : 0,
          total_sesiones: total,
        };
      }),
    );
    const por_docente = por_docente_raw.filter((d) => d.total_sesiones > 0);

    // ─── Tendencia 30 días ────────────────────────────────────────
    const tendencia_30d: { fecha: string; pct: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dia = new Date(fechaHasta.getTime() - i * 24 * 3600 * 1000);
      const diaDate = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
      const wDia: any = { tipoPersona: TipoPersona.alumno, fecha: diaDate };
      if (seccionIds?.length) wDia.alumno = { seccionId: { in: seccionIds } };

      const [totalDia, presentesDia] = await Promise.all([
        this.prisma.asistencia.count({ where: wDia }),
        this.prisma.asistencia.count({ where: { ...wDia, esTardanza: false } }),
      ]);
      tendencia_30d.push({
        fecha: diaDate.toISOString().split('T')[0],
        pct: totalDia > 0 ? Math.round((presentesDia / totalDia) * 100) : 0,
      });
    }

    return {
      kpis: {
        asistencia_media,
        tardanzas_pct,
        puntualidad_docentes,
        sesiones_registradas: totalAlumno,
      },
      por_seccion,
      por_docente,
      tendencia_30d,
    };
  }
}
