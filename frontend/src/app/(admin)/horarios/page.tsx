'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useHorarios, useCreateHorario, useUpdateHorario,
  useDeleteHorario, useConflictosHorario,
} from '@/hooks/use-horarios'
import type { Horario } from '@/hooks/use-horarios'
import { useAulas } from '@/hooks/use-ciclos'
import { useDocentes } from '@/hooks/use-docentes'
import { useCursos } from '@/hooks/use-cursos'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Download, AlertTriangle, Edit, Trash, X, Eye, Search } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { SelectOption } from '@/components/ui/searchable-select'

const DIA_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_NUM = [1, 2, 3, 4, 5, 6]

const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }
const AREA_LABEL:  Record<string, string> = { ciencias: 'Ciencias', letras: 'Letras', medicas: 'Médicas' }

const PALETTE = [
  'oklch(0.55 0.13 240)', 'oklch(0.55 0.13 280)', 'oklch(0.55 0.13 200)',
  'oklch(0.55 0.13 145)', 'oklch(0.55 0.13 110)', 'oklch(0.55 0.13 30)',
  'oklch(0.55 0.13 60)',  'oklch(0.55 0.13 170)',
]
const CURSO_COLORS: Record<string, string> = {}
let colorIdx = 0
function cursoColor(nombre: string) {
  if (!CURSO_COLORS[nombre]) {
    CURSO_COLORS[nombre] = PALETTE[colorIdx % PALETTE.length]
    colorIdx++
  }
  return CURSO_COLORS[nombre]
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function extractTime(dt: string | Date | undefined): string {
  if (!dt) return '00:00'
  const s = typeof dt === 'string' ? dt : dt.toISOString()
  // "1970-01-01T07:00:00.000Z" → "07:00"  |  "07:00" → "07:00"
  if (s.includes('T')) return s.slice(11, 16)
  return s.slice(0, 5)
}

function getSlots(horarios: Horario[]): string[] {
  const times = new Set<string>()
  horarios.forEach((h) => times.add(extractTime(h.horaInicio)))
  return Array.from(times).sort()
}

/** "HH:MM" → minutos desde medianoche (para posicionar en el calendario). */
function toMin(dt: string | Date | undefined): number {
  const [h, m] = extractTime(dt).split(':').map(Number)
  return h * 60 + m
}

// Píxeles por minuto del eje vertical del calendario. 1.3 → una clase de 50'
// mide ~65px (suficiente para curso + docente + rango horario).
const PX_PER_MIN = 1.3

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  horario?: Horario | null
  onClose: () => void
}

function HorarioModal({ horario, onClose }: ModalProps) {
  const { data: aulas = [] }                        = useAulas()
  const { data: docentesPage, isLoading: loadingD } = useDocentes({ limit: 200 })
  const { data: cursos = [],  isLoading: loadingC } = useCursos()
  const docentes: any[] = (docentesPage as any)?.data ?? (Array.isArray(docentesPage) ? docentesPage : [])

  const createMut = useCreateHorario()
  const updateMut = useUpdateHorario()
  const isEditing = Boolean(horario)

  const [form, setForm] = useState({
    aula_id:     horario?.aulaId    ?? '',
    curso_id:    horario?.cursoId   ?? '',
    docente_id:  horario?.docenteId ?? '',
    dia_semana:  horario?.diaSemana ?? 1,
    hora_inicio: extractTime(horario?.horaInicio),
    hora_fin:    extractTime(horario?.horaFin),
  })
  const [error, setError] = useState('')

  // ── Cerrar con Escape ──────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function set(k: string, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }))
    setError('')
  }

  // ── Al cambiar docente: auto-rellenar curso según especialidad ─
  function handleDocenteChange(docenteId: string) {
    set('docente_id', docenteId)
    if (!docenteId) return
    const docente = docentes.find((d: any) => d.id === docenteId)
    if (!docente?.especialidad) return
    // Buscar curso que coincida (por nombre exacto o inclusión)
    const esp = docente.especialidad.trim().toLowerCase()
    const match = (cursos as any[]).find(
      (c: any) =>
        c.nombre.toLowerCase() === esp ||
        c.nombre.toLowerCase().includes(esp) ||
        esp.includes(c.nombre.toLowerCase()),
    )
    if (match) setForm((f) => ({ ...f, docente_id: docenteId, curso_id: match.id }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.aula_id || !form.curso_id || !form.docente_id || !form.hora_inicio || !form.hora_fin) {
      setError('Todos los campos son obligatorios.')
      return
    }
    try {
      if (isEditing && horario) {
        await updateMut.mutateAsync({ id: horario.id, ...form })
      } else {
        await createMut.mutateAsync(form)
      }
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar.'))
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  // ── Opciones para SearchableSelect ────────────────────────────
  const aulaOptions: SelectOption[] = aulas.map((a) => ({
    id:    a.id,
    label: a.nombre,
    sub:   a.turno === 'manana' ? 'Mañana' : 'Tarde',
  }))

  const docenteOptions: SelectOption[] = docentes.map((d: any) => ({
    id:    d.id,
    label: `${d.apellidos}, ${d.nombre}`,
    sub:   d.especialidad ?? undefined,
  }))

  const cursoOptions: SelectOption[] = (cursos as any[]).map((c: any) => ({
    id:    c.id,
    label: c.nombre,
    sub:   c.codigo,
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">{isEditing ? 'Editar clase' : 'Asignar clase'}</h2>
            <p className="text-[11.5px] text-text-mute mt-0.5">Escribe para buscar en los desplegables · Escape para cerrar</p>
          </div>
          <button onClick={onClose} className="text-text-mute hover:text-text p-1 rounded-2 hover:bg-surface2 border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* ── Docente (primero para auto-rellenar curso) ── */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">
              Docente
              {form.docente_id && (
                <span className="ml-1.5 text-primary font-normal">
                  → curso autocompletado
                </span>
              )}
            </span>
            <SearchableSelect
              value={form.docente_id}
              onChange={handleDocenteChange}
              options={docenteOptions}
              placeholder={loadingD ? 'Cargando docentes…' : 'Buscar por apellido o especialidad…'}
              loading={loadingD}
              required
            />
          </div>

          {/* ── Curso (auto-rellenado desde docente) ── */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Curso</span>
            <SearchableSelect
              value={form.curso_id}
              onChange={(v) => set('curso_id', v)}
              options={cursoOptions}
              placeholder={loadingC ? 'Cargando cursos…' : 'Buscar curso…'}
              loading={loadingC}
              required
            />
          </div>

          {/* ── Aula ── */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Aula</span>
            <SearchableSelect
              value={form.aula_id}
              onChange={(v) => set('aula_id', v)}
              options={aulaOptions}
              placeholder="Buscar aula…"
              required
            />
          </div>

          {/* ── Día ── */}
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Día</span>
            <select
              value={form.dia_semana}
              onChange={(e) => set('dia_semana', Number(e.target.value))}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
            >
              {DIA_FULL.map((d, i) => (
                <option key={i + 1} value={i + 1}>{d}</option>
              ))}
            </select>
          </label>

          {/* ── Horas ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Hora inicio</span>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => set('hora_inicio', e.target.value)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Hora fin</span>
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => set('hora_fin', e.target.value)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
                required
              />
            </label>
          </div>

          {error && (
            <p className="text-[12px] text-danger bg-danger-light/40 px-3 py-2 rounded-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Asignar'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Cell menu ────────────────────────────────────────────────────────────────

function CellMenu({ horario, onEdit, onDelete, onPublicar }: {
  horario: Horario
  onEdit: (h: Horario) => void
  onDelete: (h: Horario) => void
  onPublicar: (h: Horario) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 transition-opacity"
      >
        <Edit size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border rounded-2 shadow-2 py-1 w-40">
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-2 flex items-center gap-2"
            onClick={() => { onEdit(horario); setOpen(false) }}
          >
            <Edit size={12} /> Editar
          </button>
          {!horario.publicado && (
            <button
              className="w-full text-left px-3 py-1.5 text-[12px] text-success hover:bg-success-l flex items-center gap-2"
              onClick={() => { onPublicar(horario); setOpen(false) }}
            >
              <Eye size={12} /> Publicar
            </button>
          )}
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] text-danger hover:bg-danger-l flex items-center gap-2"
            onClick={() => { onDelete(horario); setOpen(false) }}
          >
            <Trash size={12} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Calendario proporcional ────────────────────────────────────────────────
// Eje de horas continuo: cada clase se posiciona por su hora real y su altura
// es proporcional a su duración. Elimina los huecos/desalineaciones de la rejilla
// anterior (que usaba una fila por hora de inicio con altura fija).

interface CalCol {
  key: string
  header: React.ReactNode
  items: Horario[]
}

function HorarioCalendario({
  columns, soloLectura, isConflicto, onEdit, onDelete, onPublicar,
}: {
  columns: CalCol[]
  soloLectura: boolean
  isConflicto: (id: string) => boolean
  onEdit: (h: Horario) => void
  onDelete: (h: Horario) => void
  onPublicar: (h: Horario) => void
}) {
  const all = columns.flatMap((c) => c.items)
  if (all.length === 0) return null

  // Rango del eje, redondeado a horas completas para un eje limpio.
  let minM = Math.floor(Math.min(...all.map((h) => toMin(h.horaInicio))) / 60) * 60
  let maxM = Math.ceil(Math.max(...all.map((h) => toMin(h.horaFin))) / 60) * 60
  if (maxM <= minM) maxM = minM + 60
  const totalH = (maxM - minM) * PX_PER_MIN

  const hours: number[] = []
  for (let m = minM; m <= maxM; m += 60) hours.push(m)

  return (
    <div className="overflow-auto">
      <div className="min-w-max">
        {/* Cabecera (columnas) */}
        <div className="flex sticky top-0 z-10 bg-surface-2 border-b border-border">
          <div className="shrink-0 w-[54px] px-2 py-2 text-[11px] font-semibold text-text-mute uppercase tracking-[0.05em]">
            Hora
          </div>
          {columns.map((c) => (
            <div key={c.key} className="flex-1 min-w-[132px] px-2 py-1.5 text-center border-l border-border-s">
              {c.header}
            </div>
          ))}
        </div>

        {/* Cuerpo */}
        <div className="flex">
          {/* Eje de horas */}
          <div className="shrink-0 w-[54px] relative" style={{ height: totalH }}>
            {hours.map((m) => (
              <div
                key={m}
                className="absolute left-0 right-1 text-right pr-1 font-mono text-[10px] text-text-mute"
                style={{ top: (m - minM) * PX_PER_MIN - 6 }}
              >
                {pad2(Math.floor(m / 60))}:{pad2(m % 60)}
              </div>
            ))}
          </div>

          {/* Columnas */}
          {columns.map((c) => (
            <div
              key={c.key}
              className="flex-1 min-w-[132px] relative border-l border-border-s"
              style={{ height: totalH }}
            >
              {/* Líneas de hora */}
              {hours.map((m) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 border-t border-border-s"
                  style={{ top: (m - minM) * PX_PER_MIN }}
                />
              ))}

              {/* Clases */}
              {c.items.map((h) => {
                const s = toMin(h.horaInicio)
                const e = toMin(h.horaFin)
                const col = cursoColor(h.curso.nombre)
                const conflicto = isConflicto(h.id)
                const height = Math.max(24, (e - s) * PX_PER_MIN - 3)
                return (
                  <div
                    key={h.id}
                    className="group absolute left-1 right-1 rounded-2 px-1.5 py-1 overflow-hidden flex flex-col gap-0.5 text-[11px]"
                    style={{
                      top: (s - minM) * PX_PER_MIN,
                      height,
                      background: conflicto ? 'var(--color-danger-l)' : `color-mix(in oklch, ${col} 12%, white)`,
                      border: `1px solid ${conflicto ? 'var(--color-danger)' : col}`,
                      borderLeft: `3px solid ${conflicto ? 'var(--color-danger)' : col}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-text leading-tight">{h.curso.nombre}</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        {conflicto && <AlertTriangle size={11} className="text-danger" />}
                        {!h.publicado && !conflicto && (
                          <span className="text-[8.5px] px-1 py-0.5 rounded bg-black/10 text-text-mute font-medium leading-none">
                            Borrador
                          </span>
                        )}
                        {!soloLectura && <CellMenu horario={h} onEdit={onEdit} onDelete={onDelete} onPublicar={onPublicar} />}
                      </span>
                    </div>
                    {height > 40 && (
                      <div className="text-text-mute leading-tight truncate">
                        {h.docente.nombre} {h.docente.apellidos}
                      </div>
                    )}
                    <span
                      className="mt-auto font-mono text-[9.5px] font-semibold"
                      style={{ color: conflicto ? 'var(--color-danger)' : col }}
                    >
                      {extractTime(h.horaInicio)}–{extractTime(h.horaFin)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

type ExportScope = 'completo' | 'aula' | 'dia'

interface ExportModalProps {
  horarios: Horario[]
  aulas: { id: string; nombre: string }[]
  onClose: () => void
}

function buildPrintHtml(
  opts: { scope: ExportScope; aulaId: string; dia: number; orientacion: 'landscape' | 'portrait'; conDocentes: boolean },
  horarios: Horario[],
  aulas: { id: string; nombre: string }[],
): string {
  const css = `
    @page { size: A4 ${opts.orientacion === 'landscape' ? 'landscape' : 'portrait'}; margin: 1.2cm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
    h2 { font-size: 14px; font-weight: 700; margin: 0 0 3px; }
    .sub { font-size: 10px; color: #64748b; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; font-size: 9.5px; font-weight: 600; text-transform: uppercase;
         letter-spacing: 0.04em; color: #475569; padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; }
    th.hora { text-align: left; width: 52px; }
    td { border: 1px solid #e2e8f0; padding: 3px; vertical-align: top; height: 66px; }
    td.hora { font-family: monospace; font-size: 10px; font-weight: 600; color: #94a3b8;
              background: #f8fafc; padding: 5px 6px; border-right: 1px solid #cbd5e1; }
    .card { height: 100%; padding: 3px 5px; font-size: 10px; line-height: 1.35; }
    .cn { font-weight: 600; }
    .cd { color: #64748b; }
    .page-break { page-break-after: always; }
  `
  const fecha = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  function t(dt: string | Date | undefined): string {
    if (!dt) return '00:00'
    const s = typeof dt === 'string' ? dt : dt.toISOString()
    return s.includes('T') ? s.slice(11, 16) : s.slice(0, 5)
  }
  function uniq(arr: string[]): string[] { return Array.from(new Set(arr)) }

  function aulaTable(data: Horario[], nombre: string): string {
    const slots = uniq(data.map(h => t(h.horaInicio))).sort()
    if (!slots.length) return `<h2>Aula ${nombre}</h2><p class="sub">Sin horarios asignados.</p>`
    const rows = slots.map(s => {
      const cells = [1,2,3,4,5,6].map(d => {
        const h = data.find(x => x.diaSemana === d && t(x.horaInicio) === s)
        if (!h) return '<td></td>'
        const doc = opts.conDocentes ? `<div class="cd">${h.docente.nombre} ${h.docente.apellidos}</div>` : ''
        return `<td><div class="card"><div class="cn">${h.curso.nombre}</div>${doc}</div></td>`
      }).join('')
      return `<tr><td class="hora">${s}</td>${cells}</tr>`
    }).join('')
    return `
      <h2>Horario — Aula ${nombre}</h2>
      <p class="sub">Sistema de Gestión Académica · ${fecha}</p>
      <table>
        <thead><tr><th class="hora">Hora</th>${DIAS.map(d => `<th>${d}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  function diaTable(data: Horario[], diaNum: number): string {
    const slots = uniq(data.map(h => t(h.horaInicio))).sort()
    if (!slots.length) return `<h2>${DIAS[diaNum - 1]}</h2><p class="sub">Sin horarios asignados.</p>`
    const rows = slots.map(s => {
      const cells = aulas.map(a => {
        const h = data.find(x => x.aulaId === a.id && t(x.horaInicio) === s)
        if (!h) return '<td></td>'
        const doc = opts.conDocentes ? `<div class="cd">${h.docente.nombre} ${h.docente.apellidos}</div>` : ''
        return `<td><div class="card"><div class="cn">${h.curso.nombre}</div>${doc}</div></td>`
      }).join('')
      return `<tr><td class="hora">${s}</td>${cells}</tr>`
    }).join('')
    return `
      <h2>Horarios del ${DIAS[diaNum - 1]}</h2>
      <p class="sub">Sistema de Gestión Académica · ${fecha}</p>
      <table>
        <thead><tr><th class="hora">Hora</th>${aulas.map(a => `<th>${a.nombre}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  let body = ''
  if (opts.scope === 'aula') {
    const aula = aulas.find(a => a.id === opts.aulaId)
    body = aulaTable(horarios.filter(h => h.aulaId === opts.aulaId), aula?.nombre ?? '—')
  } else if (opts.scope === 'dia') {
    body = diaTable(horarios.filter(h => h.diaSemana === opts.dia), opts.dia)
  } else {
    body = aulas.map((a, i) => {
      const table = aulaTable(horarios.filter(h => h.aulaId === a.id), a.nombre)
      return i < aulas.length - 1 ? `${table}<div class="page-break"></div>` : table
    }).join('')
  }

  const encabezado = `
    <div style="display:flex;align-items:center;gap:0;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1e3a5f">
      <div style="background:#7B1D1D;color:#fff;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-weight:bold;font-size:9px;text-align:center;flex-shrink:0">UNASAM</div>
      <div style="width:1px;height:44px;background:#e5e7eb;margin:0 8px;flex-shrink:0"></div>
      <div style="background:#1e3a5f;color:#fff;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-weight:bold;font-size:9px;flex-shrink:0">CPre</div>
      <div style="margin-left:10px;flex:1">
        <div style="font-weight:bold;font-size:15px;color:#1e3a5f">Centro Preuniversitario</div>
        <div style="font-size:8px;color:#6b7280;margin-top:2px">Universidad Nacional de San Martín · Sistema de Gestión Académica</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:8px;color:#6b7280">Generado: ${fecha}</div>
        <div style="background:#4a6fa5;color:#fff;padding:2px 8px;border-radius:10px;font-size:7px;font-weight:bold;display:inline-block;margin-top:4px">HORARIO OFICIAL</div>
      </div>
    </div>`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Horarios — Centro Preuniversitario</title><style>${css}</style>
    </head><body>${encabezado}${body}</body></html>`
}

function ExportModal({ horarios, aulas, onClose }: ExportModalProps) {
  const [scope, setScope]             = useState<ExportScope>('completo')
  const [aulaId, setAulaId]           = useState(aulas[0]?.id ?? '')
  const [dia, setDia]                 = useState(1)
  const [orientacion, setOrientacion] = useState<'landscape' | 'portrait'>('landscape')
  const [conDocentes, setConDocentes] = useState(true)

  // Cerrar con Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleExport() {
    const html = buildPrintHtml({ scope, aulaId, dia, orientacion, conDocentes }, horarios, aulas)
    const w = window.open('', '_blank', 'width=960,height=720')
    if (!w) { alert('Habilita las ventanas emergentes para exportar.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
    onClose()
  }

  const scopeOpts: { value: ExportScope; label: string; desc: string }[] = [
    { value: 'completo', label: 'Horario completo', desc: 'Todas las aulas — una página por aula' },
    { value: 'aula',     label: 'Por aula',         desc: 'Una aula específica, vista semanal' },
    { value: 'dia',      label: 'Por día',           desc: 'Un día con todas las aulas en columnas' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Exportar horario</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text border-none bg-transparent cursor-pointer p-1 rounded-2 hover:bg-surface2"><X size={16} /></button>
        </div>

        {/* Alcance */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-text-mute uppercase tracking-wide">¿Qué exportar?</span>
          <div className="flex flex-col gap-2">
            {scopeOpts.map(opt => (
              <button
                key={opt.value}
                onClick={() => setScope(opt.value)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2 border text-left transition-colors ${
                  scope === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-2'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  scope === opt.value ? 'border-primary' : 'border-border'
                }`}>
                  {scope === opt.value && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                <div>
                  <div className="text-[13px] font-medium">{opt.label}</div>
                  <div className="text-[11px] text-text-mute">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selector condicional */}
        {scope === 'aula' && (
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Aula</span>
            <select value={aulaId} onChange={(e) => setAulaId(e.target.value)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface">
              {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </label>
        )}
        {scope === 'dia' && (
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Día</span>
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface">
              {DIA_FULL.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
          </label>
        )}

        {/* Opciones */}
        <div className="flex flex-col gap-3">
          <span className="text-[12px] font-medium text-text-mute uppercase tracking-wide">Opciones de formato</span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px]">Orientación de página</span>
              <div className="flex rounded-2 border border-border overflow-hidden text-[12px]">
                {(['landscape', 'portrait'] as const).map(o => (
                  <button key={o} onClick={() => setOrientacion(o)}
                    className={`px-3 py-1.5 transition-colors ${
                      orientacion === o ? 'bg-primary text-white font-medium' : 'bg-surface hover:bg-surface-2 text-text'
                    }`}>
                    {o === 'landscape' ? 'Horizontal' : 'Vertical'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px]">Incluir nombre del docente</span>
              <button onClick={() => setConDocentes(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${conDocentes ? 'bg-primary' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  conDocentes ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1 border-t border-border-s">
          <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
          <Btn type="button" className="flex-1" icon={<Download size={14} />} onClick={handleExport}>
            Exportar PDF
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HorariosPage() {
  const { user } = useAuth()
  const isVigilante = user?.rol === 'vigilante'
  const isDocente   = user?.rol === 'docente'
  const soloLectura = isVigilante || isDocente   // sin crear/editar/eliminar
  const docenteId   = isDocente ? user?.docente?.id : undefined

  const [aulaId, setAulaId]       = useState('')
  const [turnoFiltro, setTurnoFiltro] = useState<'' | 'manana' | 'tarde'>('')
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected]   = useState<Horario | null>(null)
  const [diaVista, setDiaVista]   = useState(1)
  const [showExport, setShowExport] = useState(false)

  const { data: aulas = [] }           = useAulas()
  const { data: docentesPage }         = useDocentes({ limit: 100 })
  // Si es docente, filtrar siempre por su docente_id (ignora filtro aulaId)
  const { data: horariosPage, isLoading } = useHorarios(
    isDocente
      ? { docente_id: docenteId, limit: 200 }
      : { aula_id: aulaId || undefined }
  )
  const { data: conflictos = [] }      = useConflictosHorario()
  const deleteMut                      = useDeleteHorario()
  const updateMut                      = useUpdateHorario()

  const docentes = (docentesPage as any)?.data ?? []
  const horariosRaw: Horario[] = (horariosPage as any)?.data ?? horariosPage ?? []

  // ── Búsqueda por curso o docente ──────────────────────────────
  const q = busqueda.trim().toLowerCase()
  const matchBusqueda = (h: Horario) =>
    !q ||
    h.curso.nombre.toLowerCase().includes(q) ||
    `${h.docente.nombre} ${h.docente.apellidos}`.toLowerCase().includes(q)

  const horarios = horariosRaw.filter(matchBusqueda)
  const slots = getSlots(horarios)

  // ── Aulas filtradas por turno (columnas de la vista global y desplegable) ──
  const aulasFiltradas = aulas.filter((a) => !turnoFiltro || a.turno === turnoFiltro)
  const aulaIdsTurno   = new Set(aulasFiltradas.map((a) => a.id))

  // pivot view (all aulas): filter by selected day + turno
  const horariosDelDia = horarios.filter((h) => h.diaSemana === diaVista && aulaIdsTurno.has(h.aulaId))
  const slotsDelDia    = getSlots(horariosDelDia)

  const isConflicto = (id: string) => conflictos.some((c: Horario) => c.id === id)

  function openCreate() { setSelected(null); setModal('create') }
  function openEdit(h: Horario) { setSelected(h); setModal('edit') }
  function closeModal() { setModal(null); setSelected(null) }

  async function handleDelete(h: Horario) {
    if (!confirm(`¿Eliminar la clase de ${h.curso.nombre} del ${DIA_FULL[h.diaSemana - 1]}?`)) return
    await deleteMut.mutateAsync(h.id)
  }

  async function handlePublicar(h: Horario) {
    await updateMut.mutateAsync({ id: h.id, publicado: true })
  }

  return (
    <>
      {(modal === 'create' || modal === 'edit') && (
        <HorarioModal horario={modal === 'edit' ? selected : null} onClose={closeModal} />
      )}
      {showExport && (
        <ExportModal horarios={horariosRaw} aulas={aulas} onClose={() => setShowExport(false)} />
      )}

      <PageHeader
        title="Horarios"
        crumbs={[{ label: 'Horarios' }]}
        action={!soloLectura ? (
          <>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm" onClick={() => setShowExport(true)}>
              Exportar PDF
            </Btn>
            <Btn icon={<Plus size={14} />} size="sm" onClick={openCreate}>
              Asignar clase
            </Btn>
          </>
        ) : undefined}
      />

      <div className="p-4 md:p-7 grid gap-3.5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main */}
        <div className="flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {isDocente ? (
              <span className="text-[13px] font-medium text-text-mute">
                Mi horario semanal
              </span>
            ) : (
              <>
                {/* Aula — agrupada por turno y con área para desambiguar */}
                <select
                  value={aulaId}
                  onChange={(e) => setAulaId(e.target.value)}
                  className="px-3 py-1.5 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Todas las aulas</option>
                  {(['manana', 'tarde'] as const).map((t) => {
                    const list = aulas.filter((a) => a.turno === t)
                    if (!list.length) return null
                    return (
                      <optgroup key={t} label={TURNO_LABEL[t]}>
                        {list.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} · {AREA_LABEL[a.area]}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>

                {/* Filtro de turno — solo aplica a la vista global */}
                {!aulaId && (
                  <div className="flex rounded-2 border border-border overflow-hidden text-[12px]">
                    {([['', 'Todos'], ['manana', 'Mañana'], ['tarde', 'Tarde']] as const).map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setTurnoFiltro(val)}
                        className={`px-3 py-1.5 transition-colors ${
                          turnoFiltro === val
                            ? 'bg-primary text-white font-medium'
                            : 'bg-surface hover:bg-surface-2 text-text-mute'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                )}

                {/* Búsqueda por curso o docente */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar curso o docente…"
                    className="pl-8 pr-7 py-1.5 text-[13px] border border-border rounded-2 bg-surface w-[210px] focus:outline-none focus:border-primary"
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-mute hover:text-text bg-transparent border-none cursor-pointer p-0"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </>
            )}
            <div className="flex-1" />
            {conflictos.length > 0 && (
              <Pill tone="danger">
                <Dot tone="danger" size={6} />
                {conflictos.length} conflicto{conflictos.length > 1 ? 's' : ''} detectado{conflictos.length > 1 ? 's' : ''}
              </Pill>
            )}
          </div>

          {/* Conflict alert */}
          {conflictos.length > 0 && (
            <div className="flex gap-3 p-3 bg-danger-l border border-danger rounded-2 items-center">
              <AlertTriangle size={16} className="text-danger shrink-0" />
              <div className="flex-1 text-[12.5px]">
                <strong className="text-danger">Conflicto de horario:</strong>{' '}
                Hay {conflictos.length} horario{conflictos.length > 1 ? 's' : ''} con superposición. Revise y corrija.
              </div>
              {!soloLectura && (
                <Btn variant="secondary" size="sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                  Resolver
                </Btn>
              )}
            </div>
          )}

          {/* Grid */}
          {!aulaId ? (
            /* ── Vista global: aulas como columnas, selector de día ── */
            <div className="bg-surface border border-border rounded-3 shadow-1 overflow-auto">
              <div className="flex gap-1 p-3 border-b border-border-s overflow-x-auto">
                {DIA_FULL.map((d, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setDiaVista(i + 1)}
                    className={`px-3 py-1 text-[12px] rounded-2 whitespace-nowrap transition-colors ${
                      diaVista === i + 1
                        ? 'bg-primary text-white font-medium'
                        : 'text-text-mute hover:bg-surface-2'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {isLoading ? (
                <div className="text-center py-10 text-text-mute text-[13px]">Cargando horarios…</div>
              ) : slotsDelDia.length === 0 ? (
                <div className="text-center py-10 text-text-mute text-[13px]">
                  No hay horarios para el {DIA_FULL[diaVista - 1]}.{!soloLectura && (<><br />
                  <button onClick={openCreate} className="mt-2 text-primary text-[12px] hover:underline">
                    + Asignar clase
                  </button></>)}
                </div>
              ) : (
                <HorarioCalendario
                  columns={aulasFiltradas.map((a) => ({
                    key: a.id,
                    header: (
                      <>
                        <div className="text-[11px] font-semibold text-text leading-tight">{a.nombre}</div>
                        <div className="text-[8.5px] font-medium text-text-mute uppercase tracking-wide">
                          {TURNO_LABEL[a.turno]} · {AREA_LABEL[a.area]}
                        </div>
                      </>
                    ),
                    items: horariosDelDia.filter((h) => h.aulaId === a.id),
                  }))}
                  soloLectura={soloLectura}
                  isConflicto={isConflicto}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onPublicar={handlePublicar}
                />
              )}
            </div>
          ) : (
            /* ── Vista por aula: días como columnas ── */
            <div className="bg-surface border border-border rounded-3 shadow-1 overflow-auto">
              {isLoading ? (
                <div className="text-center py-10 text-text-mute text-[13px]">Cargando horarios…</div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 text-text-mute text-[13px]">
                  No hay horarios registrados para esta aula.{!soloLectura && (<><br />
                  <button onClick={openCreate} className="mt-2 text-primary text-[12px] hover:underline">
                    + Asignar primera clase
                  </button></>)}
                </div>
              ) : (
                <HorarioCalendario
                  columns={DIAS_NUM.map((dia) => ({
                    key: String(dia),
                    header: <span className="text-[11px] font-semibold text-text">{DIA_FULL[dia - 1]}</span>,
                    items: horarios.filter((h) => h.diaSemana === dia),
                  }))}
                  soloLectura={soloLectura}
                  isConflicto={isConflicto}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onPublicar={handlePublicar}
                />
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3">
          <Card title="Aulas" subtitle="Resumen del ciclo">
            <div className="flex flex-col divide-y divide-border-s">
              {aulas.slice(0, 6).map((a) => {
                const hCount = horariosRaw.filter((h) => h.aulaId === a.id).length
                return (
                  <div key={a.id} className="flex items-center gap-2.5 py-2">
                    <Dot tone={hCount > 0 ? 'success' : 'neutral'} />
                    <div className="flex-1 text-[12.5px]">{a.nombre}</div>
                    <span className="font-mono text-[11.5px] text-text-mute">{hCount}h</span>
                  </div>
                )
              })}
              {aulas.length === 0 && (
                <div className="py-4 text-center text-[12px] text-text-mute">Sin aulas</div>
              )}
            </div>
          </Card>

          <Card title="Docentes" subtitle="Disponibles">
            <div className="flex flex-col divide-y divide-border-s">
              {docentes.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center gap-2.5 py-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: cursoColor(d.especialidad ?? d.nombre) }}
                  >
                    {d.nombre[0]}{d.apellidos[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{d.nombre} {d.apellidos}</div>
                    <div className="text-[11px] text-text-mute truncate">{d.especialidad ?? '—'}</div>
                  </div>
                  {!soloLectura && (
                    <button
                      onClick={openCreate}
                      className="text-text-mute hover:text-primary p-0.5"
                      title="Asignar clase"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              ))}
              {docentes.length === 0 && (
                <div className="py-4 text-center text-[12px] text-text-mute">Sin docentes</div>
              )}
            </div>
          </Card>

          <Card title="Leyenda" subtitle="Cursos">
            <div className="flex flex-col gap-1.5 text-[12px]">
              {Object.entries(CURSO_COLORS).slice(0, 8).map(([nombre, col]) => (
                <div key={nombre} className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: col }} />
                  <span>{nombre}</span>
                </div>
              ))}
              {Object.keys(CURSO_COLORS).length === 0 && (
                <span className="text-text-mute">Sin cursos en pantalla</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
