'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  useApoderados, useApoderado, useUpdateApoderado,
  type Apoderado,
} from '@/hooks/use-apoderados'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Search, Edit, X, Phone, Mail, Users, ChevR, ChevL } from '@/components/icons'

const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }

function waLink(tel?: string) {
  const num = (tel ?? '').replace(/\D/g, '')
  if (!num) return undefined
  // Perú: si son 9 dígitos, anteponer 51.
  return `https://wa.me/${num.length === 9 ? '51' + num : num}`
}

/* ─── Detalle / edición ──────────────────────────────────────── */
function ApoderadoModal({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter()
  const { data: ap, isLoading } = useApoderado(id)
  const updateMut = useUpdateApoderado()

  const [edit, setEdit] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (ap) { setNombre(ap.nombre); setApellidos(ap.apellidos); setWhatsapp(ap.telefonoWhatsapp) }
  }, [ap])

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !apellidos.trim()) { setError('Nombre y apellidos son obligatorios.'); return }
    try {
      await updateMut.mutateAsync({ id, nombre: nombre.trim(), apellidos: apellidos.trim(), telefono_whatsapp: whatsapp.trim() })
      setEdit(false); setError('')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'No se pudo guardar.'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{ap ? `${ap.nombre} ${ap.apellidos}` : 'Apoderado'}</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text p-1 rounded-2 hover:bg-surface2 border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {isLoading || !ap ? (
          <div className="py-8 text-center text-text-mute text-[13px]">Cargando…</div>
        ) : edit ? (
          /* ── Formulario de edición ── */
          <form onSubmit={guardar} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary" required />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-text-mute">Apellidos</span>
                <input value={apellidos} onChange={(e) => setApellidos(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary" required />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute">WhatsApp</span>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary" />
            </label>
            <p className="text-[11.5px] text-text-mute">El DNI y el correo de acceso se gestionan desde el módulo de Usuarios.</p>
            {error && <p className="text-[12px] text-danger bg-danger-light/40 px-3 py-2 rounded-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Btn type="button" variant="secondary" className="flex-1" onClick={() => { setEdit(false); setError('') }}>Cancelar</Btn>
              <Btn type="submit" className="flex-1" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Btn>
            </div>
          </form>
        ) : (
          /* ── Vista de detalle ── */
          <>
            <div className="flex flex-col gap-2 text-[12.5px]">
              <div className="flex items-center gap-2 text-text-mute">
                <span className="font-mono">DNI {ap.dni}</span>
                <Pill tone={ap.usuario?.activo ? 'success' : 'neutral'}>
                  <Dot tone={ap.usuario?.activo ? 'success' : 'neutral'} size={6} />
                  {ap.usuario?.activo ? 'Cuenta activa' : 'Cuenta inactiva'}
                </Pill>
              </div>
              {ap.usuario?.email && (
                <div className="flex items-center gap-2"><Mail size={14} className="text-text-mute" /> {ap.usuario.email}</div>
              )}
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-text-mute" /> {ap.telefonoWhatsapp || '—'}
                {waLink(ap.telefonoWhatsapp) && (
                  <a href={waLink(ap.telefonoWhatsapp)} target="_blank" rel="noopener noreferrer"
                    className="text-[11.5px] text-success hover:underline ml-1">Abrir WhatsApp</a>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border-s pt-3">
              <span className="text-[12px] font-medium text-text-mute uppercase tracking-wide">
                Hijos vinculados ({ap.alumnos.length})
              </span>
              {ap.alumnos.length === 0 ? (
                <p className="text-[12px] text-text-mute py-1">Sin estudiantes vinculados.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border-s">
                  {ap.alumnos.map((h) => (
                    <button
                      key={h.alumno.id}
                      onClick={() => { onClose(); router.push(`/alumnos/${h.alumno.id}`) }}
                      className="flex items-center gap-3 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-surface2 rounded-2 px-1 -mx-1"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{h.alumno.apellidos}, {h.alumno.nombre}</div>
                        <div className="text-[11.5px] text-text-mute">
                          {h.parentesco}{h.esPrincipal ? ' · principal' : ''}
                          {h.alumno.aula?.nombre ? ` · ${h.alumno.aula.nombre}` : ''}
                          {h.alumno.aula?.turno ? ` · ${TURNO_LABEL[h.alumno.aula.turno] ?? h.alumno.aula.turno}` : ''}
                        </div>
                      </div>
                      <ChevR size={15} className="text-text-mute shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1 border-t border-border-s">
              <Btn variant="secondary" className="flex-1" icon={<Edit size={14} />} onClick={() => setEdit(true)}>
                Editar datos
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────── */
export default function ApoderadosPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)

  // Debounce de la búsqueda
  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading, isFetching } = useApoderados({ page, limit: 20, search: search || undefined })
  const items: Apoderado[] = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="px-4 md:px-7 pt-4 md:pt-[22px] pb-7 flex flex-col gap-4">
      {selected && <ApoderadoModal id={selected} onClose={() => setSelected(null)} />}

      <PageHeader title="Apoderados" crumbs={[{ label: 'Apoderados' }]} />

      {/* Filtro */}
      <div className="flex gap-2.5 items-center bg-surface border border-border rounded-3 px-3 py-3 shadow-1 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[400px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, DNI, teléfono o correo…"
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
          />
        </div>
        <span className="text-[12px] text-text-mute ml-auto">
          {total} apoderado{total !== 1 ? 's' : ''}{isFetching ? ' · actualizando…' : ''}
        </span>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-10 text-center text-text-mute text-[13px]">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-text-mute text-[13px]">
            {search ? `Ningún apoderado coincide con “${search}”.` : 'No hay apoderados registrados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[680px]">
              <thead>
                <tr className="bg-surface-2 border-b border-border">
                  {['Apoderado', 'DNI', 'WhatsApp', 'Hijos', 'Cuenta', ''].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border-s hover:bg-surface-2 cursor-pointer transition-colors"
                    onClick={() => setSelected(a.id)}
                  >
                    <td className="px-3.5 py-2.5 font-medium">{a.apellidos}, {a.nombre}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute">{a.dni}</td>
                    <td className="px-3.5 py-2.5 text-text-mute">{a.telefonoWhatsapp || '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-text-mute">
                        <Users size={13} /> {a._count?.alumnos ?? 0}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone={a.usuario?.activo ? 'success' : 'neutral'}>
                        <Dot tone={a.usuario?.activo ? 'success' : 'neutral'} size={6} />
                        {a.usuario?.activo ? 'Activa' : 'Inactiva'}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <ChevR size={15} className="text-text-mute inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Btn variant="secondary" size="sm" icon={<ChevL size={14} />}
            disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <span className="text-[12.5px] text-text-mute">Página {page} de {totalPages}</span>
          <Btn variant="secondary" size="sm" icon={<ChevR size={14} />}
            disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
        </div>
      )}
    </div>
  )
}
