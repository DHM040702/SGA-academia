'use client'

import { useRef, useState } from 'react'
import { useUpdateRecurso, useHistorialRecurso, type RecursoBiblioteca, type TipoRecurso } from '@/hooks/use-biblioteca'
import { useCursos } from '@/hooks/use-cursos'
import { Btn } from '@/components/ui/btn'
import { X, Upload, FileText, Clock } from '@/components/icons'

interface Props {
  recurso: RecursoBiblioteca
  onClose: () => void
  canViewHistory?: boolean  // admin/director/docente
}

export function EditRecursoModal({ recurso, onClose, canViewHistory = false }: Props) {
  const mut        = useUpdateRecurso()
  const { data: cursosList = [] } = useCursos()
  const { data: historial = [] }  = useHistorialRecurso(canViewHistory ? recurso.id : '')

  const [tab,         setTab]         = useState<'editar' | 'historial'>('editar')
  const [titulo,      setTitulo]      = useState(recurso.titulo)
  const [descripcion, setDescripcion] = useState(recurso.descripcion ?? '')
  const [url,         setUrl]         = useState(recurso.tipo === 'pdf' ? '' : (recurso.url ?? ''))
  const [nivel,       setNivel]       = useState(recurso.nivel ?? '')
  const [cursoId,     setCursoId]     = useState(recurso.cursoId ?? '')
  const [area,        setArea]        = useState(recurso.area ?? '')
  const [file,        setFile]        = useState<File | null>(null)
  const [drag,        setDrag]        = useState(false)
  const [error,       setError]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const esPdf = recurso.tipo === 'pdf'

  function handleFile(f: File) {
    if (f.type !== 'application/pdf') { setError('Solo se permiten archivos PDF'); return }
    if (f.size > 50 * 1024 * 1024)   { setError('El archivo supera los 50 MB'); return }
    setFile(f)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) { setError('El título es obligatorio'); return }

    try {
      await mut.mutateAsync({
        id:          recurso.id,
        titulo:      titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        url:         esPdf ? (url.trim() || undefined) : (url.trim() || undefined),
        nivel:       nivel.trim() || undefined,
        curso_id:    cursoId || undefined,
        area:        area || null,
        file:        file ?? undefined,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar'))
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Editar recurso</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        {/* Tabs */}
        {canViewHistory && (
          <div className="flex rounded-2 border border-border overflow-hidden text-[13px]">
            {(['editar', 'historial'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 font-medium transition-colors capitalize"
                style={{
                  background: tab === t ? 'var(--color-primary)' : 'var(--color-surface)',
                  color:      tab === t ? '#fff' : 'var(--color-text-mute)',
                }}>
                {t === 'historial' ? (
                  <span className="flex items-center justify-center gap-1.5"><Clock size={13} /> Historial</span>
                ) : 'Editar'}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab: editar ── */}
        {tab === 'editar' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            {/* PDF: reemplazar archivo */}
            {esPdf && (
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-medium text-text-mute">
                  Reemplazar PDF (opcional — deja vacío para conservar el actual)
                </span>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-2 p-4 text-center cursor-pointer transition-colors"
                  style={{
                    borderColor: drag ? 'var(--color-primary)' : 'var(--color-border)',
                    background:  drag ? 'var(--color-primary-l)' : 'var(--color-surface-2)',
                  }}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-[12.5px] font-medium text-success">
                      <FileText size={16} /> {file.name}
                      <span className="text-text-mute font-normal">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-text-mute text-[12.5px]">
                      <Upload size={16} /> Arrastra un nuevo PDF o haz clic
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}

            {/* URL (para no-PDF o URL alternativa de PDF) */}
            {!esPdf && (
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">URL</span>
                <input value={url} onChange={e => setUrl(e.target.value)} type="url"
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
              </label>
            )}

            {/* Título */}
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Título <span className="text-danger">*</span></span>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} required minLength={2}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
            </label>

            {/* Descripción */}
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Descripción</span>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none" />
            </label>

            {/* Curso + Nivel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">Curso</span>
                <select value={cursoId} onChange={e => setCursoId(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface">
                  <option value="">Sin curso</option>
                  {cursosList.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">Nivel</span>
                <input value={nivel} onChange={e => setNivel(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
              </label>
            </div>

            {/* Área de envío */}
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Enviar al área</span>
              <select value={area} onChange={e => setArea(e.target.value)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface">
                <option value="">Todas las áreas</option>
                <option value="ciencias">Ciencias</option>
                <option value="letras">Letras</option>
                <option value="medicas">Médicas</option>
              </select>
            </label>

            {error && <p className="text-[12px] text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
              <Btn type="submit" className="flex-1" disabled={mut.isPending}>
                {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Btn>
            </div>
          </form>
        )}

        {/* ── Tab: historial ── */}
        {tab === 'historial' && (
          <div className="flex flex-col gap-2">
            {historial.length === 0 ? (
              <p className="text-[13px] text-text-mute text-center py-6">Sin ediciones registradas</p>
            ) : (
              historial.map((h) => (
                <div key={h.id} className="border border-border rounded-2 p-3 text-[12px] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">{h.editor_email ?? h.modificado_por_id}</span>
                    <span className="text-text-mute font-mono">{fmtDate(h.modificado_at)}</span>
                  </div>
                  <div className="text-text-mute space-y-0.5 mt-1">
                    {h.titulo_anterior      && <div><span className="text-text-soft">Título:</span> {h.titulo_anterior}</div>}
                    {h.descripcion_anterior && <div><span className="text-text-soft">Desc:</span> {h.descripcion_anterior}</div>}
                    {h.url_anterior         && (
                      <div className="truncate">
                        <span className="text-text-soft">URL:</span>{' '}
                        <a href={h.url_anterior} target="_blank" rel="noreferrer"
                          className="text-primary underline">{h.url_anterior}</a>
                      </div>
                    )}
                    {h.nivel_anterior       && <div><span className="text-text-soft">Nivel:</span> {h.nivel_anterior}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
