'use client'

import { useState } from 'react'
import type { AsistenciaRecord } from '@/hooks/use-asistencia'
import { useJustificarAusencia } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Btn } from '@/components/ui/btn'
import { X, FileText } from '@/components/icons'

/**
 * Modal de justificación de una inasistencia. Compartido entre la página de
 * Asistencia y el panel de Inasistencias. Exige razón y N.° de expediente.
 */
export function JustificarModal({ registro, onClose }: { registro: AsistenciaRecord; onClose: () => void }) {
  const mut = useJustificarAusencia()
  const persona = registro.alumno
  const nombre  = persona ? `${persona.nombre} ${persona.apellidos}` : '—'

  const [razon,  setRazon]  = useState(registro.justificacionRazon ?? '')
  const [docNum, setDocNum] = useState(registro.justificacionDoc ?? '')
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!razon.trim()) { setError('La razón es obligatoria'); return }
    if (!docNum.trim()) { setError('El N.° de expediente / documento es obligatorio'); return }
    try {
      await mut.mutateAsync({ id: registro.id, razon: razon.trim(), doc_num: docNum.trim() })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar'))
    }
  }

  const justificadoNombre = registro.justificadoPor
    ? `${registro.justificadoPor.nombre ?? ''} ${registro.justificadoPor.apellidos ?? ''}`.trim() || registro.justificadoPor.rol
    : null

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
            <span className="text-[12px] font-medium text-text-mute">N.° de expediente / documento aprobado *</span>
            <input type="text" value={docNum} onChange={e => setDocNum(e.target.value)} required
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface"
              placeholder="Ej: Exp. 12345 / Certificado médico N.° 678" />
          </label>

          {justificadoNombre && (
            <p className="text-[11px] text-text-mute">
              Última justificación por <span className="font-medium text-text">{justificadoNombre}</span>
              {registro.justificadoEn ? ` · ${new Date(registro.justificadoEn).toLocaleString('es-PE')}` : ''}
            </p>
          )}

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
