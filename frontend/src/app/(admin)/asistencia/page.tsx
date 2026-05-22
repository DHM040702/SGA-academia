'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useAsistencia, useResumenAsistencia,
  useManualAsistencia, useCorrectAsistencia, useDeleteAsistencia,
} from '@/hooks/use-asistencia'
import type { AsistenciaRecord } from '@/hooks/use-asistencia'
import { useAulas } from '@/hooks/use-ciclos'
import { useAlumnos } from '@/hooks/use-alumnos'
import { useDocentes } from '@/hooks/use-docentes'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Download, Edit, ScanLine, MoreHorizontal, X, Plus } from '@/components/icons'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function todayStr() { return new Date().toISOString().split('T')[0] }

// ─── RowMenu ──────────────────────────────────────────────────────────────────

function RowMenu({ registro, onCorregir, onEliminar }: {
  registro: AsistenciaRecord
  onCorregir: (r: AsistenciaRecord) => void
  onEliminar: (r: AsistenciaRecord) => void
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
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1 rounded hover:bg-surface-2 text-text-mute hover:text-text transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border rounded-2 shadow-2 py-1 w-40">
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-2 flex items-center gap-2"
            onClick={() => { onCorregir(registro); setOpen(false) }}
          >
            <Edit size={12} /> Corregir registro
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] text-danger hover:bg-danger-l flex items-center gap-2"
            onClick={() => { onEliminar(registro); setOpen(false) }}
          >
            <X size={12} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── CorrectModal ─────────────────────────────────────────────────────────────

function CorrectModal({ registro, onClose }: { registro: AsistenciaRecord; onClose: () => void }) {
  const mut = useCorrectAsistencia()
  const persona = registro.tipoPersona === 'alumno' ? registro.alumno : registro.docente
  const nombre  = persona ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}` : '—'

  const [horaLlegada, setHoraLlegada] = useState(formatHora(registro.horaIngreso).replace('—', ''))
  const [esTardanza,  setEsTardanza]  = useState(registro.esTardanza)
  const [observacion, setObservacion] = useState(registro.motivoManual ?? '')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await mut.mutateAsync({
        id: registro.id,
        hora_llegada: horaLlegada || undefined,
        es_tardanza:  esTardanza,
        observacion:  observacion || undefined,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Corregir registro</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        {/* Persona */}
        <div className="flex items-center gap-2.5 p-3 bg-surface-2 rounded-2">
          <Avatar name={nombre} size={32} />
          <div>
            <div className="text-[13px] font-medium">{nombre}</div>
            <Pill tone={registro.tipoPersona === 'alumno' ? 'primary' : 'info'} style={{ fontSize: 10 }}>
              {registro.tipoPersona === 'alumno' ? 'Alumno' : 'Docente'}
            </Pill>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Hora de llegada</span>
            <input type="time" value={horaLlegada} onChange={e => setHoraLlegada(e.target.value)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
          </label>

          <div className="flex items-center justify-between">
            <span className="text-[13px]">Marcar como tardanza</span>
            <button type="button" onClick={() => setEsTardanza(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative ${esTardanza ? 'bg-warning' : 'bg-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${esTardanza ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Observación (opcional)</span>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none"
              placeholder="Motivo de la corrección…" />
          </label>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" className="flex-1" disabled={mut.isPending}>
              {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ManualModal ──────────────────────────────────────────────────────────────

function ManualModal({ onClose }: { onClose: () => void }) {
  const { data: aulasData = [] }  = useAulas()
  const { data: docentesPage }    = useDocentes({ limit: 200 })
  const docentes = (docentesPage as any)?.data ?? []

  const [tipo, setTipo]           = useState<'alumno' | 'docente'>('alumno')
  const [aulaId, setAulaId]       = useState('')
  const [alumnoId, setAlumnoId]   = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [alumnoSearch, setAlumnoSearch]   = useState('')
  const [docenteSearch, setDocenteSearch] = useState('')
  const [fecha, setFecha]         = useState(todayStr())
  const [horaLlegada, setHoraLlegada] = useState('')
  const [esTardanza,  setEsTardanza]  = useState(false)
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')

  const { data: alumnosPage } = useAlumnos({ aula_id: aulaId || undefined, limit: 300 })
  const alumnos = alumnosPage?.data ?? []

  const alumnosFiltrados = alumnos.filter((a: any) => {
    if (!alumnoSearch) return true
    const q = alumnoSearch.toLowerCase()
    const nombre = `${a.nombres ?? a.nombre ?? ''} ${a.apellidos ?? ''}`.toLowerCase()
    const codigo = (a.codigo_barra ?? a.codigoBarras ?? '').toLowerCase()
    return nombre.includes(q) || codigo.includes(q)
  })

  const docentesFiltrados = docentes.filter((d: any) => {
    if (!docenteSearch) return true
    const q = docenteSearch.toLowerCase()
    const nombre = `${d.nombre ?? ''} ${d.apellidos ?? ''}`.toLowerCase()
    const dni = (d.dni ?? '').toLowerCase()
    return nombre.includes(q) || dni.includes(q)
  })

  const mut = useManualAsistencia()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!horaLlegada) { setError('La hora de llegada es obligatoria'); return }
    if (tipo === 'alumno' && !alumnoId) { setError('Selecciona un alumno'); return }
    if (tipo === 'docente' && !docenteId) { setError('Selecciona un docente'); return }
    try {
      await mut.mutateAsync({
        tipo_persona: tipo,
        alumno_id:    tipo === 'alumno'   ? alumnoId   : undefined,
        docente_id:   tipo === 'docente'  ? docenteId  : undefined,
        fecha,
        hora_llegada: horaLlegada,
        es_tardanza:  esTardanza,
        observacion:  observacion || undefined,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Registro manual de asistencia</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        {/* Tipo toggle */}
        <div className="flex rounded-2 border border-border overflow-hidden text-[13px]">
          {(['alumno', 'docente'] as const).map(t => (
            <button key={t} onClick={() => { setTipo(t); setAlumnoId(''); setDocenteId(''); setAlumnoSearch(''); setDocenteSearch('') }}
              className={`flex-1 py-2 font-medium transition-colors ${tipo === t ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-2'}`}>
              {t === 'alumno' ? 'Alumno' : 'Docente'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Persona selector */}
          {tipo === 'alumno' ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">Aula (filtrar alumnos)</span>
                <select value={aulaId} onChange={e => { setAulaId(e.target.value); setAlumnoId(''); setAlumnoSearch('') }}
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface">
                  <option value="">Todas las aulas</option>
                  {aulasData.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">Alumno</span>
                <input
                  type="text"
                  value={alumnoSearch}
                  onChange={e => { setAlumnoSearch(e.target.value); setAlumnoId('') }}
                  placeholder="Buscar por nombre, apellidos o código…"
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface"
                />
                {alumnosFiltrados.length > 0 && (
                  <select value={alumnoId} onChange={e => setAlumnoId(e.target.value)} required
                    size={Math.min(alumnosFiltrados.length + 1, 6)}
                    className="px-3 py-1.5 text-[13px] border border-border rounded-2 bg-surface">
                    <option value="">Seleccionar alumno…</option>
                    {alumnosFiltrados.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.nombres ?? a.nombre} {a.apellidos} — {a.codigo_barra ?? a.codigoBarras}
                      </option>
                    ))}
                  </select>
                )}
                {alumnoSearch && alumnosFiltrados.length === 0 && (
                  <p className="text-[11px] text-text-mute px-1">Sin resultados para "{alumnoSearch}"</p>
                )}
                {alumnoId && (
                  <p className="text-[11px] text-success px-1">
                    ✓ {(() => { const a = alumnos.find((x: any) => x.id === alumnoId) as any; return a ? `${a.nombres ?? a.nombre} ${a.apellidos}` : '' })()}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Docente</span>
              <input
                type="text"
                value={docenteSearch}
                onChange={e => { setDocenteSearch(e.target.value); setDocenteId('') }}
                placeholder="Buscar por nombre, apellidos o DNI…"
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface"
              />
              {docentesFiltrados.length > 0 && (
                <select value={docenteId} onChange={e => setDocenteId(e.target.value)} required
                  size={Math.min(docentesFiltrados.length + 1, 6)}
                  className="px-3 py-1.5 text-[13px] border border-border rounded-2 bg-surface">
                  <option value="">Seleccionar docente…</option>
                  {docentesFiltrados.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nombre} {d.apellidos} — {d.dni}</option>
                  ))}
                </select>
              )}
              {docenteSearch && docentesFiltrados.length === 0 && (
                <p className="text-[11px] text-text-mute px-1">Sin resultados para "{docenteSearch}"</p>
              )}
              {docenteId && (
                <p className="text-[11px] text-success px-1">
                  ✓ {(() => { const d = docentes.find((x: any) => x.id === docenteId) as any; return d ? `${d.nombre} ${d.apellidos}` : '' })()}
                </p>
              )}
            </div>
          )}

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Fecha</span>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Hora de llegada</span>
              <input type="time" value={horaLlegada} onChange={e => setHoraLlegada(e.target.value)} required
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
            </label>
          </div>

          {/* Tardanza toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[13px]">Marcar como tardanza</span>
            <button type="button" onClick={() => setEsTardanza(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative ${esTardanza ? 'bg-warning' : 'bg-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${esTardanza ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Observación */}
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Observación (opcional)</span>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none"
              placeholder="Motivo del registro manual…" />
          </label>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" className="flex-1" icon={<Plus size={14} />} disabled={mut.isPending}>
              {mut.isPending ? 'Guardando…' : 'Registrar asistencia'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Export helper ────────────────────────────────────────────────────────────

function exportarAsistencia(registros: AsistenciaRecord[], fecha: string) {
  const css = `
    @page { size: A4 landscape; margin: 1.2cm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
    h2 { font-size: 14px; font-weight: 700; margin: 0 0 3px; }
    .sub { font-size: 10px; color: #64748b; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; font-size: 9.5px; font-weight: 600; text-transform: uppercase;
         letter-spacing: 0.04em; padding: 5px 8px; border: 1px solid #cbd5e1; text-align: left; }
    td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 11px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; border-radius: 99px; padding: 1px 7px; font-size: 9.5px; font-weight: 600; }
    .puntual { background: #dcfce7; color: #166534; }
    .tardanza { background: #fef9c3; color: #854d0e; }
    .alumno { background: #dbeafe; color: #1e40af; }
    .docente { background: #e0e7ff; color: #3730a3; }
  `
  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const filas = registros.map(r => {
    const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
    const nombre  = persona ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}` : '—'
    const hora    = r.horaIngreso ? new Date(r.horaIngreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'
    const aula    = r.tipoPersona === 'alumno' ? (r.alumno?.aula?.nombre ?? '—') : '—'
    const estado  = r.esTardanza ? '<span class="badge tardanza">Tardanza</span>' : '<span class="badge puntual">Puntual</span>'
    const tipo    = r.tipoPersona === 'alumno' ? '<span class="badge alumno">Alumno</span>' : '<span class="badge docente">Docente</span>'
    return `<tr><td>${hora}</td><td>${nombre}</td><td>${tipo}</td><td>${aula}</td><td>${estado}</td><td>${r.esManual ? 'Manual' : 'Escáner'}</td></tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Asistencia ${fecha}</title><style>${css}</style></head>
    <body>
      <h2>Registro de Asistencia</h2>
      <p class="sub">Sistema de Gestión Académica · ${fechaLabel} · ${registros.length} registros</p>
      <table>
        <thead><tr><th>Hora</th><th>Nombre</th><th>Tipo</th><th>Aula</th><th>Estado</th><th>Origen</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </body></html>`

  const w = window.open('', '_blank', 'width=960,height=720')
  if (!w) { alert('Habilita las ventanas emergentes para exportar'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AsistenciaPage() {
  const [fecha,        setFecha]        = useState(todayStr())
  const [aulaFilter,   setAulaFilter]   = useState('')
  const [tipoFilter,   setTipoFilter]   = useState<'alumno' | 'docente' | ''>('')
  const [showManual,   setShowManual]   = useState(false)
  const [correctTarget, setCorrectTarget] = useState<AsistenciaRecord | null>(null)
  const deleteMut = useDeleteAsistencia()

  const { data: aulas = [] }    = useAulas()
  const { data: stats }         = useResumenAsistencia()
  const { data: page, isLoading } = useAsistencia({
    fecha,
    tipo:    tipoFilter  || undefined,
    aula_id: aulaFilter  || undefined,
    limit:   100,
  })

  const registros = page?.data ?? []
  const presentes = stats?.presentes ?? registros.filter(r => !r.esTardanza).length
  const tardanzas = stats?.tardanzas ?? registros.filter(r =>  r.esTardanza).length
  const total     = stats?.total_alumno ?? registros.length
  const ausentes  = Math.max(0, total - presentes - tardanzas)

  async function handleEliminar(r: AsistenciaRecord) {
    if (!confirm(`¿Eliminar el registro de asistencia de ${r.tipoPersona === 'alumno' ? r.alumno?.nombre : r.docente?.nombre}?`)) return
    await deleteMut.mutateAsync(r.id)
  }

  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <>
      {showManual   && <ManualModal onClose={() => setShowManual(false)} />}
      {correctTarget && <CorrectModal registro={correctTarget} onClose={() => setCorrectTarget(null)} />}

      <PageHeader
        title="Asistencia"
        crumbs={[{ label: 'Asistencia' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm"
              onClick={() => exportarAsistencia(registros, fecha)}>
              Exportar PDF
            </Btn>
            <Btn variant="secondary" icon={<Edit size={14} />} size="sm"
              onClick={() => setShowManual(true)}>
              Registro manual
            </Btn>
            <Btn icon={<ScanLine size={14} />} size="sm"
              onClick={() => window.open('/vigilante', '_blank')}>
              Pantalla vigilante
            </Btn>
          </>
        }
      />

      <div className="p-7 flex flex-col gap-3.5">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3.5">
          <KPI label="Presentes hoy"    value={presentes}  sub={`de ${total} registros`}  trend={4} accent="var(--color-success)" />
          <KPI label="Tardanzas hoy"    value={tardanzas}  sub="del total"                         accent="var(--color-warning)" />
          <KPI label="Ausentes"         value={ausentes}   sub="sin registro"                       accent="var(--color-danger)" />
          <KPI label="Docentes hoy"     value={stats?.docentes_hoy ?? 0} sub="marcaron asistencia"  accent="var(--color-primary)" />
        </div>

        {/* Content */}
        <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          {/* Tabla principal */}
          <Card
            title="Registros del día"
            subtitle={fechaLabel}
            action={
              <div className="flex gap-1.5 items-center flex-wrap">
                {/* Selector de fecha */}
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface"
                />
                {/* Filtro por aula */}
                <select value={aulaFilter} onChange={e => setAulaFilter(e.target.value)}
                  className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface">
                  <option value="">Todas las aulas</option>
                  {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                {/* Filtro por tipo */}
                <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value as any)}
                  className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface">
                  <option value="">Todos</option>
                  <option value="alumno">Alumnos</option>
                  <option value="docente">Docentes</option>
                </select>
              </div>
            }
          >
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-2">
                  {['Hora', 'Persona', 'Tipo', 'Aula', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-text-mute">Cargando…</td></tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-text-mute">
                      No hay registros para este día.
                      <br />
                      <button onClick={() => setShowManual(true)} className="mt-2 text-primary text-[12px] hover:underline">
                        + Agregar registro manual
                      </button>
                    </td>
                  </tr>
                ) : (
                  registros.map(r => {
                    const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
                    const nombre  = persona
                      ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}`
                      : '—'
                    const aulaNombre = r.tipoPersona === 'alumno' ? (r.alumno?.aula?.nombre ?? '—') : '—'
                    return (
                      <tr key={r.id} className="border-t border-border-s hover:bg-surface-2/40">
                        <td className="px-3.5 py-2.5 font-mono text-[12.5px]">{formatHora(r.horaIngreso)}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={nombre} size={28} />
                            <div>
                              <div className="font-medium leading-tight">{nombre}</div>
                              {r.esManual && (
                                <span className="text-[10px] text-text-mute">Manual</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={r.tipoPersona === 'alumno' ? 'primary' : 'info'}>
                            {r.tipoPersona === 'alumno' ? 'Alumno' : 'Docente'}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12px] text-text-mute">{aulaNombre}</td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={r.esTardanza ? 'warning' : 'success'}>
                            <Dot tone={r.esTardanza ? 'warning' : 'success'} size={6} />
                            {r.esTardanza ? 'Tardanza' : 'Puntual'}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <RowMenu
                            registro={r}
                            onCorregir={setCorrectTarget}
                            onEliminar={handleEliminar}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </Card>

          {/* Panel derecho */}
          <div className="flex flex-col gap-3.5">
            {/* Docentes del día */}
            <Card title="Docentes · hoy" subtitle="Registro del día">
              {registros.filter(r => r.tipoPersona === 'docente' && r.docente).length === 0 ? (
                <div className="py-4 text-center text-[12px] text-text-mute">Sin registros de docentes</div>
              ) : (
                registros.filter(r => r.tipoPersona === 'docente' && r.docente).slice(0, 6).map(r => (
                  <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-t border-border-s first:border-t-0">
                    <Avatar name={`${r.docente!.nombre} ${r.docente!.apellidos}`} size={26} />
                    <div className="flex-1 text-[12.5px] font-medium truncate">
                      {r.docente!.nombre} {r.docente!.apellidos}
                    </div>
                    <span className="font-mono text-[11px] text-text-mute shrink-0">{formatHora(r.horaIngreso)}</span>
                    <Pill tone={r.esTardanza ? 'warning' : 'success'} style={{ fontSize: 10 }}>
                      {r.esTardanza ? 'Tarde' : 'Puntual'}
                    </Pill>
                  </div>
                ))
              )}
            </Card>

            {/* Estadísticas */}
            <Card title="Estadísticas" subtitle="Resumen del día">
              <div className="flex flex-col gap-2 py-1">
                <StatRow label="Total registros"  value={total}     />
                <StatRow label="Puntuales"         value={presentes} color="var(--color-success)" />
                <StatRow label="Tardanzas"         value={tardanzas} color="var(--color-warning)" />
                <StatRow label="Docentes presentes" value={stats?.docentes_hoy ?? 0} color="var(--color-primary)" />
                <StatRow
                  label="% puntualidad"
                  value={total > 0 ? `${Math.round((presentes / (presentes + tardanzas || 1)) * 100)}%` : '—'}
                />
              </div>
            </Card>

            {/* Acceso rápido */}
            <Card title="Acciones rápidas" subtitle="">
              <div className="flex flex-col gap-2 py-1">
                <Btn variant="secondary" size="sm" icon={<Plus size={13} />}
                  onClick={() => setShowManual(true)} className="w-full justify-start">
                  Registro manual de asistencia
                </Btn>
                <Btn variant="secondary" size="sm" icon={<Download size={13} />}
                  onClick={() => exportarAsistencia(registros, fecha)} className="w-full justify-start">
                  Exportar lista del día
                </Btn>
                <Btn variant="secondary" size="sm" icon={<ScanLine size={13} />}
                  onClick={() => window.open('/vigilante', '_blank')} className="w-full justify-start">
                  Abrir pantalla de kiosko
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-t border-border-s first:border-t-0 text-[13px]">
      <span className="text-text-mute">{label}</span>
      <span className="font-mono font-semibold" style={{ color: color ?? 'inherit' }}>{value}</span>
    </div>
  )
}
