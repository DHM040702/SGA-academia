'use client'

import { useState } from 'react'
import { useBiblioteca, useBibliotecaStats, type TipoRecurso, type RecursoBiblioteca } from '@/hooks/use-biblioteca'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { Btn } from '@/components/ui/btn'
import { Search, Book, FileText, Play, Link as LinkIcon, Download, ChevL, ChevR } from '@/components/icons'

/* ─── constants ─────────────────────────────────────────────────── */
const TIPO_COLOR: Record<TipoRecurso | 'all', string> = {
  all:    'var(--color-primary)',
  pdf:    'var(--color-danger)',
  video:  'var(--color-primary)',
  enlace: 'var(--color-info)',
  iframe: 'var(--color-success)',
}

const TIPO_LABEL: Record<TipoRecurso | 'all', string> = {
  all:    'Todos',
  pdf:    'PDFs',
  video:  'Videos',
  enlace: 'Enlaces',
  iframe: 'iFrame',
}

function TipoIcon({ tipo, size = 24 }: { tipo: TipoRecurso | 'all'; size?: number }) {
  if (tipo === 'pdf') return <FileText size={size} />
  if (tipo === 'video') return <Play size={size} />
  if (tipo === 'enlace' || tipo === 'iframe') return <LinkIcon size={size} />
  return <Book size={size} />
}

function formatSize(bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const PAGE_SIZE = 12

/* ─── page ─────────────────────────────────────────────────────── */
export default function PortalBibliotecaPage() {
  const [tipoFilter, setTipoFilter] = useState<TipoRecurso | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: stats } = useBibliotecaStats()
  const { data: recursos, isLoading } = useBiblioteca({
    tipo: tipoFilter,
    q: search || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const list: RecursoBiblioteca[] = recursos?.data ?? []
  const totalPages = recursos?.totalPages ?? 1
  const totalItems = recursos?.total ?? 0

  const filterTipos: (TipoRecurso | 'all')[] = ['all', 'pdf', 'video', 'enlace', 'iframe']
  const countMap: Record<string, number> = {
    all: (stats?.total_pdf ?? 0) + (stats?.total_video ?? 0) + (stats?.total_enlace ?? 0) + (stats?.total_iframe ?? 0),
    pdf: stats?.total_pdf ?? 0,
    video: stats?.total_video ?? 0,
    enlace: stats?.total_enlace ?? 0,
    iframe: stats?.total_iframe ?? 0,
  }

  function handleFilter(t: TipoRecurso | 'all') {
    setTipoFilter(t === 'all' ? undefined : t)
    setPage(1)
  }

  return (
    <div className="px-8 pt-7 pb-8">
      {/* Hero */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] text-text-mute mb-1">Ciclo 2026-I · material de estudio</div>
          <h1 className="m-0 font-serif font-semibold text-[30px] tracking-[-0.02em] leading-[1.1]">
            Biblioteca digital
          </h1>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Left sidebar: type filters */}
        <div className="w-[200px] shrink-0">
          <Card>
            <div className="p-3">
              <div className="text-[10px] tracking-[0.1em] uppercase text-text-soft font-semibold px-2 pb-2 pt-1">
                Tipo de recurso
              </div>
              {filterTipos.map((t) => {
                const isActive = t === 'all' ? !tipoFilter : tipoFilter === t
                return (
                  <button
                    key={t}
                    onClick={() => handleFilter(t)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2 mb-0.5 text-[13px] font-medium text-left border-none cursor-pointer transition-colors"
                    style={{
                      background: isActive ? 'var(--color-primary-light)' : 'transparent',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    <span
                      className="flex shrink-0"
                      style={{ color: isActive ? 'var(--color-primary)' : TIPO_COLOR[t] }}
                    >
                      <TipoIcon tipo={t} size={15} />
                    </span>
                    <span className="flex-1">{TIPO_LABEL[t]}</span>
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: isActive ? 'var(--color-primary)' : 'var(--color-surface2)',
                        color: isActive ? '#fff' : 'var(--color-text-mute)',
                      }}
                    >
                      {countMap[t]}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-soft flex">
              <Search size={15} />
            </span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por título, curso o descripción…"
              className="w-full pl-9 pr-4 py-2 text-[13px] border border-border-s rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2 mb-4 text-[12.5px] text-text-mute">
            <span>{totalItems} recursos</span>
            {tipoFilter && (
              <>
                <span className="opacity-40">·</span>
                <Pill tone="primary">{TIPO_LABEL[tipoFilter]}</Pill>
                <button
                  onClick={() => handleFilter('all')}
                  className="text-[11px] text-text-mute hover:text-danger border-none bg-transparent cursor-pointer"
                >
                  ✕ limpiar
                </button>
              </>
            )}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="py-16 text-center text-text-mute text-[13px]">Cargando recursos…</div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center text-text-mute">
              <Book size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[13px]">No se encontraron recursos.</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {list.map((r) => (
                <ResourceCard key={r.id} recurso={r} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center mt-5">
              <Btn
                variant="secondary"
                size="sm"
                icon={<ChevL size={14} />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              />
              <span className="text-[13px] text-text-mute px-2">
                Página {page} de {totalPages}
              </span>
              <Btn
                variant="secondary"
                size="sm"
                icon={<ChevR size={14} />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── resource card ──────────────────────────────────────────────── */
function ResourceCard({ recurso: r }: { recurso: RecursoBiblioteca }) {
  const col = TIPO_COLOR[r.tipo]

  return (
    <div className="bg-surface border border-border rounded-3 overflow-hidden hover:shadow-2 transition-shadow cursor-pointer group">
      {/* Thumbnail */}
      <div
        className="h-[100px] flex items-center justify-center relative bg-surface2"
        style={{ color: col }}
      >
        <span className="opacity-20 absolute" style={{ fontSize: 52, fontFamily: 'var(--font-serif)', fontWeight: 700, textTransform: 'uppercase' }}>
          {r.tipo}
        </span>
        <span className="relative opacity-60 group-hover:opacity-100 transition-opacity">
          <TipoIcon tipo={r.tipo} size={32} />
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <div className="text-[13px] font-semibold leading-snug line-clamp-2 mb-1">{r.titulo}</div>
        {r.descripcion && (
          <div className="text-[11.5px] text-text-mute line-clamp-2 mb-2">{r.descripcion}</div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Pill tone="neutral" className="text-[10px]">{TIPO_LABEL[r.tipo]}</Pill>
          {r.curso && <Pill tone="primary" className="text-[10px]">{r.curso.nombre}</Pill>}
          {r.nivel && !r.curso && <Pill tone="neutral" className="text-[10px]">{r.nivel}</Pill>}
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[11px] text-text-mute font-mono">
            {r.descargas} descargas
          </span>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-[12px] font-medium hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={12} />
            {r.tipo === 'enlace' || r.tipo === 'iframe' ? 'Abrir' : 'Descargar'}
          </a>
        </div>
      </div>
    </div>
  )
}
