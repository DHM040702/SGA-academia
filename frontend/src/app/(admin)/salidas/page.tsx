'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Avatar } from '@/components/ui/avatar'
import { Search, X, Plus, LogOut } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { useSalidas, useCreateSalida, type Salida } from '@/hooks/use-salidas'
import { useCicloCtx } from '@/contexts/ciclo-context'
import api from '@/lib/api'

function fmtInstante(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── Modal de registro ─────────────────────────────────────────────── */
function RegistrarSalidaModal({ onClose }: { onClose: () => void }) {
  const crear = useCreateSalida()
  const [q, setQ] = useState('')
  const [alumno, setAlumno] = useState<any>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const { data: resultados = [] } = useQuery<any[]>({
    queryKey: ['alumnos', 'buscar-salida', q],
    queryFn: async () => {
      const { data } = await api.get('/alumnos', { params: { q, limit: 8, page: 1 } })
      return data?.data ?? []
    },
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  })

  async function submit() {
    setError('')
    if (!alumno) return setError('Selecciona un alumno.')
    if (motivo.trim().length < 3) return setError('Escribe un motivo (mínimo 3 caracteres).')
    try {
      await crear.mutateAsync({ alumno_id: alumno.id, motivo: motivo.trim() })
      onClose()
    } catch {
      setError('No se pudo registrar la salida. Intenta nuevamente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-3 shadow-2 w-full max-w-md p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-[17px] font-semibold">Registrar salida adelantada</h3>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        {/* Buscar alumno */}
        {!alumno ? (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
              placeholder="Buscar alumno por nombre, apellidos o DNI…"
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            {q.trim().length >= 2 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-2 overflow-hidden">
                {resultados.length === 0 ? (
                  <p className="text-[12px] text-text-mute text-center py-3">Sin resultados</p>
                ) : resultados.map((a: any) => (
                  <button key={a.id} onClick={() => { setAlumno(a); setQ('') }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-surface2 text-[13px] flex justify-between items-center gap-3 border-b border-border-s last:border-0">
                    <span className="font-semibold">{a.apellidos ?? ''}{a.apellidos ? ', ' : ''}{a.nombres ?? a.nombre ?? ''}</span>
                    <span className="text-[11px] text-text-mute">{a.dni ? `DNI ${a.dni}` : ''} {a.aula?.nombre ?? ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2 border border-border bg-surface2/40 p-3 flex items-center gap-3">
            <Avatar name={`${alumno.nombres ?? alumno.nombre ?? ''} ${alumno.apellidos ?? ''}`} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px] truncate">
                {alumno.apellidos ?? ''}{alumno.apellidos ? ', ' : ''}{alumno.nombres ?? alumno.nombre ?? ''}
              </div>
              <div className="text-[11.5px] text-text-mute">
                {alumno.dni ? `DNI ${alumno.dni}` : ''}{alumno.aula ? ` · ${alumno.aula.nombre}` : ''}
              </div>
            </div>
            <button onClick={() => setAlumno(null)} className="text-text-mute hover:text-text" title="Cambiar"><X size={16} /></button>
          </div>
        )}

        {/* Motivo */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-text-mute uppercase tracking-[0.05em] font-medium">Motivo de la salida</label>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300}
            placeholder="Ej. Cita médica, motivo familiar, autorizado por apoderado…"
            className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          <span className="text-[10.5px] text-text-mute self-end">{motivo.length}/300</span>
        </div>

        {error && <p className="text-[12px] text-danger">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Btn variant="secondary" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn size="sm" onClick={submit} disabled={crear.isPending}>
            {crear.isPending ? 'Registrando…' : 'Registrar salida'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ── Página ─────────────────────────────────────────────────────────── */
export default function SalidasPage() {
  const { user } = useAuth()
  const puedeRegistrar = user?.rol === 'admin' || user?.rol === 'auxiliar'

  const [showModal, setShowModal] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState(todayStr())
  const [q, setQ] = useState('')

  const { selectedCiclo } = useCicloCtx()
  const { data: page, isLoading } = useSalidas({ ciclo_id: selectedCiclo?.id, desde: desde || undefined, hasta: hasta || undefined, limit: 200 })
  const salidas = page?.data ?? []

  const filtradas = useMemo(() => {
    if (!q.trim()) return salidas
    const s = q.trim().toLowerCase()
    return salidas.filter((r) =>
      r.alumno.toLowerCase().includes(s) || r.dni.includes(q) || r.codigo.toLowerCase().includes(s) || r.aula.toLowerCase().includes(s))
  }, [salidas, q])

  return (
    <div className="px-4 md:px-7 pt-4 md:pt-[22px] pb-7 flex flex-col gap-4">
      {showModal && <RegistrarSalidaModal onClose={() => setShowModal(false)} />}

      <PageHeader
        title="Salidas adelantadas"
        crumbs={[{ label: 'Operaciones' }, { label: 'Salidas adelantadas' }]}
        action={puedeRegistrar ? (
          <Btn size="sm" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Registrar salida</Btn>
        ) : undefined}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center bg-surface border border-border rounded-3 px-3 py-2.5 shadow-1">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno, DNI o aula…"
            className="w-full text-[12.5px] pl-8 pr-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-text-mute">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="text-[12.5px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-text-mute">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="text-[12.5px] px-2.5 py-1.5 border border-border rounded-2 bg-surface" />
        </div>
        <span className="ml-auto text-[12px] text-text-mute">{filtradas.length} salida{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <Card title="Registro de salidas" subtitle={desde ? `${desde} → ${hasta}` : `hasta ${hasta}`}>
        {isLoading ? (
          <div className="py-12 text-center text-text-mute text-[13px]">Cargando…</div>
        ) : filtradas.length === 0 ? (
          <div className="py-12 text-center text-text-mute text-[13px]">
            <div className="text-[32px] mb-2 opacity-60 flex justify-center"><LogOut size={30} /></div>
            No hay salidas registradas en el período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  {['Fecha / hora', 'Alumno', 'Aula', 'Motivo', 'Autorizó'].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r: Salida) => (
                  <tr key={r.id} className="border-t border-border-s hover:bg-surface-2/40 align-top">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] whitespace-nowrap">{fmtInstante(r.fecha)}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold">{r.alumno || '—'}</div>
                      <div className="text-[11px] text-text-mute font-mono">{r.codigo}{r.dni ? ` · DNI ${r.dni}` : ''}</div>
                    </td>
                    <td className="px-3.5 py-2.5">{r.aula || '—'}</td>
                    <td className="px-3.5 py-2.5 max-w-[320px]">
                      <span className="text-[12.5px] text-text line-clamp-2" title={r.motivo}>{r.motivo}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-mute">{r.autorizado_por}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
