'use client'

import { useState, useMemo } from 'react'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { PageHeader } from '@/components/layout/page-header'
import { Download, Filter } from '@/components/icons'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import * as XLSX from 'xlsx'
import type { ReportePDFProps } from '@/components/reportes/reporte-pdf'

/* ─── Tipos del response ──────────────────────────────────────── */
interface ReporteKpis {
  asistencia_media: number
  tardanzas_pct: number
  puntualidad_docentes: number
  sesiones_registradas: number
}
interface SeccionRow {
  aulaId: string; nombre: string; total_alumnos: number
  pct_asistencia: number; pct_tardanza: number
}
interface DocenteRow {
  docente_id: string; nombre: string
  asistencia_pct: number; puntualidad: number; total_sesiones: number
}
interface TendenciaRow { fecha: string; pct: number }
interface ReporteData {
  kpis: ReporteKpis
  por_seccion: SeccionRow[]
  por_docente: DocenteRow[]
  tendencia_30d: TendenciaRow[]
}

/* ─── Helpers de fechas ───────────────────────────────────────── */
function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d
}

const PERIODOS = [
  { label: 'Últimos 7 días',  desde: () => toISODate(daysAgo(6)),  hasta: () => toISODate(new Date()) },
  { label: 'Últimos 30 días', desde: () => toISODate(daysAgo(29)), hasta: () => toISODate(new Date()) },
  { label: 'Ciclo completo',  desde: null, hasta: null },
  { label: 'Personalizado',   desde: null, hasta: null },
] as const
type PeriodoLabel = typeof PERIODOS[number]['label']

/* ─── Hook ────────────────────────────────────────────────────── */
function useReporte(params: {
  ciclo_id?: string; aula_id?: string; desde?: string; hasta?: string
}, enabled: boolean) {
  return useQuery<ReporteData>({
    queryKey: ['reportes', 'asistencia', params],
    queryFn: async () => {
      const p: Record<string, string> = {}
      if (params.ciclo_id) p.ciclo_id = params.ciclo_id
      if (params.aula_id)  p.aula_id  = params.aula_id
      if (params.desde)    p.desde    = params.desde
      if (params.hasta)    p.hasta    = params.hasta
      const { data } = await api.get('/reportes/asistencia', { params: p })
      return data
    },
    enabled,
    staleTime: 0,
  })
}

/* ─── Export helpers ──────────────────────────────────────────── */
function exportExcel(reporte: ReporteData, periodo: string) {
  const wb = XLSX.utils.book_new()

  // Hoja 1: KPIs
  const kpiRows = [
    ['Métrica', 'Valor'],
    ['Asistencia media', `${reporte.kpis.asistencia_media}%`],
    ['Tardanzas', `${reporte.kpis.tardanzas_pct}%`],
    ['Puntualidad docentes', `${reporte.kpis.puntualidad_docentes}%`],
    ['Sesiones registradas', reporte.kpis.sesiones_registradas],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPIs')

  // Hoja 2: Por sección
  const secRows = [
    ['Sección', 'Alumnos', '% Asistencia', '% Tardanza'],
    ...reporte.por_seccion.map((s) => [s.nombre, s.total_alumnos, s.pct_asistencia, s.pct_tardanza]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(secRows), 'Por sección')

  // Hoja 3: Por docente
  const docRows = [
    ['Docente', 'Sesiones', '% Puntualidad'],
    ...reporte.por_docente.map((d) => [d.nombre, d.total_sesiones, d.puntualidad]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(docRows), 'Docentes')

  // Hoja 4: Tendencia
  const tendRows = [
    ['Fecha', '% Asistencia'],
    ...reporte.tendencia_30d.map((t) => [t.fecha, t.pct]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tendRows), 'Tendencia')

  XLSX.writeFile(wb, `reporte-asistencia-${periodo.replace(/\s+/g, '-').toLowerCase()}.xlsx`)
}

async function exportPDF(props: ReportePDFProps) {
  // Importación dinámica para evitar problemas de SSR con @react-pdf/renderer
  const [{ pdf }, { ReporteAsistenciaPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/reportes/reporte-pdf'),
  ])

  // URL absoluta del logo (debe existir en /public/logo.png)
  const logoUrl      = `${window.location.origin}/logo.png`
  const logoUnasamUrl = `${window.location.origin}/logo-unasam.png`

  const elemento = ReporteAsistenciaPDF({ ...props, logoUrl, logoUnasamUrl })
  const blob = await pdf(elemento).toBlob()

  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `reporte-asistencia-${props.periodo.replace(/\s+/g, '-').toLowerCase()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── Barra de progreso ───────────────────────────────────────── */
function PctBar({ pct, warn = 85 }: { pct: number; warn?: number }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-20 h-1.5 bg-surface2 rounded-full overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: pct < warn ? 'var(--color-warning)' : 'var(--color-success)',
          }}
        />
      </div>
      <span className="font-mono text-[12px] font-semibold tabular-nums">{pct}%</span>
    </div>
  )
}

/* ─── Tooltip custom para el gráfico ─────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-2 px-3 py-2 shadow-2 text-[12px]">
      <div className="text-text-mute mb-0.5">{label}</div>
      <div className="font-semibold text-primary">{payload[0].value}% asistencia</div>
    </div>
  )
}

/* ─── Página principal ────────────────────────────────────────── */
export default function ReportesPage() {
  /* filtros */
  const [cicloId,    setCicloId]    = useState('')
  const [aulaId,     setAulaId]     = useState('')
  const [periodo,    setPeriodo]    = useState<PeriodoLabel>('Últimos 30 días')
  const [desdeInput, setDesdeInput] = useState(toISODate(daysAgo(29)))
  const [hastaInput, setHastaInput] = useState(toISODate(new Date()))
  const [triggered,   setTriggered]   = useState(false)
  const [pdfLoading,  setPdfLoading]  = useState(false)
  const [queryParams, setQueryParams] = useState<{
    ciclo_id?: string; aula_id?: string; desde?: string; hasta?: string
  }>({})

  const { data: ciclos = [] } = useCiclos()
  const { data: aulas  = [] } = useAulas(cicloId || undefined)
  const cicloActivo = ciclos.find((c) => c.activo)

  /* Calcular desde/hasta según período seleccionado */
  const periodoObj = PERIODOS.find((p) => p.label === periodo)!
  const desdeEfectivo = periodo === 'Personalizado'
    ? desdeInput
    : periodoObj.desde?.() ?? undefined
  const hastaEfectivo = periodo === 'Personalizado'
    ? hastaInput
    : periodoObj.hasta?.() ?? undefined

  const { data: reporte, isFetching, isError } = useReporte(queryParams, triggered)

  function handleGenerar() {
    const params: typeof queryParams = {}
    if (cicloId)        params.ciclo_id = cicloId
    if (aulaId)         params.aula_id  = aulaId
    if (desdeEfectivo)  params.desde    = desdeEfectivo
    if (hastaEfectivo)  params.hasta    = hastaEfectivo
    setQueryParams(params)
    setTriggered(true)
  }

  const kpis = reporte?.kpis
  const tendenciaData = useMemo(
    () => reporte?.tendencia_30d.map((t) => ({ ...t, fecha: t.fecha.slice(5) })) ?? [],
    [reporte],
  )

  return (
    <>
      <PageHeader
        title="Reportes"
        crumbs={[{ label: 'Reportes' }]}
        action={
          <>
            <Btn
              variant="secondary"
              icon={<Download size={14} />}
              size="sm"
              disabled={!reporte}
              onClick={() => reporte && exportExcel(reporte, periodo)}
            >
              Excel
            </Btn>
            <Btn
              icon={<Download size={14} />}
              size="sm"
              disabled={!reporte || pdfLoading}
              onClick={async () => {
                if (!reporte) return
                setPdfLoading(true)
                try {
                  await exportPDF({
                    kpis:          reporte.kpis,
                    por_seccion:   reporte.por_seccion,
                    por_docente:   reporte.por_docente,
                    tendencia_30d: reporte.tendencia_30d,
                    periodo,
                    cicloNombre:   cicloId ? ciclos.find((c) => c.id === cicloId)?.nombre : cicloActivo?.nombre,
                    desde:         desdeEfectivo,
                    hasta:         hastaEfectivo,
                  })
                } finally {
                  setPdfLoading(false)
                }
              }}
            >
              {pdfLoading ? 'Generando…' : 'PDF'}
            </Btn>
          </>
        }
      />

      <div className="p-7 flex flex-col gap-4 print:p-4">

        {/* ── Filtros ── */}
        <div className="flex flex-wrap gap-3 items-end bg-surface border border-border rounded-3 p-4 shadow-1 print:hidden">

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Ciclo</label>
            <select
              value={cicloId}
              onChange={(e) => { setCicloId(e.target.value); setAulaId('') }}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[160px]"
            >
              <option value="">Todos los ciclos</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ★' : ''}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Aula</label>
            <select
              value={aulaId}
              onChange={(e) => setAulaId(e.target.value)}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[140px]"
              disabled={!cicloId}
            >
              <option value="">Todas las aulas</option>
              {aulas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoLabel)}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface"
            >
              {PERIODOS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>

          {periodo === 'Personalizado' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Desde</label>
                <input
                  type="date"
                  value={desdeInput}
                  onChange={(e) => setDesdeInput(e.target.value)}
                  className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Hasta</label>
                <input
                  type="date"
                  value={hastaInput}
                  onChange={(e) => setHastaInput(e.target.value)}
                  className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface"
                />
              </div>
            </>
          )}

          <div className="flex-1" />

          <Btn size="sm" onClick={handleGenerar} disabled={isFetching} icon={<Filter size={14} />}>
            {isFetching ? 'Generando…' : 'Generar reporte'}
          </Btn>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <KPI
            label="Asistencia media"
            value={kpis ? `${kpis.asistencia_media}%` : '—'}
            sub={triggered ? periodo : 'Genere un reporte'}
            accent="var(--color-primary)"
          />
          <KPI
            label="Tardanzas"
            value={kpis ? `${kpis.tardanzas_pct}%` : '—'}
            sub="del total de registros"
            accent="var(--color-warning)"
          />
          <KPI
            label="Puntualidad docentes"
            value={kpis ? `${kpis.puntualidad_docentes}%` : '—'}
            sub="del período"
            accent="var(--color-success)"
          />
          <KPI
            label="Sesiones registradas"
            value={kpis?.sesiones_registradas ?? '—'}
            sub={cicloActivo ? `Ciclo: ${cicloActivo.nombre}` : 'Sin ciclo activo'}
            accent="var(--color-info)"
          />
        </div>

        {/* ── Estado inicial ── */}
        {!triggered && !isFetching && (
          <Card>
            <div className="py-16 text-center">
              <div className="text-[48px] mb-4">📊</div>
              <h3 className="font-serif text-[20px] font-semibold mb-2">Configure los filtros</h3>
              <p className="text-[13px] text-text-mute mb-6">
                Seleccione el ciclo y período, luego presione "Generar reporte".
              </p>
              <Btn onClick={handleGenerar}>Generar reporte</Btn>
            </div>
          </Card>
        )}

        {/* ── Cargando ── */}
        {isFetching && (
          <Card>
            <div className="py-16 text-center text-text-mute text-[13px]">
              <div className="text-[32px] mb-3 animate-pulse">⏳</div>
              Generando reporte…
            </div>
          </Card>
        )}

        {/* ── Error ── */}
        {isError && !isFetching && (
          <Card>
            <div className="py-12 text-center">
              <div className="text-[32px] mb-3">⚠️</div>
              <p className="text-danger text-[13px] mb-4">Error al obtener el reporte.</p>
              <Btn variant="secondary" size="sm" onClick={handleGenerar}>Reintentar</Btn>
            </div>
          </Card>
        )}

        {/* ── Resultados ── */}
        {reporte && !isFetching && (
          <>
            {/* Tendencia */}
            {tendenciaData.length > 0 && (
              <Card title="Tendencia de asistencia" subtitle="Últimos 30 días">
                <div className="px-4 pb-4 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tendenciaData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 10, fill: 'var(--color-text-mute)' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: 'var(--color-text-mute)' }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="pct"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Por aula */}
            {reporte.por_seccion.length > 0 && (
              <Card title="Asistencia por aula" subtitle={`${reporte.por_seccion.length} aulas`}>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-surface2/50">
                      {['Aula', 'Alumnos', '% Asistencia', '% Tardanza', 'Estado'].map((h) => (
                        <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_seccion.map((s) => (
                      <tr key={s.aulaId} className="border-t border-border-s hover:bg-surface2/40 transition-colors">
                        <td className="px-3.5 py-2.5 font-semibold">{s.nombre}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{s.total_alumnos}</td>
                        <td className="px-3.5 py-2.5">
                          <PctBar pct={s.pct_asistencia} warn={85} />
                        </td>
                        <td className="px-3.5 py-2.5">
                          <PctBar pct={s.pct_tardanza} warn={999} />
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={s.pct_asistencia >= 85 ? 'success' : s.pct_asistencia >= 70 ? 'warning' : 'danger'}>
                            {s.pct_asistencia >= 85 ? 'Óptimo' : s.pct_asistencia >= 70 ? 'Regular' : 'En riesgo'}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {reporte.por_seccion.length === 0 && (
              <Card title="Asistencia por aula">
                <p className="text-[13px] text-text-mute text-center py-8">
                  No hay datos de aulas para el período seleccionado.
                </p>
              </Card>
            )}

            {/* Por docente */}
            {reporte.por_docente.length > 0 && (
              <Card title="Puntualidad de docentes" subtitle={`${reporte.por_docente.length} docentes con registros`}>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-surface2/50">
                      {['Docente', 'Sesiones', 'Puntualidad', 'Estado'].map((h) => (
                        <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...reporte.por_docente]
                      .sort((a, b) => b.puntualidad - a.puntualidad)
                      .map((d) => (
                        <tr key={d.docente_id} className="border-t border-border-s hover:bg-surface2/40 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium">{d.nombre}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px]">{d.total_sesiones}</td>
                          <td className="px-3.5 py-2.5">
                            <PctBar pct={d.puntualidad} warn={85} />
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Pill tone={d.puntualidad >= 90 ? 'success' : d.puntualidad >= 75 ? 'warning' : 'danger'}>
                              {d.puntualidad >= 90 ? 'Puntual' : d.puntualidad >= 75 ? 'Regular' : 'Con tardanzas'}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Card>
            )}

            {reporte.por_docente.length === 0 && (
              <Card title="Puntualidad de docentes">
                <p className="text-[13px] text-text-mute text-center py-8">
                  No hay registros de docentes en el período seleccionado.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}
