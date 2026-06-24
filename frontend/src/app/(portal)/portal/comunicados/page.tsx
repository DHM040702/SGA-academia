'use client'

import { useState } from 'react'
import { useComunicados, type Comunicado } from '@/hooks/use-comunicados'
import { useActiveCiclo } from '@/hooks/use-ciclos'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Btn } from '@/components/ui/btn'
import { Megaphone, Bell, Check } from '@/components/icons'

/* ─── helpers ─────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

type TabKey = 'todos' | 'nuevos'

/* ─── page ─────────────────────────────────────────────────────── */
export default function PortalComunicadosPage() {
  const [tab, setTab] = useState<TabKey>('todos')
  const [selected, setSelected] = useState<Comunicado | null>(null)
  const cicloActivo = useActiveCiclo()

  const { data: comunicadosRes, isLoading } = useComunicados({ limit: 50 })
  const all: Comunicado[] = comunicadosRes?.data ?? []

  // Simulate "read" state in memory (in a real app this would be server-side)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const unreadCount = all.filter((c) => !readIds.has(c.id)).length

  function openComunicado(c: Comunicado) {
    setSelected(c)
    setReadIds((prev) => new Set([...prev, c.id]))
  }

  const list = tab === 'nuevos' ? all.filter((c) => !readIds.has(c.id)) : all

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'nuevos', label: 'Sin leer' },
  ]

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-7 pb-8 md:h-full flex flex-col">
      {/* Hero */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-5">
        <div>
          <div className="text-[11.5px] text-text-mute mb-1">{cicloActivo ? `Ciclo ${cicloActivo.nombre}` : ''}</div>
          <h1 className="m-0 font-serif font-semibold text-[24px] md:text-[30px] tracking-[-0.02em] leading-[1.1]">
            Avisos y comunicados
          </h1>
        </div>
        {unreadCount > 0 && (
          <Pill tone="danger">
            <Dot tone="danger" size={6} />
            {unreadCount} sin leer
          </Pill>
        )}
      </div>

      <div className="flex-1 grid gap-4 min-h-0 grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left: list */}
        <div className="flex flex-col min-h-0 max-md:h-[55vh] bg-surface border border-border rounded-3 shadow-1 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 py-2.5 text-[13px] border-none cursor-pointer transition-colors"
                style={{
                  background: 'transparent',
                  color: tab === key ? 'var(--color-primary)' : 'var(--color-text-mute)',
                  borderBottom: `2px solid ${tab === key ? 'var(--color-primary)' : 'transparent'}`,
                  fontWeight: tab === key ? 600 : 500,
                  marginBottom: -1,
                }}
              >
                {label}
                {key === 'nuevos' && unreadCount > 0 && (
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--color-danger)', color: '#fff' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="py-10 text-center text-text-mute text-[13px]">Cargando…</div>
            )}
            {!isLoading && list.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-text-mute gap-3">
                <Megaphone size={32} />
                <span className="text-[13px]">Sin avisos</span>
              </div>
            )}
            {list.map((c) => {
              const isRead = readIds.has(c.id)
              const isActive = selected?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => openComunicado(c)}
                  className="w-full text-left px-4 py-3.5 border-none cursor-pointer transition-colors"
                  style={{
                    background: isActive
                      ? 'var(--color-primary-light)'
                      : 'transparent',
                    borderBottom: '1px solid var(--color-border-s)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    {!isRead && (
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ background: 'var(--color-primary)' }}
                      />
                    )}
                    {isRead && <div className="mt-1.5 w-2 h-2 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-[13px] truncate flex-1"
                          style={{ fontWeight: isRead ? 500 : 700 }}
                        >
                          {c.titulo}
                        </span>
                        <span className="text-[10.5px] text-text-soft shrink-0">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-text-mute mt-0.5 line-clamp-2">
                        {c.cuerpo}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {c.canalSistema && <Pill tone="primary" className="text-[10px]">Sistema</Pill>}
                        {c.canalWhatsapp && <Pill tone="success" className="text-[10px]">WhatsApp</Pill>}
                        {c.aula && <Pill tone="neutral" className="text-[10px]">{c.aula.nombre}</Pill>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: detail */}
        <div className="bg-surface border border-border rounded-3 shadow-1 overflow-hidden flex flex-col max-md:min-h-[50vh]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-mute gap-3">
              <Bell size={40} />
              <p className="text-[13px]">Selecciona un aviso para leerlo</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-7">
              <div className="max-w-[640px]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="m-0 font-serif font-semibold text-[24px] tracking-tight leading-tight flex-1">
                    {selected.titulo}
                  </h2>
                  <Check size={18} className="text-success mt-1 shrink-0" />
                </div>
                <div className="flex items-center gap-2 mb-5 text-[12px] text-text-mute flex-wrap">
                  <span>Publicado por <strong className="text-text">{selected.publicadoPor?.email ?? '—'}</strong></span>
                  <span className="opacity-40">·</span>
                  <span>{timeAgo(selected.createdAt)}</span>
                  {selected.canalSistema && <Pill tone="primary">Sistema</Pill>}
                  {selected.canalWhatsapp && <Pill tone="success">WhatsApp</Pill>}
                  {selected.aula && <Pill tone="neutral">{selected.aula.nombre}</Pill>}
                </div>
                <div
                  className="text-[14px] leading-relaxed text-text whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {selected.cuerpo}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
