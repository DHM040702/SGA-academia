'use client'

import { useState, useMemo } from 'react'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { useDocentes } from '@/hooks/use-docentes'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { PageHeader } from '@/components/layout/page-header'
import { Download, Filter, Search, X } from '@/components/icons'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts'
import * as XLSX from 'xlsx'
import type { ReportePDFProps } from '@/components/reportes/reporte-pdf'

/* ══════════════════════════════════════════════════════════════════
   TIPOS
══════════════════════════════════════════════════════════════════ */

// Asistencia
interface ReporteAsistenciaData {
  kpis: { asistencia_media: number; tardanzas_pct: number; puntualidad_docentes: number; sesiones_registradas: number }
  por_seccion: { aulaId: string; nombre: string; total_alumnos: number; pct_asistencia: number; pct_tardanza: number; sesiones: number }[]
  por_docente: { docente_id: string; nombre: string; asistencia_pct: number; puntualidad: number; total_sesiones: number; tardanzas: number }[]
  tendencia_30d: { fecha: string; pct: number; tardanzas: number }[]
}

// Alumnos
interface ReporteAlumnosData {
  kpis: { total: number; activos: number; observados: number; en_riesgo: number; sin_aula: number; con_apoderado: number }
  por_aula: { aulaId: string; nombre: string; turno: string; area: string; cupo_maximo: number; total_alumnos: number; ocupacion_pct: number; activos: number; observados: number; en_riesgo: number }[]
  por_area: { area: string; total: number; pct: number }[]
  por_carrera: { carreraId: string; nombre: string; area: string; total: number }[]
}

// Horarios
interface ReporteHorariosData {
  kpis: { total_clases: number; publicados: number; borradores: number; aulas_con_horario: number; docentes_activos: number }
  por_docente: { docente_id: string; nombre: string; total_clases: number; horas_semana: number; cursos_distintos: number; aulas_distintas: number; publicadas: number; borradores: number }[]
  por_aula: { aulaId: string; nombre: string; ciclo_nombre: string; total_clases: number; horas_semana: number; publicadas: number; borradores: number; cursos: string[]; docentes_count: number }[]
  por_dia: { dia: number; nombre: string; total_clases: number; horas: number }[]
}

// Cursos
interface ReporteCursosData {
  kpis: { total_cursos: number; con_horario: number; sin_horario: number; total_clases: number }
  por_curso: { cursoId: string; nombre: string; codigo: string; total_clases: number; publicadas: number; borradores: number; aulas_distintas: number; docentes_distintos: number; horas_semana: number }[]
}

type ReportTab = 'asistencia' | 'alumnos' | 'horarios' | 'cursos' | 'individual'
type SortDir   = 'asc' | 'desc'

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }

const PERIODOS = [
  { label: 'Hoy',             desde: () => toISODate(new Date()),  hasta: () => toISODate(new Date()) },
  { label: 'Últimos 7 días',  desde: () => toISODate(daysAgo(6)), hasta: () => toISODate(new Date()) },
  { label: 'Últimos 30 días', desde: () => toISODate(daysAgo(29)), hasta: () => toISODate(new Date()) },
  { label: 'Este mes',        desde: () => { const n = new Date(); return toISODate(new Date(n.getFullYear(), n.getMonth(), 1)) }, hasta: () => toISODate(new Date()) },
  { label: 'Ciclo completo',  desde: null, hasta: null },
  { label: 'Personalizado',   desde: null, hasta: null },
] as const
type PeriodoLabel = typeof PERIODOS[number]['label']

const AREA_LABEL: Record<string, string> = { ciencias: 'Ciencias', letras: 'Letras', medicas: 'Médicas' }
const AREA_COLOR: Record<string, string> = {
  ciencias: 'oklch(0.55 0.13 240)',
  letras:   'oklch(0.55 0.13 145)',
  medicas:  'oklch(0.55 0.13 30)',
}

/* ══════════════════════════════════════════════════════════════════
   HOOKS DE QUERY
══════════════════════════════════════════════════════════════════ */

function useReporteAsistencia(params: Record<string, string>, enabled: boolean) {
  return useQuery<ReporteAsistenciaData>({
    queryKey: ['reportes', 'asistencia', params],
    queryFn: async () => { const { data } = await api.get('/reportes/asistencia', { params }); return data },
    enabled, staleTime: 0,
  })
}
function useReporteAlumnos(params: Record<string, string>, enabled: boolean) {
  return useQuery<ReporteAlumnosData>({
    queryKey: ['reportes', 'alumnos', params],
    queryFn: async () => { const { data } = await api.get('/reportes/alumnos', { params }); return data },
    enabled, staleTime: 0,
  })
}
function useReporteHorarios(params: Record<string, string>, enabled: boolean) {
  return useQuery<ReporteHorariosData>({
    queryKey: ['reportes', 'horarios', params],
    queryFn: async () => { const { data } = await api.get('/reportes/horarios', { params }); return data },
    enabled, staleTime: 0,
  })
}
function useReporteCursos(params: Record<string, string>, enabled: boolean) {
  return useQuery<ReporteCursosData>({
    queryKey: ['reportes', 'cursos', params],
    queryFn: async () => { const { data } = await api.get('/reportes/cursos', { params }); return data },
    enabled, staleTime: 0,
  })
}

/* ══════════════════════════════════════════════════════════════════
   MICRO-COMPONENTES
══════════════════════════════════════════════════════════════════ */

function PctBar({ pct, warn = 85, reverse = false }: { pct: number; warn?: number; reverse?: boolean }) {
  const ok = reverse ? pct < warn : pct >= warn
  const color = ok ? 'var(--color-success)' : (pct < 70 && !reverse ? 'var(--color-danger)' : 'var(--color-warning)')
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-20 h-1.5 bg-surface-2 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="font-mono text-[12px] font-semibold tabular-nums">{pct}%</span>
    </div>
  )
}

function OcupBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-20 h-1.5 bg-surface-2 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full" style={{
          width: `${Math.min(pct, 100)}%`,
          background: pct > 100 ? 'var(--color-danger)' : pct >= 85 ? 'var(--color-warning)' : 'var(--color-primary)',
        }} />
      </div>
      <span className="font-mono text-[12px] font-semibold tabular-nums">{pct}%</span>
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[160px] max-w-[260px]">
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? 'Buscar…'}
        className="w-full pl-7 pr-2.5 py-1.5 text-[12px] border border-border rounded-2 bg-surface" />
    </div>
  )
}

function SortTh({ label, sortKey, current, dir, onSort, className = '' }: {
  label: string; sortKey: string; current: string; dir: SortDir
  onSort: (k: string) => void; className?: string
}) {
  const active = sortKey === current
  return (
    <th onClick={() => onSort(sortKey)}
      className={`text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold cursor-pointer select-none hover:text-text ${className}`}>
      {label}
      <span className={`ml-1 ${active ? 'text-primary' : 'opacity-30'}`}>
        {active && dir === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return <p className="text-[13px] text-text-mute text-center py-8">{msg}</p>
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-2 px-3 py-2 shadow-2 text-[12px]">
      <div className="text-text-mute mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.stroke ?? p.fill }}>{p.name}: {p.value}{typeof p.value === 'number' && p.name !== 'Clases' ? '%' : ''}</div>
      ))}
    </div>
  )
}

function MiniBar({ value, max, color = 'var(--color-primary)', label }: { value: number; max: number; color?: string; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[12px] w-20 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-[11px] text-text-mute w-8 text-right">{value}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   EXPORT HELPERS
══════════════════════════════════════════════════════════════════ */

async function exportPDF(props: ReportePDFProps) {
  const [{ pdf }, { ReporteAsistenciaPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/reportes/reporte-pdf'),
  ])
  const blob = await pdf(ReporteAsistenciaPDF({ ...props, logoUrl: `${window.location.origin}/logo.png`, logoUnasamUrl: `${window.location.origin}/logo-unasam.png` })).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `reporte-asistencia.pdf` })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportExcelAsistencia(r: ReporteAsistenciaData, periodo: string) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Métrica', 'Valor'],
    ['Asistencia media', `${r.kpis.asistencia_media}%`],
    ['Tardanzas', `${r.kpis.tardanzas_pct}%`],
    ['Puntualidad docentes', `${r.kpis.puntualidad_docentes}%`],
    ['Sesiones registradas', r.kpis.sesiones_registradas],
  ]), 'KPIs')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Aula', 'Alumnos', 'Sesiones', '% Asistencia', '% Tardanza'],
    ...r.por_seccion.map((s) => [s.nombre, s.total_alumnos, s.sesiones, s.pct_asistencia, s.pct_tardanza]),
  ]), 'Por aula')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Docente', 'Sesiones', 'Tardanzas', '% Puntualidad'],
    ...r.por_docente.map((d) => [d.nombre, d.total_sesiones, d.tardanzas, d.puntualidad]),
  ]), 'Docentes')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Fecha', '% Asistencia', '% Tardanzas'],
    ...r.tendencia_30d.map((t) => [t.fecha, t.pct, t.tardanzas]),
  ]), 'Tendencia')
  XLSX.writeFile(wb, `reporte-asistencia-${periodo.replace(/\s+/g, '-').toLowerCase()}.xlsx`)
}

function exportExcelAlumnos(r: ReporteAlumnosData) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Métrica', 'Valor'],
    ['Total alumnos', r.kpis.total], ['Activos', r.kpis.activos],
    ['Observados', r.kpis.observados], ['En riesgo', r.kpis.en_riesgo],
    ['Sin aula', r.kpis.sin_aula], ['Con apoderado', r.kpis.con_apoderado],
  ]), 'KPIs')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Aula', 'Área', 'Turno', 'Cupo', 'Alumnos', '% Ocupación', 'Activos', 'Observados', 'En riesgo'],
    ...r.por_aula.map((a) => [a.nombre, AREA_LABEL[a.area] ?? a.area, a.turno, a.cupo_maximo, a.total_alumnos, a.ocupacion_pct, a.activos, a.observados, a.en_riesgo]),
  ]), 'Por aula')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Carrera', 'Área', 'Alumnos'],
    ...r.por_carrera.map((c) => [c.nombre, AREA_LABEL[c.area] ?? c.area, c.total]),
  ]), 'Por carrera')
  XLSX.writeFile(wb, 'reporte-alumnos.xlsx')
}

function exportExcelHorarios(r: ReporteHorariosData) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Docente', 'Clases', 'Horas/sem', 'Cursos', 'Aulas', 'Publicadas', 'Borradores'],
    ...r.por_docente.map((d) => [d.nombre, d.total_clases, d.horas_semana, d.cursos_distintos, d.aulas_distintas, d.publicadas, d.borradores]),
  ]), 'Por docente')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Aula', 'Ciclo', 'Clases', 'Horas/sem', 'Publicadas', 'Borradores', 'Docentes', 'Cursos'],
    ...r.por_aula.map((a) => [a.nombre, a.ciclo_nombre, a.total_clases, a.horas_semana, a.publicadas, a.borradores, a.docentes_count, a.cursos.join(', ')]),
  ]), 'Por aula')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Día', 'Clases', 'Horas'],
    ...r.por_dia.map((d) => [d.nombre, d.total_clases, d.horas]),
  ]), 'Por día')
  XLSX.writeFile(wb, 'reporte-horarios.xlsx')
}

function exportExcelCursos(r: ReporteCursosData) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Curso', 'Código', 'Clases', 'Publicadas', 'Borradores', 'Aulas', 'Docentes', 'Horas/sem'],
    ...r.por_curso.map((c) => [c.nombre, c.codigo, c.total_clases, c.publicadas, c.borradores, c.aulas_distintas, c.docentes_distintos, c.horas_semana]),
  ]), 'Cursos')
  XLSX.writeFile(wb, 'reporte-cursos.xlsx')
}

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */

export default function ReportesPage() {
  const [tab, setTab] = useState<ReportTab>('asistencia')

  /* ── Datos comunes ── */
  const { data: ciclos = [] }  = useCiclos()
  const [cicloId, setCicloId]  = useState('')
  const { data: aulas  = [] }  = useAulas(cicloId || undefined)
  const [aulaId, setAulaId]    = useState('')
  const { data: docentesPage } = useDocentes({ limit: 200 })
  const docentes = (docentesPage as any)?.data ?? []
  const cicloActivo = ciclos.find((c) => c.activo)
  const [pdfLoading, setPdfLoading] = useState(false)

  /* ── Individual / lote carnets ── */
  const [indivSearch,      setIndivSearch]      = useState('')
  const [indivAlumno,      setIndivAlumno]      = useState<any>(null)
  const [informeLoading,   setInformeLoading]   = useState(false)

  const { data: indivResults = [] } = useQuery<any[]>({
    queryKey: ['alumnos', 'search-report', indivSearch],
    queryFn:  async () => {
      const { data } = await api.get('/alumnos', { params: { q: indivSearch, limit: 8, page: 1 } })
      return data?.data ?? []
    },
    enabled:   indivSearch.trim().length >= 2,
    staleTime: 30_000,
  })

/* ── Filtros — Asistencia ── */
  const [asisDocenteId, setAsisDocenteId] = useState('')
  const [periodo,    setPeriodo]    = useState<PeriodoLabel>('Últimos 30 días')
  const [desdeInput, setDesdeInput] = useState(toISODate(daysAgo(29)))
  const [hastaInput, setHastaInput] = useState(toISODate(new Date()))
  const periodoObj    = PERIODOS.find((p) => p.label === periodo)!
  const desdeEfec     = periodo === 'Personalizado' ? desdeInput : periodoObj.desde?.() ?? undefined
  const hastaEfec     = periodo === 'Personalizado' ? hastaInput : periodoObj.hasta?.() ?? undefined

  /* ── Filtros — Alumnos ── */
  const [alumnosArea, setAlumnosArea] = useState('')

  /* ── Filtros — Horarios ── */
  const [horDocenteId, setHorDocenteId]   = useState('')
  const [soloPublicados, setSoloPublicados] = useState(false)

  /* ── Filtros — Cursos ── */
  const [cursoConHorario, setCursoConHorario] = useState('')  // '' | 'true' | 'false'

  /* ── Filtros de tabla (cliente) ── */
  const [aulaSearch,  setAulaSearch]  = useState('')
  const [docSearch,   setDocSearch]   = useState('')
  const [cursoSearch, setCursoSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<'todos'|'optimo'|'regular'|'riesgo'>('todos')
  const [aulaSortKey, setAulaSortKey] = useState('pct_asistencia'); const [aulaSortDir, setAulaSortDir] = useState<SortDir>('asc')
  const [docSortKey,  setDocSortKey]  = useState('puntualidad');    const [docSortDir,  setDocSortDir]  = useState<SortDir>('asc')
  const [horDocSort,  setHorDocSort]  = useState('horas_semana');   const [horDocDir,   setHorDocDir]   = useState<SortDir>('desc')
  const [horAulaSort, setHorAulaSort] = useState('total_clases');   const [horAulaDir,  setHorAulaDir]  = useState<SortDir>('desc')
  const [almAulaSort, setAlmAulaSort] = useState('total_alumnos');  const [almAulaDir,  setAlmAulaDir]  = useState<SortDir>('desc')
  const [curSort,     setCurSort]     = useState('total_clases');   const [curDir,      setCurDir]      = useState<SortDir>('desc')

  /* ── Estados de query por tab ── */
  const [asisParams,  setAsisParams]   = useState<Record<string, string>>({})
  const [asisEnabled, setAsisEnabled]  = useState(false)
  const [almParams,   setAlmParams]    = useState<Record<string, string>>({})
  const [almEnabled,  setAlmEnabled]   = useState(false)
  const [horParams,   setHorParams]    = useState<Record<string, string>>({})
  const [horEnabled,  setHorEnabled]   = useState(false)
  const [curParams,   setCurParams]    = useState<Record<string, string>>({})
  const [curEnabled,  setCurEnabled]   = useState(false)

  const asisQ = useReporteAsistencia(asisParams, asisEnabled)
  const almQ  = useReporteAlumnos(almParams, almEnabled)
  const horQ  = useReporteHorarios(horParams, horEnabled)
  const curQ  = useReporteCursos(curParams, curEnabled)

  /* ── Generar reporte del tab activo ── */
  function handleGenerar() {
    const base: Record<string, string> = {}
    if (cicloId) base.ciclo_id = cicloId
    if (aulaId)  base.aula_id  = aulaId

    if (tab === 'asistencia') {
      if (desdeEfec)     base.desde       = desdeEfec
      if (hastaEfec)     base.hasta       = hastaEfec
      setAsisParams(base); setAsisEnabled(true)
      setAulaSearch(''); setDocSearch(''); setEstadoFiltro('todos')
    }
    if (tab === 'alumnos') {
      if (alumnosArea) base.area = alumnosArea
      setAlmParams(base); setAlmEnabled(true)
      setAulaSearch('')
    }
    if (tab === 'horarios') {
      if (horDocenteId)   base.docente_id     = horDocenteId
      if (soloPublicados) base.solo_publicados = 'true'
      setHorParams(base); setHorEnabled(true)
    }
    if (tab === 'cursos') {
      if (cursoConHorario) base.con_horario = cursoConHorario
      setCurParams(base); setCurEnabled(true)
      setCursoSearch('')
    }
  }

  /* ── Funciones de descarga — individual y lote ── */
  async function descargarReporteIndividual(alumno: any) {
    setInformeLoading(true)
    try {
      const resp = await api.get('/asistencia', { params: { alumno_id: alumno.id, limit: 500, page: 1 } })
      const registros = resp.data?.data ?? []
      const [{ pdf }, { ReporteAlumnoPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/reportes/reporte-alumno-pdf'),
      ])
      const blob = await pdf(ReporteAlumnoPDF({
        alumno, registros,
        logoUrl:       `${window.location.origin}/logo.png`,
        logoUnasamUrl: `${window.location.origin}/logo-unasam.png`,
      })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `reporte-${alumno.apellidos ?? 'alumno'}-${alumno.codigo_barra ?? ''}.pdf`,
      })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al generar informe:', err)
      alert('No se pudo generar el informe. Intenta nuevamente.')
    } finally {
      setInformeLoading(false)
    }
  }

/* ── Datos derivados ── */
  function sortRows<T>(rows: T[], key: string, dir: SortDir): T[] {
    return [...rows].sort((a: any, b: any) => {
      const av = a[key]; const bv = b[key]
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number)
      return dir === 'asc' ? cmp : -cmp
    })
  }
  function mkToggle(cur: string, setCur: (v: string) => void, curDir: SortDir, setDir: (v: SortDir) => void) {
    return (k: string) => {
      if (k === cur) setDir(curDir === 'asc' ? 'desc' : 'asc')
      else { setCur(k); setDir('asc') }
    }
  }

  const filteredAsisAulas = useMemo(() => {
    let rows = asisQ.data?.por_seccion ?? []
    if (aulaSearch) rows = rows.filter((r) => r.nombre.toLowerCase().includes(aulaSearch.toLowerCase()))
    if (estadoFiltro !== 'todos') rows = rows.filter((r) => {
      if (estadoFiltro === 'optimo')  return r.pct_asistencia >= 85
      if (estadoFiltro === 'regular') return r.pct_asistencia >= 70 && r.pct_asistencia < 85
      return r.pct_asistencia < 70
    })
    return sortRows(rows, aulaSortKey, aulaSortDir)
  }, [asisQ.data, aulaSearch, estadoFiltro, aulaSortKey, aulaSortDir])

  const filteredAsisDoc = useMemo(() => {
    let rows = asisQ.data?.por_docente ?? []
    if (docSearch) rows = rows.filter((r) => r.nombre.toLowerCase().includes(docSearch.toLowerCase()))
    return sortRows(rows, docSortKey, docSortDir)
  }, [asisQ.data, docSearch, docSortKey, docSortDir])

  const filteredAlmAulas = useMemo(() =>
    sortRows(almQ.data?.por_aula ?? [], almAulaSort, almAulaDir),
    [almQ.data, almAulaSort, almAulaDir])

  const filteredHorDoc = useMemo(() =>
    sortRows(horQ.data?.por_docente ?? [], horDocSort, horDocDir),
    [horQ.data, horDocSort, horDocDir])

  const filteredHorAula = useMemo(() =>
    sortRows(horQ.data?.por_aula ?? [], horAulaSort, horAulaDir),
    [horQ.data, horAulaSort, horAulaDir])

  const filteredCursos = useMemo(() => {
    let rows = curQ.data?.por_curso ?? []
    if (cursoSearch) rows = rows.filter((r) => r.nombre.toLowerCase().includes(cursoSearch.toLowerCase()) || r.codigo.toLowerCase().includes(cursoSearch.toLowerCase()))
    return sortRows(rows, curSort, curDir)
  }, [curQ.data, cursoSearch, curSort, curDir])

  const tendenciaData = useMemo(
    () => asisQ.data?.tendencia_30d.map((t) => ({ ...t, fecha: t.fecha.slice(5) })) ?? [],
    [asisQ.data],
  )

  /* ── Estado de carga del tab actual ── */
  const currentQ   = tab === 'asistencia' ? asisQ : tab === 'alumnos' ? almQ : tab === 'horarios' ? horQ : curQ
  const currentData = currentQ.data
  const isLoading  = currentQ.isFetching
  const isError    = currentQ.isError
  const triggered  = tab === 'asistencia' ? asisEnabled : tab === 'alumnos' ? almEnabled : tab === 'horarios' ? horEnabled : curEnabled

  /* ── Filtros comunes que aplican al tab actual ── */
  const showAula   = tab !== 'cursos'
  const showDocente = tab === 'asistencia' || tab === 'horarios'

  return (
    <>
      <PageHeader
        title="Reportes"
        crumbs={[{ label: 'Reportes' }]}
        action={
          <>
            {tab === 'asistencia' && asisQ.data && (
              <>
                <Btn variant="secondary" icon={<Download size={14} />} size="sm"
                  onClick={() => exportExcelAsistencia(asisQ.data!, periodo)}>Excel</Btn>
                <Btn icon={<Download size={14} />} size="sm" disabled={pdfLoading}
                  onClick={async () => {
                    setPdfLoading(true)
                    try { await exportPDF({ kpis: asisQ.data!.kpis, por_seccion: asisQ.data!.por_seccion, por_docente: asisQ.data!.por_docente, tendencia_30d: asisQ.data!.tendencia_30d, periodo, cicloNombre: cicloActivo?.nombre, desde: desdeEfec, hasta: hastaEfec }) }
                    finally { setPdfLoading(false) }
                  }}>{pdfLoading ? 'Generando…' : 'PDF'}</Btn>
              </>
            )}
            {tab === 'alumnos'  && almQ.data  && <Btn variant="secondary" icon={<Download size={14} />} size="sm" onClick={() => exportExcelAlumnos(almQ.data!)}>Excel</Btn>}
            {tab === 'horarios' && horQ.data  && <Btn variant="secondary" icon={<Download size={14} />} size="sm" onClick={() => exportExcelHorarios(horQ.data!)}>Excel</Btn>}
            {tab === 'cursos'   && curQ.data  && <Btn variant="secondary" icon={<Download size={14} />} size="sm" onClick={() => exportExcelCursos(curQ.data!)}>Excel</Btn>}
          </>
        }
      />

      <div className="p-4 md:p-7 flex flex-col gap-4">

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: 'asistencia', label: 'Asistencia',  sub: asisEnabled && asisQ.data ? `${asisQ.data.kpis.sesiones_registradas} sesiones` : '' },
            { key: 'alumnos',    label: 'Alumnos',      sub: almEnabled  && almQ.data  ? `${almQ.data.kpis.total} alumnos`  : '' },
            { key: 'horarios',   label: 'Horarios',     sub: horEnabled  && horQ.data  ? `${horQ.data.kpis.total_clases} clases` : '' },
            { key: 'cursos',     label: 'Cursos',       sub: curEnabled  && curQ.data  ? `${curQ.data.kpis.total_cursos} cursos` : '' },
            { key: 'individual', label: 'Por alumno',   sub: '' },
          ] as { key: ReportTab; label: string; sub: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[13px] border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-mute hover:text-text'
              }`}>
              {t.label}
              {t.sub && <span className="ml-1.5 text-[10px] text-text-mute">{t.sub}</span>}
            </button>
          ))}
        </div>

        {/* ── Panel de filtros ── */}
        {tab !== 'individual' && <div className="bg-surface border border-border rounded-3 p-4 shadow-1 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Ciclo — siempre */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Ciclo</label>
              <select value={cicloId} onChange={(e) => { setCicloId(e.target.value); setAulaId('') }}
                className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[160px]">
                <option value="">Todos los ciclos</option>
                {ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ★' : ''}</option>)}
              </select>
            </div>

            {/* Aula — no en tab Cursos */}
            {showAula && (
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Aula</label>
                <select value={aulaId} onChange={(e) => setAulaId(e.target.value)} disabled={!cicloId}
                  className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[140px] disabled:opacity-50">
                  <option value="">Todas las aulas</option>
                  {aulas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
            )}

            {/* Docente — en Asistencia y Horarios */}
            {showDocente && (
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Docente</label>
                <select
                  value={tab === 'asistencia' ? asisDocenteId : horDocenteId}
                  onChange={(e) => tab === 'asistencia' ? setAsisDocenteId(e.target.value) : setHorDocenteId(e.target.value)}
                  className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[180px]">
                  <option value="">Todos los docentes</option>
                  {docentes.map((d: any) => <option key={d.id} value={d.id}>{d.nombre} {d.apellidos}</option>)}
                </select>
              </div>
            )}

            {/* Filtros específicos por tab */}
            {tab === 'asistencia' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Período</label>
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoLabel)}
                    className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface">
                    {PERIODOS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
                  </select>
                </div>
                {periodo === 'Personalizado' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Desde</label>
                      <input type="date" value={desdeInput} onChange={(e) => setDesdeInput(e.target.value)}
                        className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Hasta</label>
                      <input type="date" value={hastaInput} onChange={(e) => setHastaInput(e.target.value)}
                        className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'alumnos' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Área</label>
                <select value={alumnosArea} onChange={(e) => setAlumnosArea(e.target.value)}
                  className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface">
                  <option value="">Todas las áreas</option>
                  <option value="ciencias">Ciencias</option>
                  <option value="letras">Letras</option>
                  <option value="medicas">Médicas</option>
                </select>
              </div>
            )}

            {tab === 'horarios' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={soloPublicados} onChange={(e) => setSoloPublicados(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary" />
                <span className="text-[13px]">Solo publicados</span>
              </label>
            )}

            {tab === 'cursos' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Estado</label>
                <select value={cursoConHorario} onChange={(e) => setCursoConHorario(e.target.value)}
                  className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface">
                  <option value="">Todos los cursos</option>
                  <option value="true">Con horario asignado</option>
                  <option value="false">Sin horario asignado</option>
                </select>
              </div>
            )}

            <div className="flex-1" />
            <Btn size="sm" onClick={handleGenerar} disabled={isLoading} icon={<Filter size={14} />}>
              {isLoading ? 'Generando…' : 'Generar reporte'}
            </Btn>
          </div>
        </div>}

        {/* ── Estado inicial / loading / error ── */}
        {tab !== 'individual' && !triggered && !isLoading && (
          <Card>
            <div className="py-14 text-center">
              <div className="text-[44px] mb-3">📊</div>
              <h3 className="font-serif text-[18px] font-semibold mb-2">Configure los filtros</h3>
              <p className="text-[13px] text-text-mute mb-5">Seleccione los parámetros y presione "Generar reporte".</p>
              <Btn onClick={handleGenerar}>Generar reporte</Btn>
            </div>
          </Card>
        )}
        {tab !== 'individual' && isLoading && (
          <Card><div className="py-14 text-center text-text-mute text-[13px]"><div className="text-[32px] mb-3 animate-pulse">⏳</div>Generando…</div></Card>
        )}
        {tab !== 'individual' && isError && !isLoading && (
          <Card><div className="py-12 text-center"><div className="text-[32px] mb-3">⚠️</div><p className="text-danger text-[13px] mb-4">Error al generar el reporte.</p><Btn variant="secondary" size="sm" onClick={handleGenerar}>Reintentar</Btn></div></Card>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB: ASISTENCIA
        ════════════════════════════════════════════════════════════ */}
        {tab === 'asistencia' && asisQ.data && !isLoading && (() => {
          const r = asisQ.data
          const k = r.kpis
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <KPI label="Asistencia media"    value={`${k.asistencia_media}%`}     sub={periodo}            accent="var(--color-primary)" />
                <KPI label="Tardanzas"           value={`${k.tardanzas_pct}%`}        sub="del total"          accent="var(--color-warning)" />
                <KPI label="Puntualidad doc."    value={`${k.puntualidad_docentes}%`} sub="del período"        accent="var(--color-success)" />
                <KPI label="Sesiones registradas" value={k.sesiones_registradas}      sub={cicloActivo?.nombre ?? '—'} accent="var(--color-info)" />
              </div>

              {tendenciaData.length > 0 && (
                <Card title="Tendencia de asistencia" subtitle={`${periodo} · línea 85% = umbral óptimo`}>
                  <div className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={tendenciaData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--color-text-mute)' }} interval="preserveStartEnd" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-mute)' }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<ChartTooltip />} />
                        <ReferenceLine y={85} stroke="var(--color-success)" strokeDasharray="4 3" strokeOpacity={0.6} />
                        <Line type="monotone" dataKey="pct" name="Asistencia" stroke="var(--color-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="tardanzas" name="Tardanzas" stroke="var(--color-warning)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" activeDot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Tabla aulas */}
              <Card title="Asistencia por aula" subtitle={`${filteredAsisAulas.length} de ${r.por_seccion.length} aulas`}>
                <div className="px-3.5 pb-3 flex flex-wrap gap-2 items-center border-b border-border-s">
                  <SearchInput value={aulaSearch} onChange={setAulaSearch} placeholder="Buscar aula…" />
                  <div className="flex rounded-2 border border-border overflow-hidden text-[11px]">
                    {(['todos','optimo','regular','riesgo'] as const).map((e) => (
                      <button key={e} onClick={() => setEstadoFiltro(e)}
                        className={`px-2.5 py-1.5 transition-colors whitespace-nowrap ${estadoFiltro === e ? (e==='optimo'?'bg-success text-white':e==='regular'?'bg-warning text-white':e==='riesgo'?'bg-danger text-white':'bg-primary text-white') + ' font-medium' : 'bg-surface hover:bg-surface-2 text-text-mute'}`}>
                        {e==='todos'?'Todos':e==='optimo'?'≥85%':e==='regular'?'70-84%':'<70%'}
                      </button>
                    ))}
                  </div>
                  {(aulaSearch || estadoFiltro !== 'todos') && (
                    <button onClick={() => { setAulaSearch(''); setEstadoFiltro('todos') }} className="text-[11px] text-text-mute hover:text-text flex items-center gap-1"><X size={11}/> Limpiar</button>
                  )}
                </div>
                {filteredAsisAulas.length > 0 ? (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/50">
                        {[['nombre','Aula'],['total_alumnos','Alumnos'],['sesiones','Sesiones'],['pct_asistencia','Asistencia'],['pct_tardanza','Tardanza']].map(([k,l]) => (
                          <SortTh key={k} label={l} sortKey={k} current={aulaSortKey} dir={aulaSortDir} onSort={mkToggle(aulaSortKey,setAulaSortKey,aulaSortDir,setAulaSortDir)} />
                        ))}
                        <th className="px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAsisAulas.map((s) => (
                        <tr key={s.aulaId} className="border-t border-border-s hover:bg-surface-2/40">
                          <td className="px-3.5 py-2.5 font-semibold">{s.nombre}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{s.total_alumnos}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{s.sesiones}</td>
                          <td className="px-3.5 py-2.5"><PctBar pct={s.pct_asistencia} /></td>
                          <td className="px-3.5 py-2.5"><PctBar pct={s.pct_tardanza} warn={999} /></td>
                          <td className="px-3.5 py-2.5">
                            <Pill tone={s.pct_asistencia>=85?'success':s.pct_asistencia>=70?'warning':'danger'}>
                              {s.pct_asistencia>=85?'Óptimo':s.pct_asistencia>=70?'Regular':'En riesgo'}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState msg={r.por_seccion.length===0?'Sin datos para el período.':'Ninguna aula coincide con los filtros.'} />}
              </Card>

              {/* Tabla docentes */}
              <Card title="Puntualidad de docentes" subtitle={`${filteredAsisDoc.length} docentes`}>
                <div className="px-3.5 pb-3 flex gap-2 items-center border-b border-border-s">
                  <SearchInput value={docSearch} onChange={setDocSearch} placeholder="Buscar docente…" />
                  {docSearch && <button onClick={()=>setDocSearch('')} className="text-[11px] text-text-mute hover:text-text flex items-center gap-1"><X size={11}/>Limpiar</button>}
                  {filteredAsisDoc.length>0 && <span className="ml-auto text-[11px] text-text-mute">Prom: <strong>{Math.round(filteredAsisDoc.reduce((s,d)=>s+d.puntualidad,0)/filteredAsisDoc.length)}%</strong></span>}
                </div>
                {filteredAsisDoc.length > 0 ? (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/50">
                        {[['nombre','Docente'],['total_sesiones','Sesiones'],['tardanzas','Tardanzas'],['puntualidad','Puntualidad']].map(([k,l]) => (
                          <SortTh key={k} label={l} sortKey={k} current={docSortKey} dir={docSortDir} onSort={mkToggle(docSortKey,setDocSortKey,docSortDir,setDocSortDir)} />
                        ))}
                        <th className="px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAsisDoc.map((d) => (
                        <tr key={d.docente_id} className="border-t border-border-s hover:bg-surface-2/40">
                          <td className="px-3.5 py-2.5 font-medium">{d.nombre}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{d.total_sesiones}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-warning">{d.tardanzas}</td>
                          <td className="px-3.5 py-2.5"><PctBar pct={d.puntualidad} /></td>
                          <td className="px-3.5 py-2.5">
                            <Pill tone={d.puntualidad>=90?'success':d.puntualidad>=75?'warning':'danger'}>
                              {d.puntualidad>=90?'Puntual':d.puntualidad>=75?'Regular':'Con tardanzas'}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState msg="Sin registros de docentes en el período." />}
              </Card>
            </>
          )
        })()}

        {/* ════════════════════════════════════════════════════════════
            TAB: ALUMNOS
        ════════════════════════════════════════════════════════════ */}
        {tab === 'alumnos' && almQ.data && !isLoading && (() => {
          const r = almQ.data; const k = r.kpis
          const maxCarrera = Math.max(...r.por_carrera.map((c) => c.total), 1)
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <KPI label="Total alumnos"  value={k.total}         sub="en scope"               accent="var(--color-primary)" />
                <KPI label="Activos"        value={k.activos}       sub="asistencia ≥85%"        accent="var(--color-success)" />
                <KPI label="Observados"     value={k.observados}    sub="asistencia 75-84%"      accent="var(--color-warning)" />
                <KPI label="En riesgo"      value={k.en_riesgo}     sub="asistencia <75%"        accent="var(--color-danger)" />
                <KPI label="Sin aula"       value={k.sin_aula}      sub="no asignados"           accent="var(--color-info)" />
                <KPI label="Con apoderado"  value={k.con_apoderado} sub={`${k.total>0?Math.round(k.con_apoderado/k.total*100):0}% del total`} accent="oklch(0.55 0.13 280)" />
              </div>

              <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* Tabla aulas */}
                <Card title="Matrícula por aula" subtitle={`${r.por_aula.length} aulas`}>
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/50">
                        {[['nombre','Aula'],['total_alumnos','Alumnos'],['ocupacion_pct','Ocupación'],['activos','Activos'],['en_riesgo','En riesgo']].map(([k2,l]) => (
                          <SortTh key={k2} label={l} sortKey={k2} current={almAulaSort} dir={almAulaDir} onSort={mkToggle(almAulaSort,setAlmAulaSort,almAulaDir,setAlmAulaDir)} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlmAulas.map((a) => (
                        <tr key={a.aulaId} className="border-t border-border-s hover:bg-surface-2/40">
                          <td className="px-3.5 py-2.5">
                            <div className="font-semibold">{a.nombre}</div>
                            <div className="text-[11px] text-text-mute">{AREA_LABEL[a.area]??a.area} · {a.turno}</div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="font-mono font-semibold">{a.total_alumnos}</span>
                            <span className="text-[11px] text-text-mute">/{a.cupo_maximo}</span>
                          </td>
                          <td className="px-3.5 py-2.5"><OcupBar pct={a.ocupacion_pct} /></td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-success">{a.activos}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-danger">{a.en_riesgo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                {/* Panel derecho: por área + por carrera */}
                <div className="flex flex-col gap-3">
                  <Card title="Distribución por área">
                    <div className="p-3 flex flex-col gap-1">
                      {r.por_area.map((a) => (
                        <MiniBar key={a.area} label={AREA_LABEL[a.area]??a.area} value={a.total} max={k.total} color={AREA_COLOR[a.area]} />
                      ))}
                      {r.por_area.every((a) => a.total === 0) && <span className="text-[12px] text-text-mute">Sin datos</span>}
                    </div>
                  </Card>
                  <Card title="Carreras más elegidas">
                    <div className="px-3 pb-3 flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
                      {r.por_carrera.slice(0, 12).map((c) => (
                        <MiniBar key={c.carreraId} label={c.nombre} value={c.total} max={maxCarrera} color={AREA_COLOR[c.area]} />
                      ))}
                      {r.por_carrera.length === 0 && <span className="text-[12px] text-text-mute py-2">Sin datos</span>}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )
        })()}

        {/* ════════════════════════════════════════════════════════════
            TAB: HORARIOS
        ════════════════════════════════════════════════════════════ */}
        {tab === 'horarios' && horQ.data && !isLoading && (() => {
          const r = horQ.data; const k = r.kpis
          const maxClases = Math.max(...r.por_dia.map((d) => d.total_clases), 1)
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <KPI label="Total clases"    value={k.total_clases}      sub="horarios registrados"   accent="var(--color-primary)" />
                <KPI label="Publicados"      value={k.publicados}        sub={`${k.total_clases>0?Math.round(k.publicados/k.total_clases*100):0}% del total`} accent="var(--color-success)" />
                <KPI label="Borradores"      value={k.borradores}        sub="pendiente publicar"     accent="var(--color-warning)" />
                <KPI label="Aulas cubiertas" value={k.aulas_con_horario} sub="con al menos 1 clase"   accent="var(--color-info)" />
                <KPI label="Docentes activos" value={k.docentes_activos} sub="con clases asignadas"   accent="oklch(0.55 0.13 145)" />
              </div>

              {/* Gráfico por día */}
              <Card title="Distribución por día de semana">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px]">
                  <div className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={r.por_dia} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--color-text-mute)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-mute)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total_clases" name="Clases" radius={[3, 3, 0, 0]}>
                          {r.por_dia.map((_, i) => <Cell key={i} fill="var(--color-primary)" fillOpacity={0.7 + i * 0.05} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 py-4 pr-4">
                    {r.por_dia.map((d) => (
                      <MiniBar key={d.dia} label={d.nombre} value={d.total_clases} max={maxClases} />
                    ))}
                  </div>
                </div>
              </Card>

              {/* Tabla docentes */}
              <Card title="Carga docente" subtitle={`${r.por_docente.length} docentes`}>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/50">
                      {[['nombre','Docente'],['total_clases','Clases'],['horas_semana','Horas/sem'],['cursos_distintos','Cursos'],['aulas_distintas','Aulas'],['publicadas','Publicadas'],['borradores','Borradores']].map(([k2,l]) => (
                        <SortTh key={k2} label={l} sortKey={k2} current={horDocSort} dir={horDocDir} onSort={mkToggle(horDocSort,setHorDocSort,horDocDir,setHorDocDir)} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHorDoc.map((d) => (
                      <tr key={d.docente_id} className="border-t border-border-s hover:bg-surface-2/40">
                        <td className="px-3.5 py-2.5 font-medium">{d.nombre}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{d.total_clases}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold">{d.horas_semana}h</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{d.cursos_distintos}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{d.aulas_distintas}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-success">{d.publicadas}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-warning">{d.borradores}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Tabla aulas */}
              <Card title="Cobertura por aula" subtitle={`${r.por_aula.length} aulas`}>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/50">
                      {[['nombre','Aula'],['ciclo_nombre','Ciclo'],['total_clases','Clases'],['horas_semana','Horas/sem'],['docentes_count','Docentes'],['publicadas','Publicadas'],['borradores','Borradores']].map(([k2,l]) => (
                        <SortTh key={k2} label={l} sortKey={k2} current={horAulaSort} dir={horAulaDir} onSort={mkToggle(horAulaSort,setHorAulaSort,horAulaDir,setHorAulaDir)} />
                      ))}
                      <th className="px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold text-left">Cursos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHorAula.map((a) => (
                      <tr key={a.aulaId} className="border-t border-border-s hover:bg-surface-2/40">
                        <td className="px-3.5 py-2.5 font-semibold">{a.nombre}</td>
                        <td className="px-3.5 py-2.5 text-text-mute text-[12px]">{a.ciclo_nombre}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{a.total_clases}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold">{a.horas_semana}h</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{a.docentes_count}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-success">{a.publicadas}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-warning">{a.borradores}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {a.cursos.slice(0, 3).map((c) => (
                              <span key={c} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{c}</span>
                            ))}
                            {a.cursos.length > 3 && <span className="text-[10px] text-text-mute">+{a.cursos.length - 3}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )
        })()}

        {/* ════════════════════════════════════════════════════════════
            TAB: CURSOS
        ════════════════════════════════════════════════════════════ */}
        {tab === 'cursos' && curQ.data && !isLoading && (() => {
          const r = curQ.data; const k = r.kpis
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <KPI label="Total cursos"   value={k.total_cursos} sub="en catálogo"        accent="var(--color-primary)" />
                <KPI label="Con horario"    value={k.con_horario}  sub={`${k.total_cursos>0?Math.round(k.con_horario/k.total_cursos*100):0}% del total`} accent="var(--color-success)" />
                <KPI label="Sin horario"    value={k.sin_horario}  sub="pendiente asignar"  accent="var(--color-warning)" />
                <KPI label="Total clases"   value={k.total_clases} sub="entradas de horario" accent="var(--color-info)" />
              </div>

              <Card title="Catálogo de cursos" subtitle={`${filteredCursos.length} de ${r.por_curso.length} cursos`}>
                <div className="px-3.5 pb-3 flex gap-2 items-center border-b border-border-s">
                  <SearchInput value={cursoSearch} onChange={setCursoSearch} placeholder="Buscar curso o código…" />
                  {cursoSearch && <button onClick={()=>setCursoSearch('')} className="text-[11px] text-text-mute hover:text-text flex items-center gap-1"><X size={11}/>Limpiar</button>}
                </div>
                {filteredCursos.length > 0 ? (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/50">
                        {[['nombre','Curso'],['codigo','Código'],['total_clases','Clases'],['horas_semana','Horas/sem'],['aulas_distintas','Aulas'],['docentes_distintos','Docentes'],['publicadas','Publicadas'],['borradores','Borradores']].map(([k2,l]) => (
                          <SortTh key={k2} label={l} sortKey={k2} current={curSort} dir={curDir} onSort={mkToggle(curSort,setCurSort,curDir,setCurDir)} />
                        ))}
                        <th className="px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCursos.map((c) => (
                        <tr key={c.cursoId} className="border-t border-border-s hover:bg-surface-2/40">
                          <td className="px-3.5 py-2.5 font-medium">{c.nombre}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="font-mono text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{c.codigo}</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold">{c.total_clases}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{c.horas_semana}h</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{c.aulas_distintas}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{c.docentes_distintos}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-success">{c.publicadas}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-warning">{c.borradores}</td>
                          <td className="px-3.5 py-2.5">
                            {c.total_clases > 0
                              ? <Pill tone={c.publicadas === c.total_clases ? 'success' : c.publicadas > 0 ? 'warning' : 'neutral'}>
                                  {c.publicadas === c.total_clases ? 'Publicado' : c.publicadas > 0 ? 'Parcial' : 'Borrador'}
                                </Pill>
                              : <Pill tone="neutral">Sin asignar</Pill>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState msg={r.por_curso.length===0?'No hay cursos registrados.':'Ningún curso coincide con la búsqueda.'} />}
              </Card>
            </>
          )
        })()}

        {/* ════════════════════════════════════════════════════════════
            TAB: POR ALUMNO — informe individual + carnets en lote
        ════════════════════════════════════════════════════════════ */}
        {tab === 'individual' && (
          <>
            {/* ── Informe / carnet individual ── */}
            <Card title="Informe individual de asistencia"
              subtitle="Busca un alumno y descarga su informe completo de asistencia en PDF">
              <div className="p-4 flex flex-col gap-4">

                {/* Buscador */}
                {!indivAlumno && (
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
                    <input
                      type="text"
                      value={indivSearch}
                      onChange={(e) => setIndivSearch(e.target.value)}
                      placeholder="Buscar alumno por nombre, apellidos o DNI…"
                      autoComplete="off"
                      className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {/* Resultados */}
                    {indivSearch.trim().length >= 2 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-2 overflow-hidden">
                        {indivResults.length === 0 ? (
                          <p className="text-[12px] text-text-mute text-center py-3">Sin resultados para «{indivSearch}»</p>
                        ) : indivResults.map((a: any) => (
                          <button key={a.id}
                            onClick={() => { setIndivAlumno(a); setIndivSearch('') }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-surface-2 text-[13px] flex justify-between items-center gap-3 border-b border-border-s last:border-0">
                            <div>
                              <span className="font-semibold">{a.apellidos ?? ''}{a.apellidos ? ', ' : ''}{a.nombres ?? a.nombre ?? ''}</span>
                              {a.dni && <span className="text-text-mute ml-2 text-[11px]">DNI: {a.dni}</span>}
                              {a.aula && <span className="text-text-mute ml-2 text-[11px]">· {a.aula.nombre}</span>}
                            </div>
                            <span className="font-mono text-[11px] text-primary flex-shrink-0">{a.codigo_barra}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Alumno seleccionado */}
                {indivAlumno && (
                  <div className="rounded-3 border border-border bg-surface-2/40 p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary font-bold text-[16px] select-none">
                      {[indivAlumno.nombres ?? indivAlumno.nombre ?? '', indivAlumno.apellidos ?? '']
                        .join(' ').trim().split(/\s+/).slice(0, 2)
                        .map((w: string) => w[0] ?? '').join('').toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] leading-tight truncate">
                        {indivAlumno.apellidos ?? ''}{indivAlumno.apellidos ? ', ' : ''}
                        {indivAlumno.nombres ?? indivAlumno.nombre ?? ''}
                      </p>
                      <p className="text-[12px] text-text-mute mt-0.5">
                        Cód: <span className="font-mono">{indivAlumno.codigo_barra ?? '—'}</span>
                        {indivAlumno.dni && <> · DNI: {indivAlumno.dni}</>}
                        {indivAlumno.aula && <> · Aula: <strong>{indivAlumno.aula.nombre}</strong></>}
                      </p>
                    </div>
                    {/* Acciones */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Btn size="sm" icon={<Download size={14} />}
                        disabled={informeLoading}
                        onClick={() => descargarReporteIndividual(indivAlumno)}>
                        {informeLoading ? 'Generando…' : 'Informe PDF'}
                      </Btn>
                    </div>
                    <button onClick={() => setIndivAlumno(null)}
                      className="ml-1 text-text-mute hover:text-text flex-shrink-0" title="Limpiar selección">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!indivAlumno && indivSearch.trim().length < 2 && (
                  <p className="text-[12px] text-text-mute text-center py-2">
                    Escribe al menos 2 caracteres para buscar.
                  </p>
                )}
              </div>
            </Card>

          </>
        )}

      </div>
    </>
  )
}
