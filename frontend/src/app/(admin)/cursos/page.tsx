'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCursos,
  useCreateCurso,
  useUpdateCurso,
  useDeleteCurso,
  type Curso,
} from '@/hooks/use-cursos'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { KPI } from '@/components/ui/kpi'
import { Plus, Search, Edit, Trash, X, ChevR, Layers } from '@/components/icons'

/* ─── helpers ────────────────────────────────────────────────────── */
const COLORES_CURSO = [
  'oklch(0.36 0.10 255)', // azul primario
  'oklch(0.45 0.14 160)', // verde
  'oklch(0.50 0.15 30)',  // naranja
  'oklch(0.42 0.18 310)', // violeta
  'oklch(0.45 0.16 200)', // teal
  'oklch(0.48 0.14 60)',  // amarillo oscuro
]

function colorCurso(codigo: string) {
  let h = 0
  for (let i = 0; i < codigo.length; i++) h = (h * 31 + codigo.charCodeAt(i)) % COLORES_CURSO.length
  return COLORES_CURSO[h]
}

/* ─── NuevoCursoModal ────────────────────────────────────────────── */
function CursoModal({
  initial,
  onClose,
}: {
  initial?: Curso
  onClose: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [codigo, setCodigo] = useState(initial?.codigo ?? '')
  const [error, setError]   = useState('')

  const createMut = useCreateCurso()
  const updateMut = useUpdateCurso()
  const isPending = createMut.isPending || updateMut.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (initial) {
        await updateMut.mutateAsync({ id: initial.id, nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() })
      } else {
        await createMut.mutateAsync({ nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() })
      }
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar el curso')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[480px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-semibold">
            {initial ? 'Editar curso' : 'Nuevo curso'}
          </h2>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-text-mute hover:text-text">
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
              Nombre del curso <span className="text-danger">*</span>
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={100}
              placeholder="Ej: Matemáticas, Lenguaje, Química…"
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">
              Código <span className="text-danger">*</span>
            </label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              required
              maxLength={10}
              placeholder="Ej: MAT, LEN, QUI"
              pattern="[A-Z0-9_\-]+"
              title="Solo letras mayúsculas, números, guiones o guiones bajos"
              className="w-full px-3 py-2 text-[13px] font-mono border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-text-mute mt-1">
              Máx. 10 caracteres. Solo mayúsculas, números, - o _.
            </p>
          </div>

          {error && (
            <p className="text-[12px] text-danger bg-danger-light px-3 py-2 rounded-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
            <Btn size="sm" type="submit" disabled={isPending || !nombre.trim() || !codigo.trim()}>
              {isPending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear curso'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── DeleteConfirmModal ─────────────────────────────────────────── */
function DeleteConfirmModal({
  curso,
  onConfirm,
  onClose,
  isPending,
}: {
  curso: Curso
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const horariosAsignados = curso._count?.horarios ?? 0
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[420px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[18px] font-semibold text-danger">Eliminar curso</h2>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-text-mute hover:text-text">
            <X size={16} />
          </button>
        </header>
        <div className="p-5">
          <p className="text-[13.5px] text-text leading-relaxed">
            ¿Eliminar el curso <span className="font-semibold">"{curso.nombre}"</span>?
          </p>
          {horariosAsignados > 0 && (
            <div className="mt-3 p-3 bg-warning-light border border-warning/30 rounded-2 text-[12px] text-warning-dark">
              ⚠️ Este curso tiene <strong>{horariosAsignados} horario{horariosAsignados > 1 ? 's' : ''}</strong> asignado{horariosAsignados > 1 ? 's' : ''}. Al eliminarlo quedará desactivado del sistema.
            </div>
          )}
          <p className="text-[12px] text-text-mute mt-3">Esta acción desactiva el curso (soft delete).</p>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose}>Cancelar</Btn>
            <Btn
              size="sm"
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

/* ─── Page ───────────────────────────────────────────────────────── */
export default function CursosPage() {
  const router = useRouter()
  const [q, setQ]               = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [editTarget, setEditTarget]     = useState<Curso | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Curso | null>(null)

  const { data: cursos = [], isLoading } = useCursos()
  const deleteMut = useDeleteCurso()

  const filtered = useMemo(() => {
    const term = q.toLowerCase()
    if (!term) return cursos
    return cursos.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        c.codigo.toLowerCase().includes(term),
    )
  }, [cursos, q])

  const totalHorarios = cursos.reduce((s, c) => s + (c._count?.horarios ?? 0), 0)

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteMut.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      <PageHeader
        title="Cursos"
        crumbs={[{ label: 'Cursos' }]}
        action={
          <Btn icon={<Plus size={14} />} size="sm" onClick={() => setShowNew(true)}>
            Nuevo curso
          </Btn>
        }
      />

      <div className="px-7 pb-8 pt-5 flex flex-col gap-5">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3.5">
          <KPI
            label="Cursos activos"
            value={isLoading ? '—' : cursos.length}
            sub="en el sistema"
            accent="var(--color-primary)"
          />
          <KPI
            label="Horarios asignados"
            value={isLoading ? '—' : totalHorarios}
            sub="en ciclo activo"
            accent="var(--color-success)"
          />
          <KPI
            label="Sin horario asignado"
            value={isLoading ? '—' : cursos.filter((c) => (c._count?.horarios ?? 0) === 0).length}
            sub="cursos sin clase"
            accent="var(--color-warning)"
          />
        </div>

        {/* Tabla */}
        <Card
          title="Lista de cursos"
          subtitle={`${filtered.length} curso${filtered.length !== 1 ? 's' : ''}`}
          action={
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute flex pointer-events-none">
                <Search size={13} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre o código…"
                className="pl-8 pr-3 py-1.5 text-[12.5px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary w-56"
              />
            </div>
          }
        >
          {isLoading ? (
            <div className="py-10 text-center text-[13px] text-text-mute">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Layers size={32} className="text-text-soft mx-auto mb-3" />
              <p className="text-[13px] text-text-mute">
                {q ? `Sin resultados para "${q}"` : 'No hay cursos registrados'}
              </p>
              {!q && (
                <Btn size="sm" className="mt-3" onClick={() => setShowNew(true)}>
                  <Plus size={13} /> Crear primer curso
                </Btn>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface2/50">
                  {['Código', 'Nombre', 'Horarios asignados', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const color = colorCurso(c.codigo)
                  const horarios = c._count?.horarios ?? 0
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-border-s hover:bg-surface2/40 transition-colors group"
                    >
                      {/* Código */}
                      <td className="px-3.5 py-3">
                        <span
                          className="font-mono text-[12px] font-bold px-2 py-0.5 rounded"
                          style={{
                            background: `color-mix(in oklab, ${color} 12%, transparent)`,
                            color,
                          }}
                        >
                          {c.codigo}
                        </span>
                      </td>

                      {/* Nombre */}
                      <td className="px-3.5 py-3 font-medium">{c.nombre}</td>

                      {/* Horarios */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 rounded-full bg-primary/20 w-24 overflow-hidden"
                          >
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min((horarios / Math.max(totalHorarios / cursos.length * 2, 1)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[12px] text-text-mute">
                            {horarios} {horarios === 1 ? 'horario' : 'horarios'}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-3.5 py-3">
                        <Pill tone={horarios > 0 ? 'success' : 'neutral'}>
                          {horarios > 0 ? 'Activo' : 'Sin asignar'}
                        </Pill>
                      </td>

                      {/* Acciones */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <Btn
                            variant="ghost"
                            size="sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => router.push(`/cursos/${c.id}`)}
                          >
                            <ChevR size={13} /> Detalle
                          </Btn>
                          <Btn
                            variant="secondary"
                            size="sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => setEditTarget(c)}
                          >
                            <Edit size={13} />
                          </Btn>
                          <Btn
                            variant="ghost"
                            size="sm"
                            style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash size={13} />
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Modales */}
      {showNew && <CursoModal onClose={() => setShowNew(false)} />}
      {editTarget && <CursoModal initial={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          curso={deleteTarget}
          isPending={deleteMut.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
