'use client'

import { useState, useEffect } from 'react'
import {
  useCarreras, useCreateCarrera, useUpdateCarrera, useDeleteCarrera,
  type Carrera, type AreaCarrera,
} from '@/hooks/use-carreras'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Plus, Edit, Trash, X } from '@/components/icons'

/* ─── Constantes ──────────────────────────────────────────────── */
const AREAS: { value: AreaCarrera; label: string }[] = [
  { value: 'ciencias', label: 'Ciencias' },
  { value: 'letras',   label: 'Letras' },
  { value: 'medicas',  label: 'Médicas' },
]
const AREA_LABEL: Record<AreaCarrera, string> = {
  ciencias: 'Ciencias', letras: 'Letras', medicas: 'Médicas',
}

/* ─── Modal crear / editar ────────────────────────────────────── */
function CarreraModal({ initial, onClose }: { initial?: Carrera; onClose: () => void }) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [area,   setArea]   = useState<AreaCarrera>(initial?.area ?? 'ciencias')
  const [activo, setActivo] = useState(initial?.activo ?? true)
  const [error,  setError]  = useState('')

  const createMut = useCreateCarrera()
  const updateMut = useUpdateCarrera()
  const isPending = createMut.isPending || updateMut.isPending

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    try {
      if (initial) {
        await updateMut.mutateAsync({ id: initial.id, nombre: nombre.trim(), area, activo })
      } else {
        await createMut.mutateAsync({ nombre: nombre.trim(), area, activo })
      }
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'No se pudo guardar la carrera.'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-3 shadow-3 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{initial ? 'Editar carrera' : 'Nueva carrera'}</h2>
          <button onClick={onClose} className="text-text-mute hover:text-text p-1 rounded-2 hover:bg-surface2 border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Nombre de la carrera</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ingeniería Civil"
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
              autoFocus
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-text-mute">Área</span>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as AreaCarrera)}
              className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
            >
              {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </label>

          <label className="flex items-center justify-between py-1">
            <span className="text-[13px]">Activa</span>
            <button
              type="button"
              onClick={() => setActivo((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative ${activo ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </label>

          {error && (
            <p className="text-[12px] text-danger bg-danger-light/40 px-3 py-2 rounded-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear carrera'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Página ──────────────────────────────────────────────────── */
export default function CarrerasPage() {
  const { data: carreras = [], isLoading } = useCarreras()
  const del = useDeleteCarrera()
  const [modal, setModal] = useState<'new' | Carrera | null>(null)

  async function handleDelete(c: Carrera) {
    if ((c._count?.alumnos ?? 0) > 0) {
      alert(`No se puede eliminar “${c.nombre}”: tiene ${c._count!.alumnos} alumno(s) asignado(s).`)
      return
    }
    if (!confirm(`¿Eliminar la carrera “${c.nombre}”? Esta acción no se puede deshacer.`)) return
    try {
      await del.mutateAsync(c.id)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo eliminar la carrera.')
    }
  }

  return (
    <>
      {modal && (
        <CarreraModal
          initial={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}

      <PageHeader
        title="Carreras"
        crumbs={[{ label: 'Carreras' }]}
        action={
          <Btn icon={<Plus size={14} />} size="sm" onClick={() => setModal('new')}>
            Nueva carrera
          </Btn>
        }
      />

      <div className="p-4 md:p-7 flex flex-col gap-3.5">
        {isLoading ? (
          <div className="text-center py-10 text-text-mute text-[13px]">Cargando…</div>
        ) : carreras.length === 0 ? (
          <Card>
            <div className="text-center py-10 text-text-mute text-[13px]">
              No hay carreras registradas.<br />
              <button onClick={() => setModal('new')} className="mt-2 text-primary text-[12px] hover:underline">
                + Crear la primera carrera
              </button>
            </div>
          </Card>
        ) : (
          AREAS.map((a) => {
            const lista = carreras.filter((c) => c.area === a.value)
            if (lista.length === 0) return null
            return (
              <Card key={a.value} title={a.label} subtitle={`${lista.length} carrera${lista.length !== 1 ? 's' : ''}`}>
                <div className="flex flex-col divide-y divide-border-s">
                  {lista.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-2.5 group">
                      <Dot tone={c.activo ? 'success' : 'neutral'} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium truncate">{c.nombre}</div>
                        <div className="text-[11.5px] text-text-mute">
                          {AREA_LABEL[c.area]} · {c._count?.alumnos ?? 0} alumno{(c._count?.alumnos ?? 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {!c.activo && <Pill tone="neutral">Inactiva</Pill>}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal(c)}
                          className="text-text-mute hover:text-primary p-1.5 rounded-2 hover:bg-surface2 border-none bg-transparent cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-text-mute hover:text-danger p-1.5 rounded-2 hover:bg-danger-l border-none bg-transparent cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
