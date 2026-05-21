'use client'

import { useState } from 'react'
import {
  useComunicados,
  useComunicado,
  useCreateComunicado,
  useDeleteComunicado,
} from '@/hooks/use-comunicados'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Search, Edit, MoreHorizontal, Bell, Phone } from '@/components/icons'

type Tab = 'Todos' | 'Enviados' | 'Borradores'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return `hace ${Math.floor(days / 7)} sem`
}

export default function ComunicadosPage() {
  const [tab, setTab] = useState<Tab>('Todos')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const { data: page } = useComunicados({ limit: 50 })
  const { data: selected } = useComunicado(selectedId ?? '')
  const deleteMut = useDeleteComunicado()

  const all = page?.data ?? []
  const filtered = all.filter((c) => {
    if (q && !c.titulo.toLowerCase().includes(q.toLowerCase())) return false
    if (tab === 'Enviados' && !c.publicadoAt) return false
    if (tab === 'Borradores' && c.publicadoAt) return false
    return true
  })

  const display = selected ?? (selectedId ? null : filtered[0])

  return (
    <>
      <PageHeader
        title="Comunicados"
        crumbs={[{ label: 'Comunicados' }]}
        action={
          <Btn icon={<Plus size={14} />} size="sm" onClick={() => setShowNew(true)}>
            Nuevo comunicado
          </Btn>
        }
      />

      <div className="p-7 grid gap-3.5" style={{ gridTemplateColumns: '300px 1fr' }}>
        {/* Left: list */}
        <div className="flex flex-col bg-surface border border-border rounded-3 overflow-hidden shadow-1">
          <div className="p-3 border-b border-border-s">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-soft flex">
                <Search size={14} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar comunicados…"
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-1 mt-2">
              {(['Todos', 'Enviados', 'Borradores'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors"
                  style={{
                    background: tab === t ? 'var(--color-primary-l)' : 'transparent',
                    color: tab === t ? 'var(--color-primary)' : 'var(--color-text-mute)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: tab === t ? 600 : 500,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const isActive = c.id === (display?.id ?? filtered[0]?.id)
              const pct = c.pct_enviado ?? 0
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="p-3.5 cursor-pointer border-b border-border-s transition-colors"
                  style={{
                    background: isActive ? 'var(--color-primary-l)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Dot tone={c.publicadoAt ? 'success' : 'neutral'} />
                    <div className="text-[13px] font-semibold flex-1 text-text">{c.titulo}</div>
                    <span className="text-[10.5px] text-text-soft">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="text-[11.5px] text-text-mute mb-1.5 line-clamp-1">{c.cuerpo}</div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {c.canalSistema && (
                      <span className="px-1.5 py-0.5 bg-surface-3 rounded text-text-mute">Panel</span>
                    )}
                    {c.canalWhatsapp && (
                      <span className="px-1.5 py-0.5 bg-surface-3 rounded text-text-mute">WhatsApp</span>
                    )}
                    <span className="flex-1" />
                    <span className="text-text-mute font-mono">
                      {c._count?.envios ?? 0} envíos · {pct}%
                    </span>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-[13px] text-text-mute">
                Sin comunicados
              </div>
            )}
          </div>
        </div>

        {/* Right: detail */}
        {display ? (
          <Card>
            <div className="p-[18px] pb-4 border-b border-border-s flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Pill tone={display.publicadoAt ? 'success' : 'neutral'}>
                    <Dot tone={display.publicadoAt ? 'success' : 'neutral'} size={6} />
                    {display.publicadoAt ? 'Publicado' : 'Borrador'}
                  </Pill>
                  {display.publicadoAt && (
                    <span className="text-[11.5px] text-text-mute">
                      {new Date(display.publicadoAt).toLocaleString('es-PE')}
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-[22px] font-semibold tracking-tight mt-2 mb-1">
                  {display.titulo}
                </h2>
                <div className="text-[12px] text-text-mute">
                  {display.publicadoPor?.email} · {timeAgo(display.createdAt)}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Btn variant="secondary" icon={<Edit size={14} />} size="sm">Editar</Btn>
                <Btn variant="ghost" size="sm" style={{ padding: 6 }}>
                  <MoreHorizontal size={16} />
                </Btn>
              </div>
            </div>

            <div className="p-5 grid gap-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
              {/* Body */}
              <div>
                <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] mb-2">Mensaje</div>
                <div
                  className="text-[13.5px] leading-relaxed text-text"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {display.cuerpo}
                </div>

                {display.canalWhatsapp && (
                  <div className="mt-5 p-3.5 bg-surface-2 rounded-2 border border-border-s">
                    <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] mb-2">Vista previa WhatsApp</div>
                    <div
                      className="text-[13px] leading-relaxed max-w-[320px] rounded-[10px] px-3 py-2.5"
                      style={{ background: '#dcf8c6' }}
                    >
                      <strong>CEPREUNASAM</strong> — {display.cuerpo.slice(0, 120)}{display.cuerpo.length > 120 ? '…' : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-3">
                <div className="text-[11px] text-text-soft uppercase tracking-[0.05em]">Destinatarios</div>
                <div className="bg-surface-2 p-3 rounded-2 border border-border-s">
                  <div className="text-[12px] text-text-mute mb-1">Audiencia</div>
                  <div className="text-[13.5px] font-semibold capitalize">{display.destinatarioTipo}</div>
                  {display.seccion && (
                    <div className="text-[11.5px] text-text-mute mt-0.5">Sección {display.seccion.nombre}</div>
                  )}
                </div>

                {/* Canal sistema */}
                {display.canalSistema && (
                  <div className="p-3 border border-border-s rounded-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell size={14} className="text-primary" />
                      <div className="flex-1 text-[12.5px] font-semibold">Panel interno</div>
                      <Pill tone="success" style={{ fontSize: 10 }}>Activo</Pill>
                    </div>
                    <div className="flex justify-between text-[11px] text-text-mute mb-1">
                      <span>Enviados / Total</span>
                      <span className="font-mono font-semibold text-text">{display._count?.envios ?? 0}</span>
                    </div>
                  </div>
                )}

                {/* Canal WhatsApp */}
                {display.canalWhatsapp && (
                  <div className="p-3 border border-border-s rounded-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={14} className="text-success" />
                      <div className="flex-1 text-[12.5px] font-semibold">WhatsApp</div>
                      <Pill tone="success" style={{ fontSize: 10 }}>Activo</Pill>
                    </div>
                    <div className="text-[11.5px] text-text-mute">Via Twilio</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 text-text-mute text-[13px]">
            Seleccione un comunicado para ver su detalle
          </div>
        )}
      </div>

      {/* New Comunicado Modal */}
      {showNew && (
        <NewComunicadoModal onClose={() => setShowNew(false)} />
      )}
    </>
  )
}

function NewComunicadoModal({ onClose }: { onClose: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [canalSistema, setCanalSistema] = useState(true)
  const [canalWhatsapp, setCanalWhatsapp] = useState(false)
  const createMut = useCreateComunicado()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createMut.mutateAsync({ titulo, cuerpo, canal_sistema: canalSistema, canal_whatsapp: canalWhatsapp, publicar_ahora: true })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}>
      <div className="w-[600px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-semibold">Nuevo comunicado</h2>
          <Btn variant="ghost" size="sm" onClick={onClose} style={{ padding: 6 }}>✕</Btn>
        </header>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[12px] font-medium text-text-mute mb-1 block uppercase tracking-[0.05em]">Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ej: Suspensión de clases sábado 24"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-mute mb-1 block uppercase tracking-[0.05em]">Cuerpo del mensaje</label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              required
              rows={6}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Escriba el mensaje del comunicado…"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={canalSistema} onChange={(e) => setCanalSistema(e.target.checked)} className="w-4 h-4" />
              Panel interno
            </label>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={canalWhatsapp} onChange={(e) => setCanalWhatsapp(e.target.checked)} className="w-4 h-4" />
              WhatsApp
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
            <Btn size="sm" type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Publicando…' : 'Publicar comunicado'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}
