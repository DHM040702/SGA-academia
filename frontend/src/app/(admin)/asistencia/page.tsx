'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useAsistencia, useResumenAsistencia,
  useManualAsistencia, useCorrectAsistencia, useDeleteAsistencia,
  useCerrarTurno, useJustificarAusencia,
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
import { Download, Edit, ScanLine, MoreHorizontal, X, Plus, Lock, FileText, Clock } from '@/components/icons'
import { useTurnos, isoToHHMM } from '@/hooks/use-turnos'
import { useAuth } from '@/contexts/auth-context'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────

function RowMenu({ registro, onCorregir, onEliminar, onJustificar }: {
  registro: AsistenciaRecord
  onCorregir: (r: AsistenciaRecord) => void
  onEliminar: (r: AsistenciaRecord) => void
  onJustificar: (r: AsistenciaRecord) => void
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
          {!registro.esAusente && (
            <button
              className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-2 flex items-center gap-2"
              onClick={() => { onCorregir(registro); setOpen(false) }}
            >
              <Edit size={12} /> Corregir registro
            </button>
          )}
          {registro.esAusente && (
            <button
              className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-2 flex items-center gap-2"
              onClick={() => { onJustificar(registro); setOpen(false) }}
            >
              <FileText size={12} /> {registro.justificacionRazon ? 'Editar justificación' : 'Justificar falta'}
            </button>
          )}
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

// ─── JustificarModal ──────────────────────────────────────────────────────────

function JustificarModal({ registro, onClose }: { registro: AsistenciaRecord; onClose: () => void }) {
  const mut = useJustificarAusencia()
  const persona = registro.alumno
  const nombre  = persona ? `${persona.nombre} ${persona.apellidos}` : '—'

  const [razon,  setRazon]  = useState(registro.justificacionRazon ?? '')
  const [docNum, setDocNum] = useState(registro.justificacionDoc ?? '')
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!razon.trim()) { setError('La razón es obligatoria'); return }
    try {
      await mut.mutateAsync({ id: registro.id, razon: razon.trim(), doc_num: docNum.trim() || undefined })
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
          <h2 className="text-[15px] font-semibold">Justificar falta</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-2.5 p-3 bg-surface-2 rounded-2">
          <Avatar name={nombre} size={32} />
          <div>
            <div className="text-[13px] font-medium">{nombre}</div>
            <div className="text-[11px] text-text-mute">{persona?.aula?.nombre ?? '—'} · Ausente</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Razón de la justificación *</span>
            <textarea value={razon} onChange={e => setRazon(e.target.value)} rows={3} required
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none"
              placeholder="Describe el motivo de la falta justificada…" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">N.° de documento aprobatorio</span>
            <input type="text" value={docNum} onChange={e => setDocNum(e.target.value)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface"
              placeholder="Ej: Certificado médico N.° 12345" />
          </label>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" className="flex-1" icon={<FileText size={14} />} disabled={mut.isPending}>
              {mut.isPending ? 'Guardando…' : 'Guardar justificación'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CerrarTurnoModal ─────────────────────────────────────────────────────────

function CerrarTurnoModal({ onClose }: { onClose: () => void }) {
  const mut = useCerrarTurno()
  const { data: turnosConfig = [] } = useTurnos()
  const [turno, setTurno] = useState<'manana' | 'tarde' | ''>('')
  const [result, setResult] = useState<{ created: number; message: string } | null>(null)
  const [error,  setError]  = useState('')

  const configSeleccionado = turnosConfig.find((t) => t.turno === turno)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turno) return
    setError('')
    try {
      const res = await mut.mutateAsync({ turno })
      setResult(res)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al cerrar turno'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <Lock size={16} className="text-warning" /> Cerrar asistencia del turno
          </h2>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        {result ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-surface-2 rounded-2 text-center">
              <div className="text-[28px] font-bold font-serif text-warning">{result.created}</div>
              <div className="text-[13px] text-text-mute mt-1">{result.message}</div>
              {result.created > 0 && (
                <div className="mt-2 text-[12px] text-text-mute">
                  Los alumnos marcados como ausentes aparecen en la tabla. Puedes agregar justificaciones individualmente.
                </div>
              )}
            </div>
            <Btn onClick={onClose} className="w-full">Cerrar</Btn>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="p-3 bg-warning-l rounded-2 text-[12.5px] text-text leading-relaxed">
              Esta acción registrará como <strong>Falta</strong> a todos los alumnos del turno que no tengan asistencia registrada hoy. Solo se puede ejecutar después de que el turno haya finalizado.
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Turno <span className="text-danger">*</span></span>
              <select
                value={turno}
                onChange={(e) => { setTurno(e.target.value as 'manana' | 'tarde' | ''); setError('') }}
                required
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface"
              >
                <option value="">Selecciona un turno…</option>
                <option value="manana">Mañana</option>
                <option value="tarde">Tarde</option>
              </select>
            </label>

            {configSeleccionado && (
              <div className="flex items-center gap-1.5 text-[12px] text-text-mute px-1">
                <Clock size={13} />
                <span>
                  Entrada: <strong>{isoToHHMM(configSeleccionado.horaEntrada)}</strong>
                  {' · '}Salida: <strong>{isoToHHMM(configSeleccionado.horaFin)}</strong>
                  {' · '}Puntualidad hasta: <strong>{isoToHHMM(configSeleccionado.horaLimitePuntual)}</strong>
                </span>
              </div>
            )}

            {error && <p className="text-[12px] text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
              <Btn type="submit" className="flex-1 bg-warning" disabled={mut.isPending || !turno}>
                {mut.isPending ? 'Procesando…' : 'Confirmar y cerrar turno'}
              </Btn>
            </div>
          </form>
        )}
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

async function exportarAsistencia(
  registros: AsistenciaRecord[],
  fecha: string,
  presentes: number,
  tardanzas: number,
  ausentes: number,
) {
  const [{ pdf }, { AsistenciaListaPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/reportes/asistencia-lista-pdf'),
  ])

  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const logoUrl       = `${window.location.origin}/logo.png`
  const logoUnasamUrl = `${window.location.origin}/logo-unasam.png`

  const kpis = [
    { label: 'Presentes',  value: presentes,       color: '#166534' },
    { label: 'Tardanzas',  value: tardanzas,       color: '#92400e' },
    { label: 'Ausentes',   value: ausentes,        color: '#991b1b' },
    { label: 'Total',      value: registros.length, color: '#1e3a5f' },
  ]

  const element = AsistenciaListaPDF({
    titulo:    'Registro de Asistencia',
    subtitulo: fechaLabel,
    records:   registros as any,
    modo:      'admin',
    kpis,
    logoUrl,
    logoUnasamUrl,
  })

  const blob = await pdf(element).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `asistencia-${fecha}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AsistenciaPage() {
  const { user } = useAuth()
  const isVigilante = user?.rol === 'vigilante'
  const isDocente   = user?.rol === 'docente'
  const soloLectura = isVigilante || isDocente

  // Para docente: fijar filtros a su propio registro
  const myDocenteId = isDocente ? user?.docente?.id : undefined

  const [fecha,        setFecha]        = useState(todayStr())
  const [aulaFilter,   setAulaFilter]   = useState('')
  const [tipoFilter,   setTipoFilter]   = useState<'alumno' | 'docente' | ''>(isDocente ? 'docente' : '')
  const [showManual,     setShowManual]     = useState(false)
  const [showCerrar,     setShowCerrar]     = useState(false)
  const [correctTarget,  setCorrectTarget]  = useState<AsistenciaRecord | null>(null)
  const [justificarTarget, setJustificarTarget] = useState<AsistenciaRecord | null>(null)
  const deleteMut = useDeleteAsistencia()

  const { data: aulas = [] }    = useAulas()
  const { data: stats }         = useResumenAsistencia()
  const { data: page, isLoading } = useAsistencia({
    fecha,
    tipo:       isDocente ? 'docente' : (tipoFilter || undefined),
    aula_id:    isDocente ? undefined : (aulaFilter || undefined),
    docente_id: isDocente ? myDocenteId : undefined,
    limit:      100,
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
      {showManual       && <ManualModal onClose={() => setShowManual(false)} />}
      {showCerrar       && <CerrarTurnoModal onClose={() => setShowCerrar(false)} />}
      {correctTarget    && <CorrectModal registro={correctTarget} onClose={() => setCorrectTarget(null)} />}
      {justificarTarget && <JustificarModal registro={justificarTarget} onClose={() => setJustificarTarget(null)} />}

      <PageHeader
        title={isDocente ? 'Mi asistencia' : 'Asistencia'}
        crumbs={[{ label: isDocente ? 'Mi asistencia' : 'Asistencia' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm"
              onClick={() => exportarAsistencia(registros, fecha, presentes, tardanzas, ausentes)}>
              Exportar PDF
            </Btn>
            {!soloLectura && (
              <>
                <Btn variant="secondary" icon={<Edit size={14} />} size="sm"
                  onClick={() => setShowManual(true)}>
                  Registro manual
                </Btn>
                <Btn variant="secondary" icon={<Lock size={14} />} size="sm"
                  className="text-warning border-warning/40 hover:bg-warning-l"
                  onClick={() => setShowCerrar(true)}>
                  Cerrar turno
                </Btn>
              </>
            )}
            <Btn icon={<ScanLine size={14} />} size="sm"
              onClick={() => window.open('/vigilante', '_blank')}>
              Registro de asistencia
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
                {/* Filtro por aula — oculto para docente */}
                {!isDocente && (
                  <select value={aulaFilter} onChange={e => setAulaFilter(e.target.value)}
                    className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface">
                    <option value="">Todas las aulas</option>
                    {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                )}
                {/* Filtro por tipo — oculto para docente (siempre ven solo 'docente') */}
                {!isDocente && (
                  <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value as any)}
                    className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface">
                    <option value="">Todos</option>
                    <option value="alumno">Alumnos</option>
                    <option value="docente">Docentes</option>
                  </select>
                )}
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
                      {!soloLectura && (
                        <><br />
                        <button onClick={() => setShowManual(true)} className="mt-2 text-primary text-[12px] hover:underline">
                          + Agregar registro manual
                        </button></>
                      )}
                    </td>
                  </tr>
                ) : (
                  registros.map(r => {
                    const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
                    const nombre  = persona
                      ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}`
                      : '—'
                    const aulaNombre = r.tipoPersona === 'alumno' ? (r.alumno?.aula?.nombre ?? '—') : '—'
                    const estado = r.esAusente
                      ? 'falta'
                      : r.esTardanza ? 'tardanza' : 'puntual'
                    return (
                      <tr key={r.id}
                        className={`border-t border-border-s hover:bg-surface-2/40 ${r.esAusente ? 'opacity-70' : ''}`}>
                        <td className="px-3.5 py-2.5 font-mono text-[12.5px]">{r.esAusente ? '—' : formatHora(r.horaIngreso)}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={nombre} size={28} />
                            <div>
                              <div className="font-medium leading-tight">{nombre}</div>
                              {r.esAusente && r.justificacionRazon && (
                                <div className="text-[10px] text-success truncate max-w-[180px]" title={r.justificacionRazon}>
                                  ✓ {r.justificacionRazon}
                                </div>
                              )}
                              {r.esManual && !r.esAusente && (
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
                          {estado === 'falta' ? (
                            <Pill tone="danger">
                              <Dot tone="danger" size={6} />
                              {r.justificacionRazon ? 'Justificada' : 'Falta'}
                            </Pill>
                          ) : (
                            <Pill tone={estado === 'tardanza' ? 'warning' : 'success'}>
                              <Dot tone={estado === 'tardanza' ? 'warning' : 'success'} size={6} />
                              {estado === 'tardanza' ? 'Tardanza' : 'Puntual'}
                            </Pill>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {!soloLectura && (
                            <RowMenu
                              registro={r}
                              onCorregir={setCorrectTarget}
                              onEliminar={handleEliminar}
                              onJustificar={setJustificarTarget}
                            />
                          )}
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
                {!soloLectura && (
                  <Btn variant="secondary" size="sm" icon={<Plus size={13} />}
                    onClick={() => setShowManual(true)} className="w-full justify-start">
                    Registro manual de asistencia
                  </Btn>
                )}
                <Btn variant="secondary" size="sm" icon={<Download size={13} />}
                  onClick={() => exportarAsistencia(registros, fecha)} className="w-full justify-start">
                  Exportar lista del día
                </Btn>
                {!soloLectura && (
                  <Btn variant="secondary" size="sm" icon={<Lock size={13} />}
                    onClick={() => setShowCerrar(true)} className="w-full justify-start text-warning">
                    Cerrar asistencia del turno
                  </Btn>
                )}
                <Btn variant="secondary" size="sm" icon={<ScanLine size={13} />}
                  onClick={() => window.open('/vigilante', '_blank')} className="w-full justify-start">
                  Abrir registro de asistencia
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
