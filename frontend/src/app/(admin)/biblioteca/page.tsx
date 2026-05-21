'use client'

import { useState } from 'react'
import { useBiblioteca, useBibliotecaStats, useDeleteRecurso, type TipoRecurso } from '@/hooks/use-biblioteca'
import { Pill } from '@/components/ui/pill'
import { Btn } from '@/components/ui/btn'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Search, Upload, FileText, Play, Link as LinkIcon, Layers } from '@/components/icons'

const TIPO_LABELS: Record<TipoRecurso, string> = { pdf: 'PDF', video: 'Video', enlace: 'Enlace', iframe: 'iFrame' }
const TIPO_TONES: Record<TipoRecurso, string> = { pdf: 'danger', video: 'primary', enlace: 'info', iframe: 'neutral' }

function TipoIcon({ tipo }: { tipo: TipoRecurso }) {
  if (tipo === 'pdf') return <FileText size={32} className="text-danger" style={{ opacity: 0.4 }} />
  if (tipo === 'video') return <Play size={32} className="text-primary" style={{ opacity: 0.4 }} />
  if (tipo === 'enlace' || tipo === 'iframe') return <LinkIcon size={32} className="text-info" style={{ opacity: 0.4 }} />
  return null
}

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 7) return `${d} días`
  return `${Math.floor(d / 7)} sem`
}

export default function BibliotecaPage() {
  const [q, setQ] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoRecurso | ''>('')
  const [page, setPage] = useState(1)

  const { data: result, isLoading } = useBiblioteca({
    q: q || undefined,
    tipo: tipoFilter || undefined,
    page,
    limit: 20,
  })
  const { data: stats } = useBibliotecaStats()
  const deleteMut = useDeleteRecurso()

  const recursos = result?.data ?? []
  const total = result?.total ?? 0

  return (
    <>
      <PageHeader
        title="Biblioteca digital"
        crumbs={[{ label: 'Biblioteca' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Plus size={14} />} size="sm">
              Nueva carpeta
            </Btn>
            <Btn icon={<Upload size={14} />} size="sm">
              Subir recurso
            </Btn>
          </>
        }
      />

      <div className="p-7 grid gap-4" style={{ gridTemplateColumns: '200px 1fr' }}>
        {/* Sidebar */}
        <div>
          <Card>
            <div className="px-3 py-2.5">
              <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] px-2 pb-2">Tipos</div>
              {[
                { key: '', label: 'Todos', count: (stats?.total_pdf ?? 0) + (stats?.total_video ?? 0) + (stats?.total_enlace ?? 0) + (stats?.total_iframe ?? 0) },
                { key: 'pdf', label: 'PDF', count: stats?.total_pdf ?? 0, icon: <FileText size={14} /> },
                { key: 'video', label: 'Videos', count: stats?.total_video ?? 0, icon: <Play size={14} /> },
                { key: 'enlace', label: 'Enlaces', count: stats?.total_enlace ?? 0, icon: <LinkIcon size={14} /> },
                { key: 'iframe', label: 'iFrames', count: stats?.total_iframe ?? 0, icon: <Layers size={14} /> },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setTipoFilter(f.key as any); setPage(1) }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-1 text-[13px] transition-colors"
                  style={{
                    background: tipoFilter === f.key ? 'var(--color-primary-l)' : 'transparent',
                    color: tipoFilter === f.key ? 'var(--color-primary)' : 'var(--color-text)',
                    fontWeight: tipoFilter === f.key ? 600 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {f.icon && <span className="text-text-soft">{f.icon}</span>}
                    {f.label}
                  </span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: tipoFilter === f.key ? 'var(--color-primary)' : 'var(--color-text-mute)' }}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3.5">
          {/* Filters */}
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
            <div className="text-center py-10 text-text-mute text-[13px]">
              No hay recursos{q ? ' que coincidan' : ''}
            </div>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {recursos.map((r) => (
                <div
                  key={r.id}
                  className="bg-surface border border-border rounded-3 shadow-1 overflow-hidden cursor-pointer hover:shadow-2 transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="h-[110px] bg-surface-2 flex items-center justify-center relative">
                    {r.tipo === 'pdf' && (
                      <div className="font-serif text-[40px] font-semibold text-danger opacity-25">PDF</div>
                    )}
                    {r.tipo === 'video' && (
                      <div className="w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center pl-0.5">
                        <Play size={18} />
                      </div>
                    )}
                    {(r.tipo === 'enlace' || r.tipo === 'iframe') && (
                      <LinkIcon size={36} className="text-info opacity-70" />
                    )}
                    <div className="absolute top-2 left-2">
                      <Pill
                        tone={TIPO_TONES[r.tipo] as any}
                        style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
                      >
                        {TIPO_LABELS[r.tipo]}
                      </Pill>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-3">
                    <div className="text-[12.5px] font-semibold leading-tight mb-1 text-text line-clamp-2">
                      {r.titulo}
                    </div>
                    {r.descripcion && (
                      <div className="text-[11px] text-text-mute font-mono line-clamp-1">{r.descripcion}</div>
                    )}
                    <div className="mt-2 pt-2 border-t border-border-s flex items-center gap-1.5">
                      {r.curso && (
                        <Pill tone="neutral" style={{ fontSize: 10 }}>{r.curso.nombre}</Pill>
                      )}
                      <span className="flex-1" />
                      <span className="text-[10.5px] text-text-soft">{timeAgo(r.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-[10.5px] text-text-soft font-mono">
                      {r.descargas} descarga{r.descargas !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {result && result.totalPages > 1 && (
            <div className="flex justify-center gap-1.5 pt-2">
              <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Btn>
              <span className="px-3 py-1 text-[12px] text-text-mute">
                {page} / {result.totalPages}
              </span>
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
