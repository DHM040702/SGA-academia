'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  useApoderados, useApoderado, useUpdateApoderado, useCreateApoderado, useDeleteApoderado,
  useVincularEstudiante, useDesvincularEstudiante, PARENTESCO_OPTS,
  type Apoderado,
} from '@/hooks/use-apoderados'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Search, Edit, X, Phone, Mail, Users, ChevR, ChevL, Plus, Trash } from '@/components/icons'

const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }

function waLink(tel?: string) {
  const num = (tel ?? '').replace(/\D/g, '')
  if (!num) return undefined
  return `https://wa.me/${num.length === 9 ? '51' + num : num}`
}

function errMsg(err: any, fallback: string) {
  const msg = err?.response?.data?.message
  return Array.isArray(msg) ? msg.join(', ') : (msg ?? fallback)
}

/* ─── Crear apoderado ────────────────────────────────────────── */
function CrearApoderadoModal({ onClose }: { onClose: () => void }) {
  const createMut = useCreateApoderado()
  const [f, setF] = useState({ nombre: '', apellidos: '', dni: '', telefono_whatsapp: '', email: '', password: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  function set(k: string, v: string) { setF((p) => ({ ...p, [k]: v })); setError('') }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.nombre || !f.apellidos || !f.dni || !f.email || !f.password) { setError('Completa todos los campos.'); return }
    try {
      await createMut.mutateAsync({ ...f })
      onClose()
    } catch (err: any) { setError(errMsg(err, 'No se pudo crear el apoderado.')) }
  }

  const input = 'px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Nuevo apoderado</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text p-1 rounded-2 hover:bg-surface2 border-none bg-transparent cursor-pointer"><X size={16} /></button>
        </div>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">Nombre</span>
              <input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} className={input} required /></label>
            <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">Apellidos</span>
              <input value={f.apellidos} onChange={(e) => set('apellidos', e.target.value)} className={input} required /></label>
            <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">DNI</span>
              <input value={f.dni} onChange={(e) => set('dni', e.target.value.replace(/\D/g, '').slice(0, 8))} className={input} placeholder="8 dígitos" required /></label>
            <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">WhatsApp</span>
              <input value={f.telefono_whatsapp} onChange={(e) => set('telefono_whatsapp', e.target.value)} className={input} required /></label>
          </div>
          <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">Correo de acceso</span>
            <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} required /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">Contraseña inicial</span>
            <input value={f.password} onChange={(e) => set('password', e.target.value)} className={input} placeholder="Mínimo 8 caracteres" required /></label>
          {error && <p className="text-[12px] text-danger bg-danger-light/40 px-3 py-2 rounded-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" className="flex-1" disabled={createMut.isPending}>{createMut.isPending ? 'Creando…' : 'Crear apoderado'}</Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Vincular estudiante (dentro del detalle) ───────────────── */
function VincularEstudiante({ apoderadoId }: { apoderadoId: string }) {
  const vincularMut = useVincularEstudiante()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<any>(null)
  const [parentesco, setParentesco] = useState<string>(PARENTESCO_OPTS[0])
  const [error, setError] = useState('')

  const { data: results = [] } = useQuery<any[]>({
    queryKey: ['alumnos', 'vincular-search', q],
    queryFn: async () => {
      const { data } = await api.get('/alumnos', { params: { q, limit: 6, page: 1 } })
      return data?.data ?? []
    },
    enabled: q.trim().length >= 2 && !sel,
    staleTime: 20_000,
  })

  async function vincular() {
    if (!sel) return
    try {
      await vincularMut.mutateAsync({ alumnoId: sel.id, accion: 'existente', apoderado_id: apoderadoId, parentesco, es_principal: false })
      setSel(null); setQ(''); setError('')
    } catch (err: any) { setError(errMsg(err, 'No se pudo vincular.')) }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border-s pt-3">
      <span className="text-[12px] font-medium text-text-mute uppercase tracking-wide">Vincular un estudiante</span>
      {sel ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-medium flex-1 min-w-0 truncate">{sel.apellidos}, {sel.nombres ?? sel.nombre}</span>
          <select value={parentesco} onChange={(e) => setParentesco(e.target.value)}
            className="text-[12.5px] px-2 py-1.5 border border-border rounded-2 bg-surface">
            {PARENTESCO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Btn size="sm" onClick={vincular} disabled={vincularMut.isPending}>{vincularMut.isPending ? '…' : 'Vincular'}</Btn>
          <button onClick={() => { setSel(null); setError('') }} className="text-text-mute hover:text-text bg-transparent border-none cursor-pointer p-1"><X size={14} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno por nombre, código o DNI…"
            className="w-full pl-8 pr-3 py-2 text-[12.5px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary" />
          {q.trim().length >= 2 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-2 overflow-hidden max-h-[220px] overflow-y-auto">
              {results.length === 0
                ? <p className="text-[12px] text-text-mute text-center py-3">Sin resultados.</p>
                : results.map((a) => (
                    <button key={a.id} onClick={() => { setSel(a); setQ('') }}
                      className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-surface2 border-none bg-transparent cursor-pointer flex justify-between gap-2 border-b border-border-s last:border-0">
                      <span className="truncate">{a.apellidos}, {a.nombres ?? a.nombre}{a.aula ? ` · ${a.aula.nombre}` : ''}</span>
                      <span className="font-mono text-[11px] text-primary shrink-0">{a.codigo_barra ?? a.dni}</span>
                    </button>
                  ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  )
}

/* ─── Detalle / edición ──────────────────────────────────────── */
function ApoderadoModal({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter()
  const { data: ap, isLoading } = useApoderado(id)
  const updateMut = useUpdateApoderado()
  const deleteMut = useDeleteApoderado()
  const desvincularMut = useDesvincularEstudiante()

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
    } catch (err: any) { setError(errMsg(err, 'No se pudo guardar.')) }
  }

  async function eliminar() {
    if (!ap) return
    if (!confirm(`¿Eliminar al apoderado ${ap.nombre} ${ap.apellidos}? Se desvincularán sus estudiantes y se desactivará su cuenta.`)) return
    try { await deleteMut.mutateAsync(id); onClose() }
    catch (err: any) { setError(errMsg(err, 'No se pudo eliminar.')) }
  }

  async function desvincular(alumnoId: string) {
    if (!confirm('¿Desvincular este estudiante del apoderado?')) return
    try { await desvincularMut.mutateAsync({ alumnoId, apoderadoId: id }) }
    catch (err: any) { setError(errMsg(err, 'No se pudo desvincular.')) }
  }

  const input = 'px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{ap ? `${ap.nombre} ${ap.apellidos}` : 'Apoderado'}</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text p-1 rounded-2 hover:bg-surface2 border-none bg-transparent cursor-pointer"><X size={16} /></button>
        </div>

        {isLoading || !ap ? (
          <div className="py-8 text-center text-text-mute text-[13px]">Cargando…</div>
        ) : edit ? (
          <form onSubmit={guardar} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} required /></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">Apellidos</span>
                <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={input} required /></label>
            </div>
            <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-text-mute">WhatsApp</span>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={input} /></label>
            <p className="text-[11.5px] text-text-mute">El DNI y el correo de acceso se gestionan desde el módulo de Usuarios.</p>
            {error && <p className="text-[12px] text-danger bg-danger-light/40 px-3 py-2 rounded-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Btn type="button" variant="secondary" className="flex-1" onClick={() => { setEdit(false); setError('') }}>Cancelar</Btn>
              <Btn type="submit" className="flex-1" disabled={updateMut.isPending}>{updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}</Btn>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col gap-2 text-[12.5px]">
              <div className="flex items-center gap-2 text-text-mute">
                <span className="font-mono">DNI {ap.dni}</span>
                <Pill tone={ap.usuario?.activo ? 'success' : 'neutral'}>
                  <Dot tone={ap.usuario?.activo ? 'success' : 'neutral'} size={6} />
                  {ap.usuario?.activo ? 'Cuenta activa' : 'Cuenta inactiva'}
                </Pill>
              </div>
              {ap.usuario?.email && <div className="flex items-center gap-2"><Mail size={14} className="text-text-mute" /> {ap.usuario.email}</div>}
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-text-mute" /> {ap.telefonoWhatsapp || '—'}
                {waLink(ap.telefonoWhatsapp) && (
                  <a href={waLink(ap.telefonoWhatsapp)} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-success hover:underline ml-1">Abrir WhatsApp</a>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border-s pt-3">
              <span className="text-[12px] font-medium text-text-mute uppercase tracking-wide">Estudiantes vinculados ({ap.alumnos.length})</span>
              {ap.alumnos.length === 0 ? (
                <p className="text-[12px] text-text-mute py-1">Sin estudiantes vinculados.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border-s">
                  {ap.alumnos.map((h) => (
                    <div key={h.alumno.id} className="flex items-center gap-2 py-2.5 group">
                      <button onClick={() => { onClose(); router.push(`/alumnos/${h.alumno.id}`) }}
                        className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer">
                        <div className="text-[13px] font-medium truncate hover:text-primary">{h.alumno.apellidos}, {h.alumno.nombre}</div>
                        <div className="text-[11.5px] text-text-mute">
                          {h.parentesco}{h.esPrincipal ? ' · principal' : ''}
                          {h.alumno.aula?.nombre ? ` · ${h.alumno.aula.nombre}` : ''}
                          {h.alumno.aula?.turno ? ` · ${TURNO_LABEL[h.alumno.aula.turno] ?? h.alumno.aula.turno}` : ''}
                        </div>
                      </button>
                      <button onClick={() => desvincular(h.alumno.id)} title="Desvincular"
                        className="text-text-mute hover:text-danger p-1.5 rounded-2 hover:bg-danger-l border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <VincularEstudiante apoderadoId={id} />

            {error && <p className="text-[12px] text-danger">{error}</p>}

            <div className="flex gap-2 pt-2 border-t border-border-s">
              <Btn variant="secondary" className="flex-1" icon={<Edit size={14} />} onClick={() => setEdit(true)}>Editar datos</Btn>
              <Btn variant="ghost" className="text-danger hover:bg-danger-l" icon={<Trash size={14} />}
                onClick={eliminar} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
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
  const [showNew, setShowNew] = useState(false)

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
      {showNew && <CrearApoderadoModal onClose={() => setShowNew(false)} />}

      <PageHeader
        title="Apoderados"
        crumbs={[{ label: 'Apoderados' }]}
        action={<Btn icon={<Plus size={14} />} size="sm" onClick={() => setShowNew(true)}>Nuevo apoderado</Btn>}
      />

      <div className="flex gap-2.5 items-center bg-surface border border-border rounded-3 px-3 py-3 shadow-1 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[400px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, DNI, teléfono o correo…"
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary" />
        </div>
        <span className="text-[12px] text-text-mute ml-auto">{total} apoderado{total !== 1 ? 's' : ''}{isFetching ? ' · actualizando…' : ''}</span>
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
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-t border-border-s hover:bg-surface-2 cursor-pointer transition-colors" onClick={() => setSelected(a.id)}>
                    <td className="px-3.5 py-2.5 font-medium">{a.apellidos}, {a.nombre}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute">{a.dni}</td>
                    <td className="px-3.5 py-2.5 text-text-mute">{a.telefonoWhatsapp || '—'}</td>
                    <td className="px-3.5 py-2.5"><span className="inline-flex items-center gap-1.5 text-text-mute"><Users size={13} /> {a._count?.alumnos ?? 0}</span></td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone={a.usuario?.activo ? 'success' : 'neutral'}>
                        <Dot tone={a.usuario?.activo ? 'success' : 'neutral'} size={6} />
                        {a.usuario?.activo ? 'Activa' : 'Inactiva'}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5 text-right"><ChevR size={15} className="text-text-mute inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Btn variant="secondary" size="sm" icon={<ChevL size={14} />} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <span className="text-[12.5px] text-text-mute">Página {page} de {totalPages}</span>
          <Btn variant="secondary" size="sm" icon={<ChevR size={14} />} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
        </div>
      )}
    </div>
  )
}
