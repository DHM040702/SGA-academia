'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useComunicados,
  useComunicado,
  useCreateComunicado,
  useUpdateComunicado,
  useDeleteComunicado,
  type Comunicado,
  type CreateComunicadoDto,
} from '@/hooks/use-comunicados'
import { useAulas } from '@/hooks/use-ciclos'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Search, Edit, Trash, Bell, Phone, Send, X, MoreHorizontal } from '@/components/icons'

/* ─── types ──────────────────────────────────────────────────────── */
type Tab = 'Todos' | 'Enviados' | 'Borradores'

const DESTINATARIO_OPTS = [
  { value: 'todos',      label: 'Todos (alumnos + apoderados)' },
  { value: 'alumnos',    label: 'Solo alumnos' },
  { value: 'apoderados', label: 'Solo apoderados' },
  { value: 'seccion',    label: 'Aula específica' },
]

const DESTINATARIO_LABEL: Record<string, string> = {
  todos:      'Todos',
  alumnos:    'Alumnos',
  apoderados: 'Apoderados',
  seccion:    'Aula específica',
  usuario:    'Usuario específico',
}

/* ─── helpers ────────────────────────────────────────────────────── */
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

/* ─── ActionsMenu ─────────────────────────────────────────────────── */
function ActionsMenu({
  isDraft,
  onEdit,
  onPublish,
  onDelete,
}: {
  isDraft: boolean
  onEdit: () => void
  onPublish: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Btn
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        style={{ padding: 6 }}
      >
        <MoreHorizontal size={16} />
      </Btn>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-2 shadow-2 z-20 py-1 overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-surface2 flex items-center gap-2.5 bg-transparent border-none cursor-pointer"
          >
            <Edit size={13} className="text-text-mute" /> Editar
          </button>
          {isDraft && (
            <button
              onClick={() => { onPublish(); setOpen(false) }}
              className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-surface2 flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-primary"
            >
              <Send size={13} /> Publicar ahora
            </button>
          )}
          <div className="h-px bg-border-s mx-2 my-1" />
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-danger-light text-danger flex items-center gap-2.5 bg-transparent border-none cursor-pointer"
          >
            <Trash size={13} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── DeleteConfirmModal ──────────────────────────────────────────── */
function DeleteConfirmModal({
  titulo,
  onConfirm,
  onClose,
  isPending,
}: {
  titulo: string
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[420px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[18px] font-semibold text-danger">Eliminar comunicado</h2>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-text-mute hover:text-text">
            <X size={16} />
          </button>
        </header>
        <div className="p-5">
          <p className="text-[13.5px] text-text leading-relaxed mb-1">
            ¿Está seguro que desea eliminar el comunicado?
          </p>
          <p className="text-[13px] font-semibold text-text truncate">"{titulo}"</p>
          <p className="text-[12px] text-text-mute mt-2">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
            <Btn
              size="sm"
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              style={{ background: 'var(--color-danger)', color: '#fff' }}
            >
              {isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── NuevoComunicadoModal ────────────────────────────────────────── */
function NuevoComunicadoModal({ onClose }: { onClose: () => void }) {
  const [titulo, setTitulo]           = useState('')
  const [cuerpo, setCuerpo]           = useState('')
  const [destinatario, setDestinatario] = useState<CreateComunicadoDto['destinatario_tipo']>('todos')
  const [aulaId, setAulaId]           = useState('')
  const [canalSistema, setCanalSistema] = useState(true)
  const [canalWhatsapp, setCanalWhatsapp] = useState(false)

  const createMut = useCreateComunicado()
  const { data: aulas = [] } = useAulas()

  async function handleSubmit(publicarAhora: boolean) {
    if (!titulo.trim() || !cuerpo.trim()) return
    const dto: CreateComunicadoDto = {
      titulo:           titulo.trim(),
      cuerpo:           cuerpo.trim(),
      destinatario_tipo: destinatario,
      canal_sistema:    canalSistema,
      canal_whatsapp:   canalWhatsapp,
      publicar_ahora:   publicarAhora,
      ...(destinatario === 'seccion' && aulaId && { aula_id: aulaId }),
    }
    await createMut.mutateAsync(dto)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[620px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-semibold">Nuevo comunicado</h2>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-text-mute hover:text-text">
            <X size={16} />
          </button>
        </header>

        <div className="p-5 flex flex-col gap-4">
          {/* Titulo */}
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
              Título <span className="text-danger">*</span>
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ej: Suspensión de clases sábado 31"
            />
          </div>

          {/* Cuerpo */}
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
              Mensaje <span className="text-danger">*</span>
            </label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              required
              rows={5}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Escriba el contenido del comunicado…"
            />
          </div>

          {/* Destinatario */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
                Destinatarios
              </label>
              <select
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value as CreateComunicadoDto['destinatario_tipo'])}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DESTINATARIO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {destinatario === 'seccion' && (
              <div>
                <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
                  Aula
                </label>
                <select
                  value={aulaId}
                  onChange={(e) => setAulaId(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Seleccionar aula —</option>
                  {aulas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Canales */}
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-2 block uppercase tracking-[0.05em]">
              Canales de envío
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={canalSistema}
                  onChange={(e) => setCanalSistema(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <Bell size={13} className="text-primary" /> Panel interno
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={canalWhatsapp}
                  onChange={(e) => setCanalWhatsapp(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <Phone size={13} className="text-success" /> WhatsApp
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">
              Cancelar
            </Btn>
            <Btn
              variant="secondary"
              size="sm"
              type="button"
              disabled={createMut.isPending || !titulo.trim() || !cuerpo.trim()}
              onClick={() => handleSubmit(false)}
            >
              Guardar borrador
            </Btn>
            <Btn
              size="sm"
              type="button"
              disabled={createMut.isPending || !titulo.trim() || !cuerpo.trim()}
              onClick={() => handleSubmit(true)}
            >
              <Send size={13} />
              {createMut.isPending ? 'Publicando…' : 'Publicar ahora'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── EditarComunicadoModal ───────────────────────────────────────── */
function EditarComunicadoModal({
  comunicado,
  onClose,
}: {
  comunicado: Comunicado
  onClose: () => void
}) {
  const [titulo, setTitulo] = useState(comunicado.titulo)
  const [cuerpo, setCuerpo] = useState(comunicado.cuerpo)
  const updateMut = useUpdateComunicado()

  const isDraft = !comunicado.publicadoAt

  async function handleSave() {
    await updateMut.mutateAsync({ id: comunicado.id, titulo, cuerpo })
    onClose()
  }

  async function handlePublicar() {
    await updateMut.mutateAsync({ id: comunicado.id, titulo, cuerpo, publicar_ahora: true })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[620px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[20px] font-semibold">Editar comunicado</h2>
            {isDraft && (
              <span className="text-[11.5px] text-warning font-medium">Borrador — sin publicar</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-text-mute hover:text-text">
            <X size={16} />
          </button>
        </header>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
              Título
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
              Mensaje
            </label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">
              Cancelar
            </Btn>
            <Btn
              variant="secondary"
              size="sm"
              type="button"
              disabled={updateMut.isPending}
              onClick={handleSave}
            >
              {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Btn>
            {isDraft && (
              <Btn
                size="sm"
                type="button"
                disabled={updateMut.isPending}
                onClick={handlePublicar}
              >
                <Send size={13} /> Publicar ahora
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function ComunicadosPage() {
  const [tab, setTab]             = useState<Tab>('Todos')
  const [q, setQ]                 = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [editTarget, setEditTarget] = useState<Comunicado | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Comunicado | null>(null)

  const { data: page } = useComunicados({ limit: 50 })
  const { data: detail } = useComunicado(selectedId ?? '')
  const updateMut = useUpdateComunicado()
  const deleteMut = useDeleteComunicado()

  const all = page?.data ?? []

  const filtered = all.filter((c) => {
    if (q && !c.titulo.toLowerCase().includes(q.toLowerCase())) return false
    if (tab === 'Enviados'   && !c.publicadoAt)  return false
    if (tab === 'Borradores' &&  c.publicadoAt)  return false
    return true
  })

  // El comunicado mostrado: si hay uno seleccionado usa el detalle (con envíos),
  // sino muestra el primero de la lista para no dejar el panel vacío.
  const display: Comunicado | null = detail ?? (selectedId ? null : filtered[0] ?? null)

  /* ── acciones ───────────────────────────────────────────────────── */
  async function handlePublicar(c: Comunicado) {
    await updateMut.mutateAsync({ id: c.id, publicar_ahora: true })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteMut.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
    if (selectedId === deleteTarget.id) setSelectedId(null)
  }

  /* ── render ─────────────────────────────────────────────────────── */
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

        {/* ── Lista ──────────────────────────────────────────────── */}
        <div className="flex flex-col bg-surface border border-border rounded-3 overflow-hidden shadow-1">
          {/* Buscador + tabs */}
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
                  className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors bg-transparent border-none cursor-pointer"
                  style={{
                    background: tab === t ? 'var(--color-primary-l)' : 'transparent',
                    color: tab === t ? 'var(--color-primary)' : 'var(--color-text-mute)',
                    fontWeight: tab === t ? 600 : 500,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const isActive = c.id === (display?.id ?? filtered[0]?.id)
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
                    <div className="text-[13px] font-semibold flex-1 text-text truncate">{c.titulo}</div>
                    <span className="text-[10.5px] text-text-soft shrink-0">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="text-[11.5px] text-text-mute mb-1.5 line-clamp-1">{c.cuerpo}</div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {c.canalSistema && (
                      <span className="px-1.5 py-0.5 bg-surface2 rounded text-text-mute">Panel</span>
                    )}
                    {c.canalWhatsapp && (
                      <span className="px-1.5 py-0.5 bg-surface2 rounded text-text-mute">WhatsApp</span>
                    )}
                    {!c.publicadoAt && (
                      <span className="px-1.5 py-0.5 bg-warning-light rounded text-warning font-medium">Borrador</span>
                    )}
                    <span className="flex-1" />
                    <span className="text-text-mute font-mono">
                      {c._count?.envios ?? 0} envíos · {c.pct_enviado ?? 0}%
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

        {/* ── Detalle ────────────────────────────────────────────── */}
        {display ? (
          <Card>
            {/* Header */}
            <div className="p-[18px] pb-4 border-b border-border-s flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill tone={display.publicadoAt ? 'success' : 'warning'}>
                    <Dot tone={display.publicadoAt ? 'success' : 'warning'} size={6} />
                    {display.publicadoAt ? 'Publicado' : 'Borrador'}
                  </Pill>
                  {display.publicadoAt && (
                    <span className="text-[11.5px] text-text-mute">
                      {new Date(display.publicadoAt).toLocaleString('es-PE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-[22px] font-semibold tracking-tight mt-2 mb-1 truncate">
                  {display.titulo}
                </h2>
                <div className="text-[12px] text-text-mute">
                  {display.publicadoPor?.email ?? '—'} · {timeAgo(display.createdAt)}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!display.publicadoAt && (
                  <Btn
                    size="sm"
                    disabled={updateMut.isPending}
                    onClick={() => handlePublicar(display)}
                  >
                    <Send size={13} />
                    Publicar
                  </Btn>
                )}
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditTarget(display)}
                >
                  <Edit size={13} /> Editar
                </Btn>
                <ActionsMenu
                  isDraft={!display.publicadoAt}
                  onEdit={() => setEditTarget(display)}
                  onPublish={() => handlePublicar(display)}
                  onDelete={() => setDeleteTarget(display)}
                />
              </div>
            </div>

            {/* Body */}
            <div className="p-5 grid gap-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
              <div>
                <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] mb-2 font-semibold">
                  Mensaje
                </div>
                <div
                  className="text-[13.5px] leading-relaxed text-text"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {display.cuerpo}
                </div>

                {display.canalWhatsapp && (
                  <div className="mt-5 p-3.5 bg-surface2 rounded-2 border border-border-s">
                    <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] mb-2 font-semibold">
                      Vista previa WhatsApp
                    </div>
                    <div
                      className="text-[13px] leading-relaxed max-w-[320px] rounded-[10px] px-3 py-2.5"
                      style={{ background: '#dcf8c6' }}
                    >
                      <strong>Centro Preuniversitario</strong> —{' '}
                      {display.cuerpo.slice(0, 120)}
                      {display.cuerpo.length > 120 ? '…' : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar stats */}
              <div className="flex flex-col gap-3">
                {/* Audiencia */}
                <div>
                  <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] mb-2 font-semibold">
                    Destinatarios
                  </div>
                  <div className="bg-surface2 p-3 rounded-2 border border-border-s">
                    <div className="text-[12px] text-text-mute mb-0.5">Audiencia</div>
                    <div className="text-[13.5px] font-semibold">
                      {DESTINATARIO_LABEL[display.destinatarioTipo] ?? display.destinatarioTipo}
                    </div>
                    {display.aula && (
                      <div className="text-[11.5px] text-text-mute mt-0.5">
                        Aula: {display.aula.nombre}
                      </div>
                    )}
                  </div>
                </div>

                {/* Canal sistema */}
                {display.canalSistema && (
                  <div className="p-3 border border-border-s rounded-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell size={14} className="text-primary" />
                      <div className="flex-1 text-[12.5px] font-semibold">Panel interno</div>
                      <Pill tone="primary" style={{ fontSize: 10 }}>Activo</Pill>
                    </div>
                    <div className="flex justify-between text-[11px] text-text-mute">
                      <span>Total envíos</span>
                      <span className="font-mono font-semibold text-text">
                        {display._count?.envios ?? 0}
                      </span>
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

                {/* Envíos recientes */}
                {display.envios && display.envios.length > 0 && (
                  <div>
                    <div className="text-[11px] text-text-soft uppercase tracking-[0.05em] mb-2 font-semibold">
                      Últimos envíos
                    </div>
                    <div className="flex flex-col gap-1">
                      {display.envios.slice(0, 5).map((e) => (
                        <div key={e.id} className="flex items-center gap-2 text-[11.5px]">
                          <Dot
                            tone={
                              e.estado === 'enviado' ? 'success'
                              : e.estado === 'error'  ? 'danger'
                              : 'neutral'
                            }
                            size={6}
                          />
                          <span className="capitalize text-text-mute">{e.canal}</span>
                          <span className="capitalize text-text">{e.estado}</span>
                          {e.enviadoAt && (
                            <span className="ml-auto text-text-soft font-mono">
                              {new Date(e.enviadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
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

      {/* ── Modales ───────────────────────────────────────────────── */}
      {showNew && (
        <NuevoComunicadoModal onClose={() => setShowNew(false)} />
      )}

      {editTarget && (
        <EditarComunicadoModal
          comunicado={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          titulo={deleteTarget.titulo}
          isPending={deleteMut.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
