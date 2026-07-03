import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoPersona } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AsistenciaGeneralParams {
  ciclo_id?: string;
  aula_id?: string;
  desde?: string;
  hasta?: string;
}
export interface ReporteAlumnosParams {
  ciclo_id?: string;
  aula_id?: string;
  area?: string;
}
export interface ReporteHorariosParams {
  ciclo_id?: string;
  aula_id?: string;
  docente_id?: string;
  solo_publicados?: string; // 'true' | 'false' (query param llega como string)
}
export interface ReporteCursosParams {
  ciclo_id?: string;
  con_horario?: string; // 'true' | 'false' | '' (todos)
}
export interface ReporteJustificacionesParams {
  ciclo_id?: string;
  aula_id?: string;
  desde?: string;
  hasta?: string;
  estado?: 'todas' | 'pendientes' | 'justificadas';
}
export interface ReporteAsistenciaAlumnoParams {
  alumno_id: string;
  desde?: string;
  hasta?: string;
}
export interface RangoCicloParams {
  ciclo_id?: string;
  desde?: string;
  hasta?: string;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function minutesBetween(inicio: Date, fin: Date): number {
  return (fin.getHours() * 60 + fin.getMinutes()) - (inicio.getHours() * 60 + inicio.getMinutes());
}

function roundHours(min: number) {
  return Math.round(min / 60 * 10) / 10;
}

const DIA_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  /**
   * IDs de aula sobre las que scopear un reporte:
   *  - aula_id → esa aula.
   *  - ciclo_id → aulas de ese ciclo.
   *  - ninguno → aulas del CICLO ACTIVO (para no mezclar ciclos cerrados).
   * Devuelve undefined solo si NO hay ciclo activo (estado legado) → sin filtro.
   * Un array vacío significa "scopeado, pero sin aulas" (filtra a nada).
   */
  private async scopedAulaIds(ciclo_id?: string, aula_id?: string): Promise<string[] | undefined> {
    if (aula_id) return [aula_id];
    let cid = ciclo_id;
    if (!cid) {
      const activo = await this.prisma.ciclo.findFirst({ where: { activo: true }, select: { id: true } });
      cid = activo?.id;
    }
    if (!cid) return undefined;
    const res = await this.prisma.aula.findMany({ where: { cicloId: cid }, select: { id: true } });
    return res.map((a) => a.id);
  }

  // ══════════════════════════════════════════════════════════════════
  // ASISTENCIA
  // ══════════════════════════════════════════════════════════════════
  async asistenciaGeneral(params: AsistenciaGeneralParams) {
    const { ciclo_id, aula_id, desde, hasta } = params;

    const ahora = new Date();
    const fechaHasta = hasta
      ? new Date(hasta)
      : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde
      ? new Date(desde)
      : new Date(fechaHasta.getTime() - 29 * 24 * 3600 * 1000);

    let aulaIds: string[] | undefined;
    if (aula_id) {
      aulaIds = [aula_id];
    } else {
      // Sin aula específica: usar el ciclo pedido o, por defecto, el ACTIVO, para
      // no mezclar métricas de ciclos cerrados. Solo si no hay ciclo activo
      // (estado legado) se dejan todas las aulas.
      let cid = ciclo_id;
      if (!cid) {
        const activo = await this.prisma.ciclo.findFirst({ where: { activo: true }, select: { id: true } });
        cid = activo?.id;
      }
      if (cid) {
        const res = await this.prisma.aula.findMany({ where: { cicloId: cid }, select: { id: true } });
        aulaIds = res.map((a) => a.id);
      }
    }

    const alumnos = await this.prisma.alumno.findMany({
      // aulaIds definido (aunque vacío) = modo scopeado; undefined = legado (todas).
      where: { deletedAt: null, ...(aulaIds !== undefined && { aulaId: { in: aulaIds } }) },
      select: { id: true, aulaId: true },
    });
    const alumnoIds = alumnos.map((a) => a.id);
    const alumnoToAula = new Map(alumnos.map((a) => [a.id, a.aulaId]));
    const alumnoCountByAula: Record<string, number> = {};
    for (const a of alumnos) {
      if (a.aulaId) alumnoCountByAula[a.aulaId] = (alumnoCountByAula[a.aulaId] ?? 0) + 1;
    }

    const asistenciasAlumno = await this.prisma.asistencia.findMany({
      where: {
        tipoPersona: TipoPersona.alumno,
        // Solo presencias reales: las faltas (esAusente) NO son asistencia y
        // no deben inflar los % de asistencia del panel/tendencia.
        esAusente: false,
        fecha: { gte: fechaDesde, lte: fechaHasta },
        ...(aulaIds !== undefined && { alumnoId: { in: alumnoIds } }),
      },
      select: { alumnoId: true, esTardanza: true, fecha: true },
    });

    const asistenciasDocente = await this.prisma.asistencia.findMany({
      where: { tipoPersona: TipoPersona.docente, fecha: { gte: fechaDesde, lte: fechaHasta } },
      select: { docenteId: true, esTardanza: true, fecha: true },
    });

    const aulas = await this.prisma.aula.findMany({
      // Definido (aunque vacío) = scopeado; undefined = legado (todas).
      where: aulaIds !== undefined ? { id: { in: aulaIds } } : undefined,
      select: { id: true, nombre: true },
    });

    const docentes = await this.prisma.docente.findMany({
      where: { deletedAt: null },
      select: { id: true, nombre: true, apellidos: true },
    });

    const totalAlumno    = asistenciasAlumno.length;
    const tardanzaAlumno = asistenciasAlumno.filter((a) => a.esTardanza).length;
    const totalDocente   = asistenciasDocente.length;
    const puntualDocente = asistenciasDocente.filter((a) => !a.esTardanza).length;

    const uniqueSessionDays = new Set(asistenciasAlumno.map((a) => isoDate(a.fecha))).size;
    const expected = alumnos.length * uniqueSessionDays;

    const asistencia_media = expected > 0 ? Math.min(100, Math.round((totalAlumno / expected) * 100)) : 0;
    const tardanzas_pct    = totalAlumno > 0 ? Math.round((tardanzaAlumno / totalAlumno) * 100) : 0;
    const puntualidad_docentes = totalDocente > 0 ? Math.round((puntualDocente / totalDocente) * 100) : 0;

    const aulaAsist: Record<string, { total: number; tardanzas: number; dias: Set<string> }> = {};
    for (const a of aulas) aulaAsist[a.id] = { total: 0, tardanzas: 0, dias: new Set() };

    for (const ast of asistenciasAlumno) {
      if (!ast.alumnoId) continue;
      const aid = alumnoToAula.get(ast.alumnoId);
      if (!aid || !aulaAsist[aid]) continue;
      aulaAsist[aid].total++;
      if (ast.esTardanza) aulaAsist[aid].tardanzas++;
      aulaAsist[aid].dias.add(isoDate(ast.fecha));
    }

    const por_seccion = aulas.map((aula) => {
      const { total, tardanzas, dias } = aulaAsist[aula.id];
      const nAlumnos    = alumnoCountByAula[aula.id] ?? 0;
      const sessionDays = dias.size;
      const exp         = nAlumnos * sessionDays;
      return {
        aulaId:         aula.id,
        nombre:         aula.nombre,
        total_alumnos:  nAlumnos,
        pct_asistencia: exp > 0 ? Math.min(100, Math.round((total / exp) * 100)) : 0,
        pct_tardanza:   total > 0 ? Math.round((tardanzas / total) * 100) : 0,
        sesiones:       sessionDays,
      };
    });

    const docenteAsist: Record<string, { total: number; puntuales: number }> = {};
    for (const ast of asistenciasDocente) {
      if (!ast.docenteId) continue;
      if (!docenteAsist[ast.docenteId]) docenteAsist[ast.docenteId] = { total: 0, puntuales: 0 };
      docenteAsist[ast.docenteId].total++;
      if (!ast.esTardanza) docenteAsist[ast.docenteId].puntuales++;
    }

    const por_docente = docentes
      .filter((d) => (docenteAsist[d.id]?.total ?? 0) > 0)
      .map((d) => {
        const { total, puntuales } = docenteAsist[d.id];
        return {
          docente_id:     d.id,
          nombre:         `${d.nombre} ${d.apellidos}`,
          asistencia_pct: 100,
          puntualidad:    Math.round((puntuales / total) * 100),
          total_sesiones: total,
          tardanzas:      total - puntuales,
        };
      });

    const asistByDay: Record<string, { total: number; tardanzas: number }> = {};
    for (const ast of asistenciasAlumno) {
      const key = isoDate(ast.fecha);
      if (!asistByDay[key]) asistByDay[key] = { total: 0, tardanzas: 0 };
      asistByDay[key].total++;
      if (ast.esTardanza) asistByDay[key].tardanzas++;
    }

    const nScope = alumnos.length || 1;
    const tendencia_30d: { fecha: string; pct: number; tardanzas: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dia = new Date(fechaHasta.getTime() - i * 24 * 3600 * 1000);
      const key = isoDate(dia);
      const { total = 0, tardanzas = 0 } = asistByDay[key] ?? {};
      tendencia_30d.push({
        fecha:     key,
        pct:       Math.min(100, Math.round((total / nScope) * 100)),
        tardanzas: total > 0 ? Math.round((tardanzas / total) * 100) : 0,
      });
    }

    return {
      kpis: { asistencia_media, tardanzas_pct, puntualidad_docentes, sesiones_registradas: totalAlumno },
      por_seccion,
      por_docente,
      tendencia_30d,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // ALUMNOS
  // ══════════════════════════════════════════════════════════════════
  async reporteAlumnos(params: ReporteAlumnosParams) {
    const { ciclo_id, aula_id, area } = params;

    const aulaIds = await this.scopedAulaIds(ciclo_id, aula_id);

    const alumnosRaw = await this.prisma.alumno.findMany({
      where: {
        deletedAt: null,
        ...(aulaIds !== undefined && { aulaId: { in: aulaIds } }),
        ...(area && { carrera: { area: area as any } }),
      },
      select: {
        id: true,
        aulaId: true,
        carreraId: true,
        carrera: { select: { id: true, nombre: true, area: true } },
        _count: { select: { apoderados: true } },
      },
    });

    const aulas = await this.prisma.aula.findMany({
      where: aulaIds !== undefined ? { id: { in: aulaIds } } : undefined,
      select: { id: true, nombre: true, cupoMaximo: true, turno: true, area: true },
    });

    const carreras = await this.prisma.carrera.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, area: true },
    });

    // Asistencia últimos 30 días para calcular estado
    const fechaDesde = new Date(Date.now() - 29 * 24 * 3600 * 1000);
    const alumnoIds  = alumnosRaw.map((a) => a.id);

    const asistencias = await this.prisma.asistencia.findMany({
      where: {
        tipoPersona: TipoPersona.alumno,
        fecha: { gte: fechaDesde },
        ...(aulaIds !== undefined && { alumnoId: { in: alumnoIds } }),
      },
      select: { alumnoId: true, fecha: true },
    });

    const alumnoToAula = new Map(alumnosRaw.map((a) => [a.id, a.aulaId]));
    const aulaDays: Record<string, Set<string>>    = {};
    const alumnoAsist: Record<string, Set<string>> = {};

    for (const ast of asistencias) {
      if (!ast.alumnoId) continue;
      const key = isoDate(ast.fecha);
      const aid = alumnoToAula.get(ast.alumnoId);

      if (!alumnoAsist[ast.alumnoId]) alumnoAsist[ast.alumnoId] = new Set();
      alumnoAsist[ast.alumnoId].add(key);

      if (aid) {
        if (!aulaDays[aid]) aulaDays[aid] = new Set();
        aulaDays[aid].add(key);
      }
    }

    let activos = 0, observados = 0, en_riesgo = 0;
    for (const a of alumnosRaw) {
      const dias  = alumnoAsist[a.id]?.size ?? 0;
      const total = a.aulaId ? (aulaDays[a.aulaId]?.size ?? dias) : dias;
      const pct   = total > 0 ? Math.round((dias / total) * 100) : 100;
      if (pct >= 85) activos++;
      else if (pct >= 75) observados++;
      else en_riesgo++;
    }

    // KPIs
    const kpis = {
      total:         alumnosRaw.length,
      activos,
      observados,
      en_riesgo,
      sin_aula:      alumnosRaw.filter((a) => !a.aulaId).length,
      con_apoderado: alumnosRaw.filter((a) => a._count.apoderados > 0).length,
    };

    // Por aula
    const alumnoCountByAula: Record<string, number> = {};
    const estadoByAula: Record<string, { activos: number; observados: number; riesgo: number }> = {};
    for (const a of alumnosRaw) {
      if (!a.aulaId) continue;
      alumnoCountByAula[a.aulaId] = (alumnoCountByAula[a.aulaId] ?? 0) + 1;
      if (!estadoByAula[a.aulaId]) estadoByAula[a.aulaId] = { activos: 0, observados: 0, riesgo: 0 };
      const dias  = alumnoAsist[a.id]?.size ?? 0;
      const total = aulaDays[a.aulaId]?.size ?? dias;
      const pct   = total > 0 ? Math.round((dias / total) * 100) : 100;
      if (pct >= 85)       estadoByAula[a.aulaId].activos++;
      else if (pct >= 75)  estadoByAula[a.aulaId].observados++;
      else                 estadoByAula[a.aulaId].riesgo++;
    }

    const por_aula = aulas.map((aula) => {
      const total = alumnoCountByAula[aula.id] ?? 0;
      const est   = estadoByAula[aula.id] ?? { activos: 0, observados: 0, riesgo: 0 };
      return {
        aulaId:       aula.id,
        nombre:       aula.nombre,
        turno:        aula.turno,
        area:         aula.area,
        cupo_maximo:  aula.cupoMaximo,
        total_alumnos: total,
        ocupacion_pct: Math.round((total / aula.cupoMaximo) * 100),
        activos:      est.activos,
        observados:   est.observados,
        en_riesgo:    est.riesgo,
      };
    });

    // Por área
    const areaCount: Record<string, number> = { ciencias: 0, letras: 0, medicas: 0 };
    for (const a of alumnosRaw) {
      if (a.carrera?.area) areaCount[a.carrera.area] = (areaCount[a.carrera.area] ?? 0) + 1;
    }
    const totalConCarrera = Object.values(areaCount).reduce((s, v) => s + v, 0);
    const por_area = Object.entries(areaCount).map(([a, total]) => ({
      area:  a,
      total,
      pct:   totalConCarrera > 0 ? Math.round((total / totalConCarrera) * 100) : 0,
    }));

    // Por carrera
    const carreraCount: Record<string, number> = {};
    for (const a of alumnosRaw) {
      if (a.carreraId) carreraCount[a.carreraId] = (carreraCount[a.carreraId] ?? 0) + 1;
    }
    const por_carrera = carreras
      .filter((c) => (carreraCount[c.id] ?? 0) > 0)
      .map((c) => ({ carreraId: c.id, nombre: c.nombre, area: c.area, total: carreraCount[c.id] }))
      .sort((a, b) => b.total - a.total);

    return { kpis, por_aula, por_area, por_carrera };
  }

  // ══════════════════════════════════════════════════════════════════
  // HORARIOS
  // ══════════════════════════════════════════════════════════════════
  async reporteHorarios(params: ReporteHorariosParams) {
    const { ciclo_id, aula_id, docente_id, solo_publicados } = params;

    const aulaIds = await this.scopedAulaIds(ciclo_id, aula_id);

    const where: any = {};
    if (aulaIds !== undefined)       where.aulaId    = { in: aulaIds };
    if (docente_id)                  where.docenteId = docente_id;
    if (solo_publicados === 'true')  where.publicado = true;

    const horarios = await this.prisma.horario.findMany({
      where,
      select: {
        id: true, diaSemana: true, horaInicio: true, horaFin: true, publicado: true,
        aulaId: true, docenteId: true, cursoId: true,
        aula:    { select: { id: true, nombre: true, ciclo: { select: { nombre: true } } } },
        docente: { select: { id: true, nombre: true, apellidos: true } },
        curso:   { select: { id: true, nombre: true, codigo: true } },
      },
    });

    // KPIs
    const kpis = {
      total_clases:      horarios.length,
      publicados:        horarios.filter((h) => h.publicado).length,
      borradores:        horarios.filter((h) => !h.publicado).length,
      aulas_con_horario: new Set(horarios.map((h) => h.aulaId)).size,
      docentes_activos:  new Set(horarios.map((h) => h.docenteId)).size,
    };

    // Por docente
    const docenteMap: Record<string, {
      docente_id: string; nombre: string
      clases: number; minutos: number; publicadas: number
      cursos: Set<string>; aulas: Set<string>
    }> = {};

    for (const h of horarios) {
      if (!docenteMap[h.docenteId]) {
        docenteMap[h.docenteId] = {
          docente_id: h.docente.id,
          nombre:     `${h.docente.nombre} ${h.docente.apellidos}`,
          clases: 0, minutos: 0, publicadas: 0,
          cursos: new Set(), aulas: new Set(),
        };
      }
      const d = docenteMap[h.docenteId];
      d.clases++;
      d.minutos += minutesBetween(h.horaInicio, h.horaFin);
      d.cursos.add(h.cursoId);
      d.aulas.add(h.aulaId);
      if (h.publicado) d.publicadas++;
    }

    const por_docente = Object.values(docenteMap)
      .map((d) => ({
        docente_id:       d.docente_id,
        nombre:           d.nombre,
        total_clases:     d.clases,
        horas_semana:     roundHours(d.minutos),
        cursos_distintos: d.cursos.size,
        aulas_distintas:  d.aulas.size,
        publicadas:       d.publicadas,
        borradores:       d.clases - d.publicadas,
      }))
      .sort((a, b) => b.horas_semana - a.horas_semana);

    // Por aula
    const aulaMap: Record<string, {
      aulaId: string; nombre: string; ciclo_nombre: string
      clases: number; minutos: number; publicadas: number; borradores: number
      cursos: Set<string>; docentes: Set<string>
    }> = {};

    for (const h of horarios) {
      if (!aulaMap[h.aulaId]) {
        aulaMap[h.aulaId] = {
          aulaId:       h.aula.id,
          nombre:       h.aula.nombre,
          ciclo_nombre: h.aula.ciclo.nombre,
          clases: 0, minutos: 0, publicadas: 0, borradores: 0,
          cursos: new Set(), docentes: new Set(),
        };
      }
      const a = aulaMap[h.aulaId];
      a.clases++;
      a.minutos += minutesBetween(h.horaInicio, h.horaFin);
      if (h.publicado) a.publicadas++; else a.borradores++;
      a.cursos.add(h.curso.nombre);
      a.docentes.add(h.docenteId);
    }

    const por_aula = Object.values(aulaMap)
      .map((a) => ({
        aulaId:          a.aulaId,
        nombre:          a.nombre,
        ciclo_nombre:    a.ciclo_nombre,
        total_clases:    a.clases,
        horas_semana:    roundHours(a.minutos),
        publicadas:      a.publicadas,
        borradores:      a.borradores,
        cursos:          Array.from(a.cursos),
        docentes_count:  a.docentes.size,
      }))
      .sort((a, b) => b.total_clases - a.total_clases);

    // Por día de semana
    const diaCount: Record<number, { clases: number; minutos: number }> = {};
    for (const h of horarios) {
      if (!diaCount[h.diaSemana]) diaCount[h.diaSemana] = { clases: 0, minutos: 0 };
      diaCount[h.diaSemana].clases++;
      diaCount[h.diaSemana].minutos += minutesBetween(h.horaInicio, h.horaFin);
    }

    const por_dia = [1, 2, 3, 4, 5, 6].map((d) => ({
      dia:          d,
      nombre:       DIA_NAMES[d],
      total_clases: diaCount[d]?.clases  ?? 0,
      horas:        roundHours(diaCount[d]?.minutos ?? 0),
    }));

    return { kpis, por_docente, por_aula, por_dia };
  }

  // ══════════════════════════════════════════════════════════════════
  // CURSOS
  // ══════════════════════════════════════════════════════════════════
  async reporteCursos(params: ReporteCursosParams) {
    const { ciclo_id, con_horario } = params;

    const aulaIds = await this.scopedAulaIds(ciclo_id);

    const horarios = await this.prisma.horario.findMany({
      where: aulaIds !== undefined ? { aulaId: { in: aulaIds } } : undefined,
      select: {
        id: true, publicado: true, horaInicio: true, horaFin: true,
        aulaId: true, docenteId: true, cursoId: true,
      },
    });

    const cursos = await this.prisma.curso.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, codigo: true },
    });

    const cursoMap: Record<string, {
      cursoId: string; nombre: string; codigo: string
      clases: number; publicadas: number; minutos: number
      aulas: Set<string>; docentes: Set<string>
    }> = {};

    for (const c of cursos) {
      cursoMap[c.id] = {
        cursoId: c.id, nombre: c.nombre, codigo: c.codigo,
        clases: 0, publicadas: 0, minutos: 0,
        aulas: new Set(), docentes: new Set(),
      };
    }

    for (const h of horarios) {
      if (!cursoMap[h.cursoId]) continue;
      const c = cursoMap[h.cursoId];
      c.clases++;
      if (h.publicado) c.publicadas++;
      c.aulas.add(h.aulaId);
      c.docentes.add(h.docenteId);
      c.minutos += minutesBetween(h.horaInicio, h.horaFin);
    }

    const kpis = {
      total_cursos: cursos.length,
      con_horario:  Object.values(cursoMap).filter((c) => c.clases > 0).length,
      sin_horario:  Object.values(cursoMap).filter((c) => c.clases === 0).length,
      total_clases: horarios.length,
    };

    let por_curso = Object.values(cursoMap).map((c) => ({
      cursoId:           c.cursoId,
      nombre:            c.nombre,
      codigo:            c.codigo,
      total_clases:      c.clases,
      publicadas:        c.publicadas,
      borradores:        c.clases - c.publicadas,
      aulas_distintas:   c.aulas.size,
      docentes_distintos: c.docentes.size,
      horas_semana:      roundHours(c.minutos),
    }));

    if (con_horario === 'true')  por_curso = por_curso.filter((c) => c.total_clases > 0);
    if (con_horario === 'false') por_curso = por_curso.filter((c) => c.total_clases === 0);

    por_curso.sort((a, b) => b.total_clases - a.total_clases);

    return { kpis, por_curso };
  }

  // ══════════════════════════════════════════════════════════════════
  // JUSTIFICACIONES  (faltas justificadas vs pendientes + traza)
  // ══════════════════════════════════════════════════════════════════
  async reporteJustificaciones(params: ReporteJustificacionesParams) {
    const { ciclo_id, aula_id, desde, hasta, estado } = params;
    const ahora = new Date();
    const fechaHasta = hasta ? new Date(hasta) : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde ? new Date(desde) : new Date(fechaHasta.getTime() - 29 * 24 * 3600 * 1000);
    const aulaIds = await this.scopedAulaIds(ciclo_id, aula_id);

    const baseWhere: any = {
      tipoPersona: TipoPersona.alumno,
      esAusente: true,
      fecha: { gte: fechaDesde, lte: fechaHasta },
      ...(aulaIds !== undefined && { alumno: { aulaId: { in: aulaIds } } }),
    };
    const listWhere: any = { ...baseWhere };
    if (estado === 'pendientes') listWhere.justificacionRazon = null;
    else if (estado === 'justificadas') listWhere.justificacionRazon = { not: null };

    const [detalle, total, justificadas] = await Promise.all([
      this.prisma.asistencia.findMany({
        where: listWhere,
        orderBy: [{ fecha: 'desc' }, { alumno: { apellidos: 'asc' } }],
        take: 2000,
        include: {
          alumno: { select: { nombre: true, apellidos: true, codigoBarras: true, dni: true, aula: { select: { nombre: true } } } },
          justificadoPor: { select: { nombre: true, apellidos: true, rol: true } },
        },
      }),
      this.prisma.asistencia.count({ where: baseWhere }),
      this.prisma.asistencia.count({ where: { ...baseWhere, justificacionRazon: { not: null } } }),
    ]);

    return {
      total,
      justificadas,
      pendientes: total - justificadas,
      desde: isoDate(fechaDesde),
      hasta: isoDate(fechaHasta),
      detalle: detalle.map((d) => ({
        fecha:           isoDate(d.fecha),
        alumno:          `${d.alumno?.apellidos ?? ''} ${d.alumno?.nombre ?? ''}`.trim(),
        codigo:          d.alumno?.codigoBarras ?? '',
        dni:             d.alumno?.dni ?? '',
        aula:            d.alumno?.aula?.nombre ?? '',
        estado:          d.justificacionRazon ? 'justificada' : 'pendiente',
        razon:           d.justificacionRazon ?? '',
        expediente:      d.justificacionDoc ?? '',
        justificado_por: d.justificadoPor
          ? (`${d.justificadoPor.nombre ?? ''} ${d.justificadoPor.apellidos ?? ''}`.trim() || d.justificadoPor.rol)
          : '',
        justificado_en:  d.justificadoEn ? d.justificadoEn.toISOString() : null,
      })),
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // ASISTENCIA POR ALUMNO  (detalle e histórico de un alumno)
  // ══════════════════════════════════════════════════════════════════
  async reporteAsistenciaAlumno(params: ReporteAsistenciaAlumnoParams) {
    const { alumno_id, desde, hasta } = params;
    const alumno = await this.prisma.alumno.findFirst({
      where: { id: alumno_id, deletedAt: null },
      select: { id: true, nombre: true, apellidos: true, codigoBarras: true, dni: true, aula: { select: { nombre: true } } },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    const ahora = new Date();
    const fechaHasta = hasta ? new Date(hasta) : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde ? new Date(desde) : new Date(fechaHasta.getTime() - 29 * 24 * 3600 * 1000);

    const registros = await this.prisma.asistencia.findMany({
      where: { alumnoId: alumno_id, tipoPersona: TipoPersona.alumno, fecha: { gte: fechaDesde, lte: fechaHasta } },
      orderBy: { fecha: 'desc' },
      select: { fecha: true, horaIngreso: true, esTardanza: true, esAusente: true, justificacionRazon: true, justificacionDoc: true },
    });

    const presentes    = registros.filter((r) => !r.esAusente && !r.esTardanza).length;
    const tardanzas    = registros.filter((r) => r.esTardanza).length;
    const faltas       = registros.filter((r) => r.esAusente).length;
    const justificadas = registros.filter((r) => r.esAusente && r.justificacionRazon).length;
    const conRegistro  = registros.length;
    const asistio      = presentes + tardanzas;
    const pct          = conRegistro > 0 ? Math.round((asistio / conRegistro) * 100) : 100;

    return {
      alumno: {
        id:     alumno.id,
        nombre: `${alumno.apellidos} ${alumno.nombre}`.trim(),
        codigo: alumno.codigoBarras,
        dni:    alumno.dni,
        aula:   alumno.aula?.nombre ?? null,
      },
      desde: isoDate(fechaDesde),
      hasta: isoDate(fechaHasta),
      kpis: { presentes, tardanzas, faltas, justificadas, dias_con_registro: conRegistro, pct },
      detalle: registros.map((r) => ({
        fecha:      isoDate(r.fecha),
        hora:       r.esAusente ? null : (r.horaIngreso ? r.horaIngreso.toISOString() : null),
        estado:     r.esAusente ? (r.justificacionRazon ? 'justificada' : 'falta') : (r.esTardanza ? 'tardanza' : 'puntual'),
        razon:      r.justificacionRazon ?? '',
        expediente: r.justificacionDoc ?? '',
      })),
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // RANKING POR AULA  (% de asistencia por aula, ordenado)
  // ══════════════════════════════════════════════════════════════════
  async rankingAulas(params: RangoCicloParams) {
    const { ciclo_id, desde, hasta } = params;
    const ahora = new Date();
    const fechaHasta = hasta ? new Date(hasta) : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde ? new Date(desde) : new Date(fechaHasta.getTime() - 29 * 24 * 3600 * 1000);
    const aulaIds = await this.scopedAulaIds(ciclo_id);

    const aulas = await this.prisma.aula.findMany({
      where: aulaIds !== undefined ? { id: { in: aulaIds } } : undefined,
      select: { id: true, nombre: true, turno: true, area: true },
    });
    const alumnos = await this.prisma.alumno.findMany({
      where: { deletedAt: null, ...(aulaIds !== undefined && { aulaId: { in: aulaIds } }) },
      select: { id: true, aulaId: true },
    });
    const alumnoToAula = new Map(alumnos.map((a) => [a.id, a.aulaId]));
    const alumnoIds = alumnos.map((a) => a.id);
    const countByAula: Record<string, number> = {};
    for (const a of alumnos) if (a.aulaId) countByAula[a.aulaId] = (countByAula[a.aulaId] ?? 0) + 1;

    const asistencias = await this.prisma.asistencia.findMany({
      where: {
        tipoPersona: TipoPersona.alumno, esAusente: false,
        fecha: { gte: fechaDesde, lte: fechaHasta },
        ...(alumnoIds.length && { alumnoId: { in: alumnoIds } }),
      },
      select: { alumnoId: true, fecha: true },
    });

    const perAula: Record<string, { total: number; dias: Set<string> }> = {};
    for (const a of aulas) perAula[a.id] = { total: 0, dias: new Set() };
    for (const ast of asistencias) {
      if (!ast.alumnoId) continue;
      const aid = alumnoToAula.get(ast.alumnoId);
      if (!aid || !perAula[aid]) continue;
      perAula[aid].total++;
      perAula[aid].dias.add(isoDate(ast.fecha));
    }

    const ranking = aulas.map((a) => {
      const { total, dias } = perAula[a.id];
      const nAlumnos = countByAula[a.id] ?? 0;
      const sesiones = dias.size;
      const esperado = nAlumnos * sesiones;
      return {
        aulaId: a.id, nombre: a.nombre, turno: a.turno, area: a.area,
        alumnos: nAlumnos, sesiones,
        pct_asistencia: esperado > 0 ? Math.min(100, Math.round((total / esperado) * 100)) : 0,
      };
    }).sort((a, b) => b.pct_asistencia - a.pct_asistencia);

    return { desde: isoDate(fechaDesde), hasta: isoDate(fechaHasta), ranking };
  }

  // ══════════════════════════════════════════════════════════════════
  // RESUMEN DIARIO  (consolidado por día del rango)
  // ══════════════════════════════════════════════════════════════════
  async resumenDiario(params: RangoCicloParams) {
    const { ciclo_id, desde, hasta } = params;
    const ahora = new Date();
    const fechaHasta = hasta ? new Date(hasta) : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaDesde = desde ? new Date(desde) : new Date(fechaHasta.getTime() - 13 * 24 * 3600 * 1000);
    const aulaIds = await this.scopedAulaIds(ciclo_id);

    const alumnos = await this.prisma.alumno.findMany({
      where: { deletedAt: null, ...(aulaIds !== undefined && { aulaId: { in: aulaIds } }) },
      select: { id: true },
    });
    const alumnoIds = alumnos.map((a) => a.id);
    const nScope = alumnos.length || 1;

    const registros = await this.prisma.asistencia.findMany({
      where: {
        tipoPersona: TipoPersona.alumno,
        fecha: { gte: fechaDesde, lte: fechaHasta },
        ...(aulaIds !== undefined && alumnoIds.length ? { alumnoId: { in: alumnoIds } } : {}),
      },
      select: { fecha: true, esTardanza: true, esAusente: true, justificacionRazon: true },
    });

    const porDia: Record<string, { presentes: number; tardanzas: number; faltas: number; justificadas: number }> = {};
    for (const r of registros) {
      const key = isoDate(r.fecha);
      if (!porDia[key]) porDia[key] = { presentes: 0, tardanzas: 0, faltas: 0, justificadas: 0 };
      if (r.esAusente) { porDia[key].faltas++; if (r.justificacionRazon) porDia[key].justificadas++; }
      else if (r.esTardanza) porDia[key].tardanzas++;
      else porDia[key].presentes++;
    }

    const dias: Array<Record<string, unknown>> = [];
    const totalDias = Math.round((fechaHasta.getTime() - fechaDesde.getTime()) / (24 * 3600 * 1000));
    for (let i = 0; i <= totalDias; i++) {
      const d = new Date(fechaDesde.getTime() + i * 24 * 3600 * 1000);
      const key = isoDate(d);
      const e = porDia[key] ?? { presentes: 0, tardanzas: 0, faltas: 0, justificadas: 0 };
      const asistio = e.presentes + e.tardanzas;
      dias.push({
        fecha: key,
        presentes: e.presentes, tardanzas: e.tardanzas, faltas: e.faltas, justificadas: e.justificadas,
        pct: Math.min(100, Math.round((asistio / nScope) * 100)),
      });
    }

    return { desde: isoDate(fechaDesde), hasta: isoDate(fechaHasta), total_alumnos: alumnos.length, dias };
  }
}
