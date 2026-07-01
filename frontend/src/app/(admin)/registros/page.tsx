'use client'

import { useMemo, useState } from 'react'
import { useAsistencia, type FilterAsistencia } from '@/hooks/use-asistencia'
import { useAulas } from '@/hooks/use-ciclos'
import { useAuth } from '@/contexts/auth-context'
import type { AsistenciaRecord } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { CorrectModal } from '@/components/asistencia/correct-modal'
import { JustificarModal } from '@/components/asistencia/justificar-modal'
import { Calendar, Users, Teacher, Edit, FileText } from '@/components/icons'

// ─── helpers ──────────────────────────────────────────────────────────────────

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fecha (@db.Date, se lee UTC puro): extraer por slice sin corrimiento de zona. */
function fmtFecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  })
}

/** Hora de ingreso (@db.Timestamptz, instante real): usa hora local. */
function fmtHora(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function RegistrosPage() {
  const { user } = useAuth()
  const isDocente = user?.rol === 'docente'
  // Solo admin y director pueden editar registros; el vigilante solo justifica faltas.
  const canEdit    = user?.rol === 'admin' || user?.rol === 'director'
  const canJustify = canEdit || user?.rol === 'vigilante'
  const conAcciones = canEdit || canJustify

  const [correctTarget, setCorrectTarget] = useState<AsistenciaRecord | null>(null)
  const [justifyTarget, setJustifyTarget] = useState<AsistenciaRecord | null>(null)

  const hoy = useMemo(() => new Date(), [])
  const hace30 = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), [])

  // El docente solo ve alumnos de sus aulas asignadas (vista, sin filtros de tipo/aula).
  const [tipo,   setTipo]   = useState<'alumno' | 'docente'>('alumno')
  const [desde,  setDesde]  = useState(ymd(hace30))
  const [hasta,  setHasta]  = useState(ymd(hoy))
  const [aulaId, setAulaId] = useState('')
  const [page,   setPage]   = useState(1)

  const filters: FilterAsistencia = {
    tipo, desde, hasta, page, limit: 25,
    aula_id: tipo === 'alumno' ? (aulaId || undefined) : undefined,
  }
  const { data, isLoading, isError } = useAsistencia(filters)
  const { data: aulas = [] } = useAulas()

  const registros = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  // Reinicia la página al cambiar cualquier filtro.
  function updateFilter(fn: () => void) { fn(); setPage(1) }

  return (
    <div className="p-5 flex flex-col gap-5">
      {correctTarget && <CorrectModal registro={correctTarget} onClose={() => setCorrectTarget(null)} />}
      {justifyTarget && <JustificarModal registro={justifyTarget} onClose={() => setJustifyTarget(null)} />}

      <PageHeader title="Registros de asistencia" crumbs={[{ label: 'Registros' }]} />

      {isDocente && (
        <p className="text-[12.5px] text-text-mute -mt-1">
          Vista de solo lectura de la asistencia de los alumnos de tus aulas asignadas.
        </p>
      )}

      {/* Selector tipo — segmented control; oculto para docente (solo ve sus alumnos) */}
      {!isDocente && (
        <div className="inline-flex p-1 gap-1 bg-surface-2 border border-border rounded-3 w-fit">
          {([
            { key: 'alumno',  label: 'Alumnos',  Icon: Users },
            { key: 'docente', label: 'Docentes', Icon: Teacher },
          ] as const).map(({ key, label, Icon }) => {
            const active = tipo === key
            return (
              <button key={key}
                onClick={() => updateFilter(() => setTipo(key))}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-2 transition-all ${
                  active
                    ? 'bg-primary text-white shadow-1'
                    : 'text-text-mute hover:text-text hover:bg-surface'
                }`}>
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-surface border border-border rounded-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Desde</span>
          <input type="date" value={desde} max={hasta} onChange={e => updateFilter(() => setDesde(e.target.value))}
            className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Hasta</span>
          <input type="date" value={hasta} min={desde} onChange={e => updateFilter(() => setHasta(e.target.value))}
            className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </label>
        {tipo === 'alumno' && !isDocente && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-text-mute uppercase tracking-wide">Aula</span>
            <select value={aulaId} onChange={e => updateFilter(() => setAulaId(e.target.value))}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[140px]">
              <option value="">Todas las aulas</option>
              {aulas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>
        )}
        <div className="ml-auto text-[12px] text-text-mute self-center">
          {data ? `${data.total} registro${data.total !== 1 ? 's' : ''}` : ''}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface border border-border rounded-3 overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-2">
              {['Fecha', 'Hora', 'Persona', tipo === 'alumno' ? 'Aula' : 'DNI', 'Estado', ...(conAcciones ? ['Acciones'] : [])].map(h => (
                <th key={h} className={`px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={conAcciones ? 6 : 5} className="text-center py-12 text-text-mute">Cargando…</td></tr>
            ) : isError ? (
              <tr><td colSpan={conAcciones ? 6 : 5} className="text-center py-12 text-danger">No se pudieron cargar los registros.</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={conAcciones ? 6 : 5} className="text-center py-12 text-text-mute">
                <div className="flex flex-col items-center gap-2">
                  <Calendar size={26} />
                  No hay registros para los filtros seleccionados.
                </div>
              </td></tr>
            ) : (
              registros.map(r => {
                const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
                const nombre  = persona ? `${(persona as any).nombre} ${persona.apellidos}` : '—'
                const col4 = r.tipoPersona === 'alumno'
                  ? (r.alumno?.aula?.nombre ?? '—')
                  : (r.docente?.dni ?? '—')
                const estado = r.esAusente
                  ? (r.justificacionRazon ? 'justificada' : 'falta')
                  : r.esTardanza ? 'tardanza' : 'puntual'
                return (
                  <tr key={r.id} className={`border-t border-border-s ${r.esAusente ? 'opacity-80' : ''}`}>
                    <td className="px-3.5 py-2.5 text-[12.5px] whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12.5px]">{r.esAusente ? '—' : fmtHora(r.horaIngreso)}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={nombre} size={26} />
                        <span className="font-medium leading-tight">{nombre}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-mute">{col4}</td>
                    <td className="px-3.5 py-2.5">
                      {estado === 'falta' ? (
                        <Pill tone="danger"><Dot tone="danger" size={6} />Falta</Pill>
                      ) : estado === 'justificada' ? (
                        <Pill tone="info"><Dot tone="info" size={6} />Justificada</Pill>
                      ) : estado === 'tardanza' ? (
                        <Pill tone="warning"><Dot tone="warning" size={6} />Tardanza</Pill>
                      ) : (
                        <Pill tone="success"><Dot tone="success" size={6} />Puntual</Pill>
                      )}
                    </td>
                    {conAcciones && (
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        {r.esAusente ? (
                          canJustify && (
                            <Btn variant="secondary" size="sm" icon={<FileText size={13} />} onClick={() => setJustifyTarget(r)}>
                              {r.justificacionRazon ? 'Editar just.' : 'Justificar'}
                            </Btn>
                          )
                        ) : (
                          canEdit && (
                            <Btn variant="secondary" size="sm" icon={<Edit size={13} />} onClick={() => setCorrectTarget(r)}>
                              Editar
                            </Btn>
                          )
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Btn variant="secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Btn>
          <span className="text-[12.5px] text-text-mute">Página {page} de {totalPages}</span>
          <Btn variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Btn>
        </div>
      )}
    </div>
  )
}
