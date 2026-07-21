'use client'

import { useState } from 'react'
import {
  useBiblioteca, useBibliotecaStats, useDeleteRecurso,
  type TipoRecurso, type RecursoBiblioteca,
} from '@/hooks/use-biblioteca'
import { useAuth } from '@/contexts/auth-context'
import { useCicloCtx } from '@/contexts/ciclo-context'
import { CreateRecursoModal } from '@/components/biblioteca/create-recurso-modal'
import { EditRecursoModal }   from '@/components/biblioteca/edit-recurso-modal'
import { Pill }       from '@/components/ui/pill'
import { Btn }        from '@/components/ui/btn'
import { Card }       from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { Upload, Search, FileText, Play, Link as LinkIcon, Layers, Edit, Trash } from '@/components/icons'

const TIPO_LABELS: Record<TipoRecurso, string> = { pdf: 'PDF', video: 'Video', enlace: 'Enlace', iframe: 'iFrame' }
const TIPO_TONES:  Record<TipoRecurso, string> = { pdf: 'danger', video: 'primary', enlace: 'info', iframe: 'neutral' }

function TipoIcon({ tipo }: { tipo: TipoRecurso }) {
  if (tipo === 'pdf')   return <FileText size={32} className="text-danger"  style={{ opacity: 0.3 }} />
  if (tipo === 'video') return <Play     size={32} className="text-primary" style={{ opacity: 0.3 }} />
  return <LinkIcon size={32} className="text-info" style={{ opacity: 0.55 }} />
}

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 7)   return `${d} días`
  return `${Math.floor(d / 7)} sem`
}

export default function BibliotecaPage() {
  const { user } = useAuth()
  const rol = user?.rol ?? ''
  // Director: solo visualización (sin crear/editar/eliminar). Conserva el historial (lectura).
  const puedeCrear   = ['admin', 'docente'].includes(rol)
  const puedeEliminar = rol === 'admin'
  const puedeHistorial = ['admin', 'director', 'docente'].includes(rol)

  const [q,           setQ]           = useState('')
  const [tipoFilter,  setTipoFilter]  = useState<TipoRecurso | ''>('')
  const [page,        setPage]        = useState(1)
  const [showCreate,  setShowCreate]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<RecursoBiblioteca | null>(null)

  const { selectedCiclo } = useCicloCtx()
  const { data: result, isLoading } = useBiblioteca({
    q:        q || undefined,
    tipo:     tipoFilter || undefined,
    ciclo_id: selectedCiclo?.id,
    page,
    limit:    20,
  })
  const { data: stats } = useBibliotecaStats()
  const deleteMut = useDeleteRecurso()

  const recursos = result?.data ?? []
  const total    = result?.total ?? 0

  async function handleDelete(r: RecursoBiblioteca) {
    if (!confirm(`¿Eliminar "${r.titulo}"? Esta acción no se puede deshacer.`)) return
    await deleteMut.mutateAsync(r.id)
  }

  return (
    <>
      {showCreate  && <CreateRecursoModal onClose={() => setShowCreate(false)} />}
      {editTarget  && (
        <EditRecursoModal
          recurso={editTarget}
          canViewHistory={puedeHistorial}
          onClose={() => setEditTarget(null)}
        />
      )}

      <PageHeader
        title="Biblioteca digital"
        crumbs={[{ label: 'Biblioteca' }]}
        action={puedeCrear ? (
          <Btn icon={<Upload size={14} />} size="sm" onClick={() => setShowCreate(true)}>
            Subir recurso
          </Btn>
        ) : undefined}
      />

      <div className="p-4 md:p-7 grid gap-4 grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)]">

        {/* Sidebar filtros */}
        <div>
          <Card>
            <div className="px-3 py-2.5">
              <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] px-2 pb-2">Tipos</div>
              {[
                { key: '',       label: 'Todos',   count: (stats?.total_pdf ?? 0) + (stats?.total_video ?? 0) + (stats?.total_enlace ?? 0) + (stats?.total_iframe ?? 0) },
                { key: 'pdf',    label: 'PDF',     count: stats?.total_pdf    ?? 0, icon: <FileText size={14} /> },
                { key: 'video',  label: 'Videos',  count: stats?.total_video  ?? 0, icon: <Play     size={14} /> },
                { key: 'enlace', label: 'Enlaces', count: stats?.total_enlace ?? 0, icon: <LinkIcon size={14} /> },
                { key: 'iframe', label: 'iFrames', count: stats?.total_iframe ?? 0, icon: <Layers   size={14} /> },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setTipoFilter(f.key as any); setPage(1) }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-1 text-[13px] transition-colors"
                  style={{
                    background: tipoFilter === f.key ? 'var(--color-primary-l)' : 'transparent',
                    color:      tipoFilter === f.key ? 'var(--color-primary)'   : 'var(--color-text)',
                    fontWeight: tipoFilter === f.key ? 600 : 500,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {f.icon && <span className="text-text-soft">{f.icon}</span>}
                    {f.label}
                  </span>
                  <span className="font-mono text-[11px]"
                    style={{ color: tipoFilter === f.key ? 'var(--color-primary)' : 'var(--color-text-mute)' }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-3.5">
          {/* Buscador */}
          <div className="flex gap-2.5 items-center">
            <div className="flex-1 max-w-[380px] relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-soft flex">
                <Search size={14} />
              </span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="Buscar recursos…"
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-[12px] text-text-mute flex-1 text-right">{total} recursos</span>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="text-center py-10 text-text-mute text-[13px]">Cargando…</div>
          ) : recursos.length === 0 ? (
            <div className="text-center py-16 text-text-mute text-[13px] flex flex-col items-center gap-3">
              <Layers size={36} style={{ opacity: 0.2 }} />
              No hay recursos{q ? ' que coincidan con la búsqueda' : ''}
              {puedeCrear && (
                <Btn size="sm" icon={<Upload size={13} />} onClick={() => setShowCreate(true)}>
                  Subir el primero
                </Btn>
              )}
            </div>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {recursos.map((r) => (
                <div
                  key={r.id}
                  className="bg-surface border border-border rounded-3 shadow-1 overflow-hidden hover:shadow-2 transition-shadow group relative"
                >
                  {/* Thumbnail */}
                  <div className="h-[110px] bg-surface-2 flex items-center justify-center relative">
                    <TipoIcon tipo={r.tipo} />
                    {r.tipo === 'pdf' && (
                      <div className="font-serif text-[38px] font-semibold text-danger absolute opacity-20">PDF</div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Pill tone={TIPO_TONES[r.tipo] as any}
                        style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                        {TIPO_LABELS[r.tipo]}
                      </Pill>
                    </div>
                    {/* Acciones hover */}
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                      {puedeCrear && (
                        <button
                          onClick={() => setEditTarget(r)}
                          className="w-6 h-6 rounded-1 bg-surface/90 flex items-center justify-center shadow-1 hover:bg-primary hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit size={11} />
                        </button>
                      )}
                      {puedeEliminar && (
                        <button
                          onClick={() => handleDelete(r)}
                          className="w-6 h-6 rounded-1 bg-surface/90 flex items-center justify-center shadow-1 hover:bg-danger hover:text-white transition-colors"
                          title="Eliminar"
                        >
                          <Trash size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3">
                    <div className="text-[12.5px] font-semibold leading-tight mb-1 text-text line-clamp-2">
                      {r.titulo}
                    </div>
                    {r.descripcion && (
                      <div className="text-[11px] text-text-mute line-clamp-1">{r.descripcion}</div>
                    )}
                    <div className="mt-2 pt-2 border-t border-border-s flex items-center gap-1.5 flex-wrap">
                      {r.curso && <Pill tone="neutral" style={{ fontSize: 10 }}>{r.curso.nombre}</Pill>}
                      {r.nivel && <Pill tone="warning" style={{ fontSize: 10 }}>{r.nivel}</Pill>}
                      <Pill tone="primary" style={{ fontSize: 10 }}>
                        {r.area ? ({ ciencias: 'Ciencias', letras: 'Letras', medicas: 'Médicas' } as const)[r.area] : 'Todas las áreas'}
                      </Pill>
                      <span className="flex-1" />
                      <span className="text-[10.5px] text-text-soft">{timeAgo(r.createdAt)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10.5px] text-text-soft font-mono">
                        {r.descargas} desc.
                      </span>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Abrir →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {result && result.totalPages > 1 && (
            <div className="flex justify-center gap-1.5 pt-2">
              <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Btn>
              <span className="px-3 py-1 text-[12px] text-text-mute">{page} / {result.totalPages}</span>
              <Btn variant="secondary" size="sm" disabled={page >= result.totalPages} onClick={() => setPage(p => p + 1)}>
                Siguiente
              </Btn>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
