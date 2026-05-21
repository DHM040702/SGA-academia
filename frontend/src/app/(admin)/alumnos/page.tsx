'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useAlumnos, useDeleteAlumno, type EstadoAlumno, type FilterAlumnos } from '@/hooks/use-alumnos'
import { useCiclos, useSecciones } from '@/hooks/use-ciclos'
import { cn } from '@/lib/utils'
import { Search, Plus, Upload, Scan, Filter, ChevR, ChevL, More, Eye, Edit, Trash } from '@/components/icons'

/* ── Constantes ────────────────────────────────────────────────── */
const ESTADO_TONE: Record<EstadoAlumno, 'success' | 'warning' | 'danger' | 'neutral'> = {
  activo: 'success', observado: 'warning', riesgo: 'danger', inactivo: 'neutral',
}

/* ── FilterSelect ──────────────────────────────────────────────── */
function FilterSelect({
  label, value, onChange, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { label: string; value: string }[]; disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-2 text-[12.5px] min-w-[120px]">
      <span className="text-text-mute">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="font-semibold flex-1 bg-transparent border-none outline-none cursor-pointer appearance-none font-sans text-[12.5px] text-text disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/* ── Pagination ─────────────────────────────────────────────────── */
function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = React.useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, '…', totalPages]
    if (page >= totalPages - 2) return [1, '…', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page - 1, page, page + 1, '…', totalPages]
  }, [page, totalPages])

  return (
    <div className="flex gap-1 items-center">
      <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ChevL size={14} />
      </Btn>
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={`e-${i}`} className="w-7 text-center text-[12px] text-text-mute">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'min-w-[28px] h-7 px-2 text-[12px] font-medium rounded-2 border-none cursor-pointer font-sans',
              p === page ? 'bg-primary-light text-primary font-semibold' : 'bg-transparent text-text hover:bg-surface2',
            )}
          >{p}</button>
        ),
      )}
      <Btn variant="ghost" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
        <ChevR size={14} />
      </Btn>
    </div>
  )
}

/* ── RowMenu ────────────────────────────────────────────────────── */
function RowMenu({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const router = useRouter()
  const deleteAlumno = useDeleteAlumno()

  function go(path: string) { router.push(path); onClose() }

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${name}? Esta acción aplica soft-delete.`)) return
    deleteAlumno.mutate(id, { onSuccess: onClose })
  }

  return (
    <div className="absolute right-0 top-8 z-50 bg-surface border border-border rounded-2 shadow-2 py-1 min-w-[150px]">
      <button
        onClick={() => go(`/alumnos/${id}`)}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
      >
        <Eye size={13} className="text-text-mute" />Ver detalle
      </button>
      <button
        onClick={() => go(`/alumnos/${id}/editar`)}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
      >
        <Edit size={13} className="text-text-mute" />Editar
      </button>
      <div className="border-t border-border-s my-1" />
      <button
        onClick={handleDelete}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] text-danger hover:bg-danger-light transition-colors border-none bg-transparent cursor-pointer font-sans"
      >
        <Trash size={13} />Eliminar
      </button>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function AlumnosPage() {
  const router = useRouter()
  const [filters, setFilters] = React.useState<FilterAlumnos>({ page: 1, limit: 20 })
  const [q, setQ] = React.useState('')
  const [estado, setEstado] = React.useState('')
  const [cicloId, setCicloId] = React.useState('')
  const [seccionId, setSeccionId] = React.useState('')
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)

  /* ── Cerrar menú al click fuera ── */
  React.useEffect(() => {
    if (!openMenu) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-row-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  /* ── Debounce búsqueda ── */
  React.useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: q || undefined, page: 1 })), 300)
    return () => clearTimeout(t)
  }, [q])

  /* ── Aplicar filtros ── */
  React.useEffect(() => {
    setFilters((f) => ({
      ...f,
      estado: (estado || undefined) as EstadoAlumno | undefined,
      ciclo_id: cicloId || undefined,
      seccion_id: seccionId || undefined,
      page: 1,
    }))
  }, [estado, cicloId, seccionId])

  /* ── Limpiar sección al cambiar ciclo ── */
  React.useEffect(() => { setSeccionId('') }, [cicloId])

  const { data, isLoading, isFetching } = useAlumnos(filters)
  const { data: ciclos = [] } = useCiclos()
  const { data: secciones = [] } = useSecciones(cicloId || undefined)

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const items = data?.data ?? []
  const page = filters.page ?? 1

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4">
      <PageHeader
        title="Alumnos"
        crumbs={['Administración', 'Alumnos']}
        action={
          <>
            <Btn variant="secondary" size="sm" onClick={() => alert('Importación Excel: próximamente')}>
              <Upload size={14} />Importar Excel
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => alert('Generación de carnets: próximamente')}>
              <Scan size={14} />Generar carnets
            </Btn>
            <Btn size="sm" onClick={() => router.push('/alumnos/nuevo')}>
              <Plus size={14} />Nuevo alumno
            </Btn>
          </>
        }
      />

      {/* ── Filter bar ── */}
      <div className="flex gap-2.5 items-center bg-surface border border-border rounded-3 px-3 py-3 shadow-1 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-[340px]">
          <Input
            icon={<Search size={14} />}
            placeholder="Buscar por nombre, código o DNI…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <FilterSelect
          label="Ciclo"
          value={cicloId}
          onChange={setCicloId}
          options={[
            { label: 'Todos', value: '' },
            ...ciclos.map((c) => ({ label: c.nombre, value: c.id })),
          ]}
        />
        <FilterSelect
          label="Sección"
          value={seccionId}
          onChange={setSeccionId}
          disabled={!cicloId}
          options={[
            { label: cicloId ? 'Todas' : 'Elige ciclo', value: '' },
            ...secciones.map((s) => ({ label: s.nombre, value: s.id })),
          ]}
        />
        <FilterSelect
          label="Estado"
          value={estado}
          onChange={setEstado}
          options={[
            { label: 'Todos', value: '' },
            { label: 'Activos', value: 'activo' },
            { label: 'Observados', value: 'observado' },
            { label: 'En riesgo', value: 'riesgo' },
          ]}
        />

        <div className="flex-1" />
        <span className={cn('text-[12px] text-text-mute transition-opacity', isFetching && 'opacity-40')}>
          {total} alumno{total !== 1 ? 's' : ''}
        </span>
        <Btn variant="ghost" size="sm"><Filter size={14} />Más filtros</Btn>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface border border-border rounded-3 shadow-1 overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface2 border-b border-border">
              {['Alumno', 'Código', 'DNI', 'Sección', 'Asistencia', 'Estado', ''].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-text-mute uppercase tracking-[0.05em] px-3.5 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-mute text-[13px]">Cargando alumnos…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-mute text-[13px]">
                  No se encontraron alumnos con los filtros actuales.
                </td>
              </tr>
            ) : (
              items.map((a, i) => {
                const name = `${a.nombres} ${a.apellidos}`
                const pct = a.asistencia_pct
                return (
                  <tr
                    key={a.id}
                    className={cn('hover:bg-surface2/50 cursor-pointer transition-colors', i > 0 && 'border-t border-border-s')}
                    onClick={() => router.push(`/alumnos/${a.id}`)}
                  >
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={name} size={32} />
                        <div>
                          <div className="font-semibold text-[13px] leading-tight">{name}</div>
                          <div className="text-[11.5px] text-text-mute">{a.usuario.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[12.5px] tracking-[0.05em]">{a.codigo_barra}</td>
                    <td className="px-3.5 py-3 font-mono text-[12px] text-text-mute">{a.dni}</td>
                    <td className="px-3.5 py-3">
                      {a.seccion ? (
                        <Pill tone="neutral">{a.seccion.nombre}</Pill>
                      ) : (
                        <span className="text-text-mute text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct < 70 ? 'var(--color-danger)' : pct < 85 ? 'var(--color-warning)' : 'var(--color-success)',
                            }}
                          />
                        </div>
                        <span className="font-mono text-[12px] font-semibold w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <Pill tone={ESTADO_TONE[a.estado]} className="inline-flex items-center gap-1 capitalize">
                        <Dot tone={ESTADO_TONE[a.estado]} size={6} />{a.estado}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block" data-row-menu>
                        <Btn
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                        >
                          <More size={15} />
                        </Btn>
                        {openMenu === a.id && (
                          <RowMenu id={a.id} name={name} onClose={() => setOpenMenu(null)} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="border-t border-border-s px-3.5 py-2.5 flex items-center justify-between bg-surface2">
          <div className="text-[12px] text-text-mute">
            Mostrando {items.length > 0 ? (page - 1) * (filters.limit ?? 20) + 1 : 0}–
            {Math.min(page * (filters.limit ?? 20), total)} de {total} alumnos
          </div>
          <Pagination
            page={page}
            totalPages={Math.max(totalPages, 1)}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      </div>
    </div>
  )
}
