'use client'

import { useRef, useState } from 'react'
import { useCreateRecurso, type TipoRecurso } from '@/hooks/use-biblioteca'
import { useCursos } from '@/hooks/use-cursos'
import { Btn } from '@/components/ui/btn'
import { X, Upload, FileText, Play, Link as LinkIcon, Layers } from '@/components/icons'

const TIPOS: { value: TipoRecurso; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'pdf',    label: 'PDF',     icon: <FileText size={18} />, desc: 'Sube un archivo PDF (máx. 50 MB)' },
  { value: 'video',  label: 'Video',   icon: <Play size={18} />,     desc: 'Enlace de YouTube, Vimeo, etc.' },
  { value: 'enlace', label: 'Enlace',  icon: <LinkIcon size={18} />, desc: 'Cualquier URL web' },
  { value: 'iframe', label: 'iFrame',  icon: <Layers size={18} />,  desc: 'URL para incrustar en iframe' },
]

interface Props { onClose: () => void }

export function CreateRecursoModal({ onClose }: Props) {
  const mut = useCreateRecurso()
  const { data: cursosList = [] } = useCursos()

  const [tipo,        setTipo]        = useState<TipoRecurso>('pdf')
  const [titulo,      setTitulo]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [url,         setUrl]         = useState('')
  const [nivel,       setNivel]       = useState('')
  const [cursoId,     setCursoId]     = useState('')
  const [file,        setFile]        = useState<File | null>(null)
  const [drag,        setDrag]        = useState(false)
  const [error,       setError]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (f.type !== 'application/pdf') { setError('Solo se permiten archivos PDF'); return }
    if (f.size > 50 * 1024 * 1024)   { setError('El archivo supera los 50 MB'); return }
    setFile(f)
    setError('')
    if (!titulo) setTitulo(f.name.replace(/\.pdf$/i, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    if (tipo === 'pdf' && !file && !url) { setError('Sube un PDF o ingresa una URL'); return }
    if (tipo !== 'pdf' && !url.trim())   { setError('La URL es obligatoria para este tipo'); return }

    try {
      await mut.mutateAsync({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo,
        url: url.trim() || undefined,
        nivel: nivel.trim() || undefined,
        curso_id: cursoId || undefined,
        file: file ?? undefined,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Subir recurso</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text"><X size={18} /></button>
        </div>

        {/* Selector de tipo */}
        <div className="grid grid-cols-4 gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setTipo(t.value); setFile(null); setUrl(''); setError('') }}
              className="flex flex-col items-center gap-1 p-2.5 rounded-2 border text-[12px] font-medium transition-colors"
              style={{
                borderColor: tipo === t.value ? 'var(--color-primary)' : 'var(--color-border)',
                background:  tipo === t.value ? 'var(--color-primary-l)' : 'var(--color-surface)',
                color:       tipo === t.value ? 'var(--color-primary)' : 'var(--color-text-mute)',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-text-mute -mt-2">
          {TIPOS.find(t => t.value === tipo)?.desc}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* PDF upload o URL */}
          {tipo === 'pdf' ? (
            <div className="flex flex-col gap-2">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-2 p-6 text-center cursor-pointer transition-colors"
                style={{
                  borderColor:  drag ? 'var(--color-primary)' : 'var(--color-border)',
                  background:   drag ? 'var(--color-primary-l)' : 'var(--color-surface-2)',
                }}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-success">
                    <FileText size={18} /> {file.name}
                    <span className="text-text-mute font-normal">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-text-mute">
                    <Upload size={22} />
                    <span className="text-[12.5px]">Arrastra un PDF aquí o haz clic</span>
                    <span className="text-[11px]">Máximo 50 MB</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

              {/* URL opcional para PDF */}
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">O pega una URL de PDF (opcional)</span>
                <input value={url} onChange={e => setUrl(e.target.value)} type="url"
                  placeholder="https://ejemplo.com/archivo.pdf"
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
              </label>
            </div>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">URL <span className="text-danger">*</span></span>
              <input value={url} onChange={e => setUrl(e.target.value)} type="url" required
                placeholder={
                  tipo === 'video'  ? 'https://youtube.com/watch?v=...' :
                  tipo === 'iframe' ? 'https://app.ejemplo.com/embed/...' :
                                     'https://ejemplo.com/recurso'
                }
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
            </label>
          )}

          {/* Título */}
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Título <span className="text-danger">*</span></span>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} required minLength={2}
              placeholder="Ej: Álgebra — Polinomios y factorización"
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
          </label>

          {/* Descripción */}
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Descripción (opcional)</span>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
              placeholder="Breve descripción del contenido…"
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none" />
          </label>

          {/* Curso + Nivel */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Curso (opcional)</span>
              <select value={cursoId} onChange={e => setCursoId(e.target.value)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface">
                <option value="">Sin curso</option>
                {cursosList.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">Nivel (opcional)</span>
              <input value={nivel} onChange={e => setNivel(e.target.value)}
                placeholder="Ej: Básico, Avanzado"
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface" />
            </label>
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" className="flex-1" icon={<Upload size={14} />} disabled={mut.isPending}>
              {mut.isPending ? 'Subiendo…' : 'Guardar recurso'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}
