'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCiclos, useAulas,
  useCreateCiclo, useUpdateCiclo, useDeleteCiclo,
  useCreateAula, useUpdateAula, useDeleteAula,
  type Ciclo, type Aula,
} from '@/hooks/use-ciclos'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Eye, Calendar, MoreHorizontal, Edit, Trash, X, Check, ChevD } from '@/components/icons'

/* ── Constantes ─────────────────────────────────────────────────── */
const TURNO_OPTS = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde',  label: 'Tarde'  },
]
const AREA_OPTS = [
  { value: 'ciencias', label: 'Área A — Ciencias' },
  { value: 'letras',   label: 'Área B — Letras'   },
  { value: 'medicas',  label: 'Área C — Médicas'   },
]
const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }
const AREA_LABEL:  Record<string, string> = {
  ciencias: 'Área A — Ciencias',
  letras:   'Área B — Letras',
  medicas:  'Área C — Médicas',
}
// Variables CSS con fallback hex solo para navegadores sin oklch (ver globals.css).
// En Chrome moderno resuelven al oklch original → render idéntico.
const AREA_COLOR: Record<string, string> = {
  ciencias: 'var(--area-ciencias)',
  letras:   'var(--area-letras)',
  medicas:  'var(--area-medicas)',
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(s?: string) {
  if (!s) return '—'
  return new Date(s + (s.includes('T') ? '' : 'T12:00:00'))
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Día + mes en mayúsculas, tolerante a ISO con o sin 'T' (evita INVALID DATE). */
function fmtDia(s?: string) {
  if (!s) return '—'
  return new Date(s + (s.includes('T') ? '' : 'T12:00:00'))
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    .toUpperCase()
}

function toDateInput(iso?: string) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function cicloProgress(inicio: string, fin: string) {
  const now   = Date.now()
  const start = new Date(inicio).getTime()
  const end   = new Date(fin).getTime()
  const pct   = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
  const totalWeeks   = Math.round((end - start)   / (7 * 24 * 3600 * 1000))
  const currentWeek  = Math.round((now - start)   / (7 * 24 * 3600 * 1000))
  return { pct, totalWeeks, currentWeek }
}

/* ── AulaMenu (dropdown MoreHorizontal) ─────────────────────────── */
function AulaMenu({
  aula, onEdit, onDelete,
}: {
  aula: Aula
  onEdit:   (a: Aula) => void
  onDelete: (a: Aula) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Btn
        variant="ghost" size="sm" style={{ padding: 4 }}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
      >
        <MoreHorizontal size={16} />
      </Btn>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border rounded-2 shadow-2 py-1 w-36">
          <button
            className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-surface-2 flex items-center gap-2 border-none bg-transparent cursor-pointer"
            onClick={() => { onEdit(aula); setOpen(false) }}
          >
            <Edit size={12} className="text-text-mute" /> Editar
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-[12.5px] text-danger hover:bg-danger-l flex items-center gap-2 border-none bg-transparent cursor-pointer"
            onClick={() => { onDelete(aula); setOpen(false) }}
          >
            <Trash size={12} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Modal base ─────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[480px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[19px] font-semibold m-0">{title}</h2>
          <Btn variant="ghost" size="sm" onClick={onClose} style={{ padding: 6 }}>
            <X size={16} />
          </Btn>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ── NuevoCicloModal ─────────────────────────────────────────────── */
function NuevoCicloModal({
  ciclo, onClose,
}: { ciclo?: Ciclo | null; onClose: () => void }) {
  const createMut = useCreateCiclo()
  const updateMut = useUpdateCiclo()
  const isEdit = Boolean(ciclo)

  const [nombre, setNombre] = useState(ciclo?.nombre ?? '')
  const [inicio, setInicio] = useState(toDateInput(ciclo?.fechaInicio))
  const [fin,    setFin]    = useState(toDateInput(ciclo?.fechaFin))
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !inicio || !fin) { setError('Todos los campos son obligatorios.'); return }
    if (fin <= inicio) { setError('La fecha de fin debe ser posterior al inicio.'); return }
    setError('')
    try {
      if (isEdit && ciclo) {
        await updateMut.mutateAsync({ id: ciclo.id, nombre, fecha_inicio: inicio, fecha_fin: fin })
      } else {
        await createMut.mutateAsync({ nombre, fecha_inicio: inicio, fecha_fin: fin })
      }
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar.'))
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Modal title={isEdit ? 'Editar ciclo' : 'Nuevo ciclo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
            Nombre del ciclo *
          </span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required placeholder="Ej: 2026-II"
            className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
              Fecha de inicio *
            </span>
            <input
              type="date" value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
              Fecha de fin *
            </span>
            <input
              type="date" value={fin}
              onChange={(e) => setFin(e.target.value)}
              required
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        {error && (
          <p className="text-[12px] text-danger bg-danger-l px-3 py-2 rounded-2 m-0">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1 border-t border-border-s">
          <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
          <Btn size="sm" type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear ciclo'}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

/* ── NuevaAulaModal ──────────────────────────────────────────────── */
function NuevaAulaModal({
  aula, ciclos, defaultCicloId, onClose,
}: {
  aula?: Aula | null
  ciclos: Ciclo[]
  defaultCicloId?: string
  onClose: () => void
}) {
  const createMut = useCreateAula()
  const updateMut = useUpdateAula()
  const isEdit = Boolean(aula)

  const [nombre,   setNombre]   = useState(aula?.nombre    ?? '')
  const [turno,    setTurno]    = useState(aula?.turno     ?? 'manana')
  const [area,     setArea]     = useState(aula?.area      ?? 'ciencias')

  /** Al escribir el nombre, deriva el área del prefijo (C=Ciencias, L=Letras,
   *  M=Médicas). Evita aulas L-001/M-001 guardadas con el área por defecto
   *  (Ciencias), que luego filtraban mal las carreras. Sigue siendo editable. */
  function cambiarNombre(v: string) {
    setNombre(v)
    const pref = v.trim().charAt(0).toUpperCase()
    const derivada = ({ C: 'ciencias', L: 'letras', M: 'medicas' } as const)[pref as 'C' | 'L' | 'M']
    if (derivada) setArea(derivada)
  }
  const [cupo,     setCupo]     = useState(String(aula?.cupoMaximo ?? 50))
  const [cicloId,  setCicloId]  = useState(aula?.cicloId   ?? defaultCicloId ?? ciclos[0]?.id ?? '')
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !cicloId) { setError('Nombre y ciclo son obligatorios.'); return }
    setError('')
    const dto = { nombre, turno, area, cupo_maximo: Number(cupo), ciclo_id: cicloId }
    try {
      if (isEdit && aula) {
        await updateMut.mutateAsync({ id: aula.id, ...dto })
      } else {
        await createMut.mutateAsync(dto)
      }
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar.'))
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Modal title={isEdit ? 'Editar aula' : 'Nueva aula'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
              Nombre *
            </span>
            <input
              value={nombre}
              onChange={(e) => cambiarNombre(e.target.value)}
              required placeholder="Ej: C-001, L-001, M-001"
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
              Cupo máximo
            </span>
            <input
              type="number" min={1} max={200}
              value={cupo}
              onChange={(e) => setCupo(e.target.value)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
            Ciclo *
          </span>
          <select
            value={cicloId}
            onChange={(e) => setCicloId(e.target.value)}
            className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                Ciclo {c.nombre}{c.activo ? ' (activo)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
              Turno
            </span>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value as any)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {TURNO_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">
              Área
            </span>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as any)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {AREA_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="text-[12px] text-danger bg-danger-l px-3 py-2 rounded-2 m-0">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1 border-t border-border-s">
          <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
          <Btn size="sm" type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear aula'}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

/* ── Página principal ────────────────────────────────────────────── */
export default function CiclosPage() {
  const router = useRouter()
  const { data: ciclos = [], isLoading } = useCiclos()
  const updateCicloMut = useUpdateCiclo()
  const deleteCicloMut = useDeleteCiclo()
  const deleteAulaMut  = useDeleteAula()

  // Ciclo seleccionado en la vista (por defecto el activo, o el primero)
  const cicloActivo = ciclos.find((c) => c.activo)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const cicloSelected = ciclos.find((c) => c.id === selectedId) ?? cicloActivo ?? ciclos[0]

  const { data: aulas = [], isLoading: loadingAulas } = useAulas(cicloSelected?.id)

  const progress = cicloSelected
    ? cicloProgress(cicloSelected.fechaInicio, cicloSelected.fechaFin)
    : null

  // Modales
  const [showNewCiclo,  setShowNewCiclo]  = useState(false)
  const [editCiclo,     setEditCiclo]     = useState<Ciclo | null>(null)
  const [showNewAula,   setShowNewAula]   = useState(false)
  const [editAula,      setEditAula]      = useState<Aula | null>(null)

  async function handleActivarCiclo(id: string) {
    if (!confirm('¿Activar este ciclo? El ciclo actualmente activo quedará cerrado.')) return
    const res: any = await updateCicloMut.mutateAsync({ id, activo: true })
    // Informe del ajuste automático de docentes (no se borra a nadie).
    const aj = res?.docentes_ajuste
    if (aj && (aj.desactivados || aj.reactivados)) {
      const partes: string[] = []
      if (aj.desactivados) partes.push(`${aj.desactivados} docente(s) desactivado(s) por ~6 meses sin enseñar`)
      if (aj.reactivados)  partes.push(`${aj.reactivados} reactivado(s) por volver a tener horario`)
      alert(`Ciclo activado.\n\n${partes.join('\n')}\n\nLos docentes siguen en la lista; solo cambió el estado de su cuenta.`)
    }
  }

  async function handleDeleteCiclo(c: Ciclo) {
    if (!confirm(`¿Eliminar el ciclo ${c.nombre}? Esta acción no se puede deshacer.`)) return
    await deleteCicloMut.mutateAsync(c.id)
    if (selectedId === c.id) setSelectedId(null)
  }

  async function handleDeleteAula(a: Aula) {
    if (!confirm(`¿Eliminar el aula ${a.nombre}? Los alumnos asignados quedarán sin aula.`)) return
    await deleteAulaMut.mutateAsync(a.id)
  }

  const otrosCiclos = ciclos.filter((c) => !c.activo)

  // Agrupar ciclos por año para el selector (más recientes primero, ya que
  // useCiclos los devuelve ordenados por fechaInicio desc).
  const ciclosPorAnio = ciclos.reduce<Record<string, Ciclo[]>>((acc, c) => {
    const anio = String(c.fechaInicio).slice(0, 4) || 's/f'
    ;(acc[anio] ??= []).push(c)
    return acc
  }, {})

  return (
    <>
      {/* ── Modales ── */}
      {showNewCiclo && (
        <NuevoCicloModal onClose={() => setShowNewCiclo(false)} />
      )}
      {editCiclo && (
        <NuevoCicloModal ciclo={editCiclo} onClose={() => setEditCiclo(null)} />
      )}
      {showNewAula && (
        <NuevaAulaModal
          ciclos={ciclos}
          defaultCicloId={cicloSelected?.id}
          onClose={() => setShowNewAula(false)}
        />
      )}
      {editAula && (
        <NuevaAulaModal
          aula={editAula}
          ciclos={ciclos}
          defaultCicloId={editAula.cicloId}
          onClose={() => setEditAula(null)}
        />
      )}

      <PageHeader
        title="Ciclos y aulas"
        crumbs={[{ label: 'Ciclos y aulas' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Plus size={14} />} size="sm"
              onClick={() => setShowNewAula(true)}>
              Nueva aula
            </Btn>
            <Btn icon={<Plus size={14} />} size="sm"
              onClick={() => setShowNewCiclo(true)}>
              Nuevo ciclo
            </Btn>
          </>
        }
      />

      <div className="p-4 md:p-7 flex flex-col gap-3.5">

        {isLoading && (
          <div className="text-center py-10 text-text-mute text-[13px]">Cargando…</div>
        )}

        {/* ── Selector de ciclo (desplegable, escalable a muchos semestres) ── */}
        {ciclos.length > 1 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-text-mute select-none">Ver ciclo</span>
              <div className="relative">
                <select
                  value={cicloSelected?.id ?? ''}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="appearance-none cursor-pointer text-[12.5px] font-semibold pl-3 pr-8 py-1.5 rounded-2 border border-border bg-surface text-text hover:border-primary/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                >
                  {Object.entries(ciclosPorAnio).map(([anio, lista]) => (
                    <optgroup key={anio} label={anio}>
                      {lista.map((c) => (
                        <option key={c.id} value={c.id}>
                          Ciclo {c.nombre}{c.activo ? '  ·  activo' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute">
                  <ChevD size={12} />
                </span>
              </div>
            </div>

            {/* Atajo: volver al ciclo activo cuando estás viendo otro */}
            {cicloActivo && cicloSelected?.id !== cicloActivo.id && (
              <button
                onClick={() => setSelectedId(cicloActivo.id)}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline cursor-pointer bg-transparent border-none"
              >
                <Dot tone="success" size={6} /> Ir al ciclo activo
              </button>
            )}

            <span className="text-[12px] text-text-mute ml-auto">
              {ciclos.length} ciclos en total
            </span>
          </div>
        )}

        {/* ── Banner ciclo seleccionado ── */}
        {cicloSelected ? (
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-serif text-[22px] font-semibold tracking-tight m-0">
                      Ciclo {cicloSelected.nombre}
                    </h2>
                    {cicloSelected.activo ? (
                      <Pill tone="success"><Dot tone="success" size={6} />En curso</Pill>
                    ) : (
                      <Pill tone="neutral">Cerrado</Pill>
                    )}
                  </div>
                  <div className="mt-1 text-[12.5px] text-text-mute">
                    {fmt(cicloSelected.fechaInicio)} → {fmt(cicloSelected.fechaFin)}
                    {progress && cicloSelected.activo
                      ? ` · semana ${progress.currentWeek} de ${progress.totalWeeks}`
                      : null}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  <StatVal label="Alumnos"  value={cicloSelected.total_alumnos ?? aulas.reduce((s, a) => s + (a._count?.alumnos ?? 0), 0)} />
                  <StatVal label="Aulas"    value={aulas.length || cicloSelected.total_secciones || 0} />
                </div>

                {/* Acciones ciclo */}
                <div className="flex gap-1.5">
                  <Btn variant="secondary" size="sm" icon={<Edit size={13} />}
                    onClick={() => setEditCiclo(cicloSelected)}>
                    Editar
                  </Btn>
                  {!cicloSelected.activo && (
                    <Btn
                      variant="secondary" size="sm" icon={<Check size={13} />}
                      className="text-success border-success/30 hover:bg-success-l"
                      onClick={() => handleActivarCiclo(cicloSelected.id)}
                      disabled={updateCicloMut.isPending}
                    >
                      Activar
                    </Btn>
                  )}
                  <Btn
                    variant="ghost" size="sm"
                    className="text-danger hover:bg-danger-l"
                    onClick={() => handleDeleteCiclo(cicloSelected)}
                    disabled={deleteCicloMut.isPending}
                    style={{ padding: '6px 8px' }}
                  >
                    <Trash size={14} />
                  </Btn>
                </div>
              </div>

              {/* Barra de progreso */}
              {progress && (
                <>
                  <div className="h-2 bg-surface-3 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${progress.pct}%`,
                        backgroundColor: '#2d426d',
                        background: 'linear-gradient(90deg, var(--color-primary), oklch(0.29 0.09 255))',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-text-mute font-mono">
                    <span>{fmtDia(cicloSelected.fechaInicio)}</span>
                    <span className="text-primary font-semibold">
                      {cicloSelected.activo ? `HOY · ${progress.pct}% completado` : `${progress.pct}% completado`}
                    </span>
                    <span>{fmtDia(cicloSelected.fechaFin)}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        ) : (
          !isLoading && ciclos.length === 0 && (
            <Card>
              <div className="p-8 text-center">
                <p className="text-text-mute text-[13px] mb-3">No hay ningún ciclo registrado.</p>
                <Btn icon={<Plus size={14} />} size="sm" onClick={() => setShowNewCiclo(true)}>
                  Crear primer ciclo
                </Btn>
              </div>
            </Card>
          )
        )}

        {/* ── Aulas del ciclo ── */}
        {cicloSelected && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-text-mute uppercase tracking-[0.05em] m-0">
                Aulas del ciclo {cicloSelected.nombre}
                <span className="ml-2 font-normal normal-case">({aulas.length})</span>
              </h3>
              <Btn variant="secondary" size="sm" icon={<Plus size={13} />}
                onClick={() => setShowNewAula(true)}>
                Añadir aula
              </Btn>
            </div>

            {loadingAulas ? (
              <div className="text-center py-6 text-text-mute text-[13px]">Cargando aulas…</div>
            ) : aulas.length === 0 ? (
              <Card>
                <div className="py-8 text-center text-text-mute text-[13px]">
                  No hay aulas en este ciclo.{' '}
                  <button
                    className="text-primary underline cursor-pointer bg-transparent border-none font-sans text-[13px]"
                    onClick={() => setShowNewAula(true)}
                  >
                    Crear aula
                  </button>
                </div>
              </Card>
            ) : (
              <div
                className="grid gap-3.5"
                style={{ gridTemplateColumns: `repeat(${Math.min(aulas.length, 3)}, 1fr)` }}
              >
                {aulas.map((a) => {
                  const col = AREA_COLOR[a.area] ?? 'var(--area-default)'
                  const ocupPct = a._count && a.cupoMaximo > 0
                    ? Math.round((a._count.alumnos / a.cupoMaximo) * 100) : 0
                  return (
                    <Card key={a.id}>
                      <div className="p-[18px]">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center font-serif font-bold text-[13px] text-white shrink-0"
                                style={{ background: col }}
                              >
                                {a.nombre[0]?.toUpperCase()}
                              </div>
                              <h3 className="font-serif text-[17px] font-semibold m-0">{a.nombre}</h3>
                            </div>
                            <div className="mt-1.5 text-[12px] text-text-mute">
                              {TURNO_LABEL[a.turno] ?? a.turno}
                            </div>
                            <div className="text-[11px] text-text-soft">{AREA_LABEL[a.area] ?? a.area}</div>
                          </div>
                          <AulaMenu
                            aula={a}
                            onEdit={(x) => setEditAula(x)}
                            onDelete={handleDeleteAula}
                          />
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 py-2.5 border-t border-border-s">
                          <StatVal label="Alumnos"  value={a._count?.alumnos ?? '—'} />
                          <StatVal label="Horarios" value={a._count?.horarios ?? '—'} />
                          <StatVal label="Cupo"     value={a.cupoMaximo} />
                        </div>

                        {/* Barra de ocupación */}
                        {a._count && (
                          <div className="mt-2.5">
                            <div className="flex justify-between text-[10.5px] text-text-mute mb-1">
                              <span>{a._count.alumnos} / {a.cupoMaximo} alumnos</span>
                              <span>{ocupPct}%</span>
                            </div>
                            <div className="h-1.5 bg-surface-3 rounded overflow-hidden">
                              <div
                                className="h-full rounded transition-all"
                                style={{
                                  width: `${ocupPct}%`,
                                  background: ocupPct >= 90 ? 'var(--color-warning)' : col,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex gap-1.5 mt-3.5">
                          <Btn
                            variant="secondary" size="sm" className="flex-1"
                            icon={<Eye size={12} />}
                            onClick={() => router.push(`/ciclos/aulas/${a.id}`)}
                          >
                            Detalle
                          </Btn>
                          <Btn
                            variant="ghost" size="sm" className="flex-1"
                            icon={<Calendar size={12} />}
                            onClick={() => router.push(`/ciclos/aulas/${a.id}?tab=horarios`)}
                          >
                            Horario
                          </Btn>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Ciclos anteriores ── */}
        {otrosCiclos.length > 0 && cicloSelected?.activo && (
          <Card title="Ciclos anteriores">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['Ciclo', 'Período', 'Alumnos', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold border-b border-border"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otrosCiclos.map((c) => (
                  <tr key={c.id} className="border-t border-border-s hover:bg-surface-2 transition-colors">
                    <td className="px-3.5 py-2.5 font-serif font-semibold text-[14px]">
                      {c.nombre}
                    </td>
                    <td className="px-3.5 py-2.5 text-text-mute text-[12.5px]">
                      {fmt(c.fechaInicio)} → {fmt(c.fechaFin)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">
                      {c.total_alumnos ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone="neutral">Cerrado</Pill>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1.5 justify-end">
                        <Btn
                          variant="ghost" size="sm"
                          onClick={() => setSelectedId(c.id)}
                        >
                          Ver aulas
                        </Btn>
                        <Btn
                          variant="secondary" size="sm" icon={<Check size={12} />}
                          className="text-success border-success/30 hover:bg-success-l"
                          onClick={() => handleActivarCiclo(c.id)}
                          disabled={updateCicloMut.isPending}
                        >
                          Activar
                        </Btn>
                        <Btn
                          variant="ghost" size="sm"
                          className="text-danger hover:bg-danger-l"
                          style={{ padding: '5px 7px' }}
                          onClick={() => handleDeleteCiclo(c)}
                          disabled={deleteCicloMut.isPending}
                        >
                          <Trash size={13} />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  )
}

/* ── Sub-componente estadístico ─────────────────────────────────── */
function StatVal({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-serif text-[20px] font-semibold leading-none">{value}</div>
      <div className="text-[11.5px] text-text-mute mt-1">{label}</div>
    </div>
  )
}
