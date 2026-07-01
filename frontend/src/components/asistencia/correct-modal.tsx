'use client'

import { useState } from 'react'
import type { AsistenciaRecord } from '@/hooks/use-asistencia'
import { useCorrectAsistencia } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Btn } from '@/components/ui/btn'
import { X, AlertTriangle } from '@/components/icons'

function formatHora(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Modal de corrección de un registro de asistencia (hora / tardanza /
 * observación). Compartido entre Asistencia y Registros. Solo debe abrirse
 * para admin/director; el backend además restringe el endpoint.
 */
export function CorrectModal({ registro, onClose }: { registro: AsistenciaRecord; onClose: () => void }) {
  const mut = useCorrectAsistencia()
  const persona = registro.tipoPersona === 'alumno' ? registro.alumno : registro.docente
  const nombre  = persona ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}` : '—'

  const [horaLlegada, setHoraLlegada] = useState(formatHora(registro.horaIngreso))
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

        {/* Advertencia: corregir modifica un registro oficial y queda auditado */}
        <div className="flex items-start gap-2 p-2.5 rounded-2 bg-warning-light/40 border border-warning-light text-warning">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-snug m-0">
            Estás modificando un registro oficial de asistencia. El cambio queda
            registrado con tu usuario. Hazlo solo con justificación válida.
          </p>
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
