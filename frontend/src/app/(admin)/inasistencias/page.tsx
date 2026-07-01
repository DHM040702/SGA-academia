'use client'

import { useMemo, useState } from 'react'
import { useInasistencias, type FilterInasistencias, type AsistenciaRecord } from '@/hooks/use-asistencia'
import { useAulas } from '@/hooks/use-ciclos'
import { JustificarModal } from '@/components/asistencia/justificar-modal'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Calendar, FileText } from '@/components/icons'

// ─── helpers ──────────────────────────────────────────────────────────────────

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Formatea una fecha ISO (YYYY-MM-DD…) en texto largo SIN corrimiento de zona. */
function fmtFechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function InasistenciasPage() {
  const hoy = useMemo(() => new Date(), [])
  const hace30 = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), [])

  const [desde,  setDesde]  = useState(ymd(hace30))
  const [hasta,  setHasta]  = useState(ymd(hoy))
  const [aulaId, setAulaId] = useState('')
  const [estado, setEstado] = useState<'todas' | 'pendientes' | 'justificadas'>('pendientes')

  const filters: FilterInasistencias = { desde, hasta, aula_id: aulaId || undefined, estado }
  const { data, isLoading, isError } = useInasistencias(filters)
  const { data: aulas = [] } = useAulas()

  const [target, setTarget] = useState<AsistenciaRecord | null>(null)

  const registros = data?.data ?? []

  // Agrupar por fecha (los datos ya vienen ordenados por fecha desc).
  const grupos = useMemo(() => {
    const map = new Map<string, AsistenciaRecord[]>()
    for (const r of registros) {
      const key = r.fecha.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
  }, [registros])

  return (
    <div className="p-5 flex flex-col gap-5">
      {target && <JustificarModal registro={target} onClose={() => setTarget(null)} />}

      <PageHeader
        title="Inasistencias"
        crumbs={[{ label: 'Inasistencias' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Faltas en el rango" value={data?.total ?? 0} sub="alumnos ausentes" accent="var(--color-danger)" />
        <KPI label="Pendientes"         value={data?.pendientes ?? 0} sub="sin justificar" accent="var(--color-warning)" />
        <KPI label="Justificadas"       value={data?.justificadas ?? 0} sub="con expediente" accent="var(--color-success)" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-surface border border-border rounded-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Desde</span>
          <input type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)}
            className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Hasta</span>
          <input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)}
            className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Aula</span>
          <select value={aulaId} onChange={e => setAulaId(e.target.value)}
            className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[140px]">
            <option value="">Todas las aulas</option>
            {aulas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Estado</span>
          <select value={estado} onChange={e => setEstado(e.target.value as any)}
            className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface">
            <option value="pendientes">Pendientes</option>
            <option value="justificadas">Justificadas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="text-center py-16 text-text-mute text-[13px]">Cargando inasistencias…</div>
      ) : isError ? (
        <div className="text-center py-16 text-danger text-[13px]">No se pudieron cargar las inasistencias.</div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-text-mute">
          <Calendar size={28} />
          <div className="text-[13px]">No hay inasistencias para los filtros seleccionados.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map(([fecha, items]) => (
            <div key={fecha} className="bg-surface border border-border rounded-3 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2 border-b border-border">
                <div className="flex items-center gap-2 text-[13px] font-semibold capitalize">
                  <Calendar size={14} className="text-text-mute" />
                  {fmtFechaLarga(fecha)}
                </div>
                <Pill tone="danger">{items.length} falta{items.length !== 1 ? 's' : ''}</Pill>
              </div>

              <div className="divide-y divide-border-s">
                {items.map(r => {
                  const nombre = r.alumno ? `${r.alumno.nombre} ${r.alumno.apellidos}` : '—'
                  const justificada = !!r.justificacionRazon
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar name={nombre} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium leading-tight truncate">{nombre}</div>
                        <div className="text-[11px] text-text-mute">
                          {r.alumno?.aula?.nombre ?? '—'}
                          {r.alumno?.codigoBarras ? ` · ${r.alumno.codigoBarras}` : ''}
                        </div>
                        {justificada && (
                          <div className="text-[10.5px] text-success truncate max-w-[280px]" title={r.justificacionRazon ?? ''}>
                            ✓ {r.justificacionRazon}{r.justificacionDoc ? ` · ${r.justificacionDoc}` : ''}
                          </div>
                        )}
                      </div>

                      <Pill tone={justificada ? 'success' : 'warning'}>
                        <Dot tone={justificada ? 'success' : 'warning'} size={6} />
                        {justificada ? 'Justificada' : 'Pendiente'}
                      </Pill>

                      <Btn variant={justificada ? 'secondary' : 'primary'} className="shrink-0"
                        icon={<FileText size={13} />} onClick={() => setTarget(r)}>
                        {justificada ? 'Editar' : 'Justificar'}
                      </Btn>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
