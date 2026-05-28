'use client'

/**
 * FotoUpload — avatar circular clicable que permite subir/reemplazar
 * la foto de perfil de un alumno o docente.
 *
 * Uso:
 *   <FotoUpload
 *     uploadUrl="/alumnos/{id}/foto"       ← endpoint multipart
 *     currentUrl={alumno.foto_url}          ← null si no tiene foto
 *     name={`${alumno.nombres} ${alumno.apellidos}`}
 *     onSuccess={(url) => { ... }}          ← opcional: invalidar cache, etc.
 *   />
 */

import { useRef, useState } from 'react'
import api from '@/lib/api'

/* ─── Icono cámara (inline SVG, sin dependencia extra) ─────── */
function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

/* ─── Icono trash ──────────────────────────────────────────── */
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

/* ─── Genera iniciales de un nombre ──────────────────────────── */
function iniciales(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0] ?? '').join('').toUpperCase()
}

/* ─── Tipos ──────────────────────────────────────────────────── */
export interface FotoUploadProps {
  /** Endpoint multipart: ej. "/alumnos/{id}/foto" */
  uploadUrl: string
  /** Endpoint DELETE: ej. "/alumnos/{id}/foto" (misma ruta, método DELETE) */
  deleteUrl?: string
  /** URL actual de la foto (null = sin foto) */
  currentUrl?: string | null
  /** Nombre del alumno/docente — se usa para generar iniciales */
  name: string
  /** Llamado tras subir con éxito (devuelve la URL nueva) */
  onSuccess?: (url: string) => void
  /** Llamado tras eliminar con éxito */
  onDeleted?: () => void
  /** Diámetro del avatar en px (default 80) */
  size?: number
}

/* ─── Componente ─────────────────────────────────────────────── */
export function FotoUpload({
  uploadUrl,
  deleteUrl,
  currentUrl,
  name,
  onSuccess,
  onDeleted,
  size = 80,
}: FotoUploadProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  const displayUrl = preview ?? currentUrl ?? null
  const hasPhoto   = Boolean(displayUrl)
  const initText   = iniciales(name || '?')

  /* ── Subir foto ─────────────────────────────────────────── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validaciones cliente
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5 MB')
      return
    }

    // Preview local inmediato
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setLoading(true)

    try {
      const form = new FormData()
      form.append('foto', file)
      const { data } = await api.post(uploadUrl, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess?.(data.foto_url)
    } catch {
      setError('No se pudo subir la foto. Intenta de nuevo.')
      setPreview(null)
      URL.revokeObjectURL(objectUrl)
    } finally {
      setLoading(false)
      // Resetear input para que el mismo archivo pueda re-seleccionarse
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  /* ── Eliminar foto ──────────────────────────────────────── */
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!deleteUrl) return
    if (!window.confirm('¿Eliminar la foto de perfil?')) return

    setDeleting(true)
    setError(null)
    try {
      await api.delete(deleteUrl)
      setPreview(null)
      onDeleted?.()
    } catch {
      setError('No se pudo eliminar la foto.')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────── */
  const radius = size / 2
  const fontSize = Math.round(size * 0.3)

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Avatar clicable */}
      <div className="relative" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => !loading && !deleting && inputRef.current?.click()}
          disabled={loading || deleting}
          title={loading ? 'Subiendo…' : 'Haz clic para cambiar la foto'}
          className="group w-full h-full rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{ borderRadius: radius }}
        >
          {/* Imagen o iniciales */}
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full bg-primary/15 flex items-center justify-center text-primary font-bold"
              style={{ fontSize }}
            >
              {initText}
            </div>
          )}

          {/* Overlay cámara (hover) */}
          {!loading && !deleting && (
            <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <CameraIcon />
            </div>
          )}

          {/* Spinner de carga */}
          {(loading || deleting) && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center pointer-events-none">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Botón eliminar (solo si hay foto y hay deleteUrl) */}
        {hasPhoto && deleteUrl && !loading && !deleting && (
          <button
            type="button"
            onClick={handleDelete}
            title="Eliminar foto"
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center shadow hover:bg-danger/80 transition-colors focus:outline-none focus:ring-1 focus:ring-danger"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Texto de ayuda */}
      <p className="text-[11px] text-text-mute text-center leading-tight max-w-[100px]">
        {loading  ? 'Subiendo…' :
         deleting ? 'Eliminando…' :
         hasPhoto ? 'Clic para cambiar' :
                    'Clic para añadir foto'}
      </p>

      {/* Error */}
      {error && (
        <p className="text-[11px] text-danger text-center max-w-[120px] leading-tight">
          {error}
        </p>
      )}
    </div>
  )
}
