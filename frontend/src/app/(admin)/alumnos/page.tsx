'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ImportExcelModal } from '@/components/alumnos/import-excel-modal'
import { ImportSemestreModal } from '@/components/alumnos/import-semestre-modal'
import { ImportFotosModal } from '@/components/alumnos/import-fotos-modal'
import { useAlumnos, useDeleteAlumno, useRestoreAlumno, type EstadoAlumno, type FilterAlumnos } from '@/hooks/use-alumnos'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { useCicloCtx } from '@/contexts/ciclo-context'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { Search, Plus, Upload, Scan, Filter, ChevR, ChevL, ChevD, More, Eye, Edit, Trash, RefreshCw, FileText, Grid, Users } from '@/components/icons'

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
function RowMenu({ id, name, onClose, readOnly, inactive, canRestore }: {
  id: string; name: string; onClose: () => void
  readOnly?: boolean; inactive?: boolean; canRestore?: boolean
}) {
  const router = useRouter()
  const deleteAlumno = useDeleteAlumno()
  const restoreAlumno = useRestoreAlumno()

  function go(path: string) { router.push(path); onClose() }

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${name}? Esta acción aplica soft-delete.`)) return
    deleteAlumno.mutate(id, { onSuccess: onClose })
  }

  function handleRestore() {
    if (!confirm(`¿Reactivar a ${name}? Se restaurará el alumno y su cuenta de acceso.`)) return
    restoreAlumno.mutate(id, { onSuccess: onClose })
  }

  // Fila de un alumno dado de baja: solo el admin puede reactivarlo.
  if (inactive) {
    return (
      <div className="absolute right-0 top-8 z-50 bg-surface border border-border rounded-2 shadow-2 py-1 min-w-[150px]">
        {canRestore ? (
          <button
            onClick={handleRestore}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] text-success hover:bg-success-light transition-colors border-none bg-transparent cursor-pointer font-sans"
          >
            <RefreshCw size={13} />Reactivar alumno
          </button>
        ) : (
          <div className="px-3 py-2 text-[12px] text-text-mute">Sin acciones disponibles</div>
        )}
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-8 z-50 bg-surface border border-border rounded-2 shadow-2 py-1 min-w-[150px]">
      <button
        onClick={() => go(`/alumnos/${id}`)}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
      >
        <Eye size={13} className="text-text-mute" />Ver detalle
      </button>
      {!readOnly && (
        <>
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
        </>
      )}
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function AlumnosPage() {
  const router = useRouter()
  const { user } = useAuth()
  // Auxiliar y director tienen acceso de solo lectura (sin crear/editar/eliminar)
  const readOnly = user?.rol === 'auxiliar' || user?.rol === 'director'
  // Solo el admin ve/gestiona alumnos inactivos (dados de baja) para reactivarlos.
  const isAdmin = user?.rol === 'admin'
  const [filters, setFilters] = React.useState<FilterAlumnos>({ page: 1, limit: 20 })
  const [q, setQ] = React.useState('')
  const [estado, setEstado] = React.useState('')
  const [cicloId, setCicloId] = React.useState('')
  const [aulaId, setAulaId] = React.useState('')
  const [turno, setTurno] = React.useState('')
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)
  const [showImport, setShowImport] = React.useState(false)
  const [showImportSemestre, setShowImportSemestre] = React.useState(false)
  const [showImportFotos, setShowImportFotos] = React.useState(false)
  const [importMenu, setImportMenu] = React.useState(false)

  /* ── Cerrar menú al click fuera ── */
  React.useEffect(() => {
    if (!openMenu) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-row-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  /* ── Cerrar menú "Importar" al click fuera ── */
  React.useEffect(() => {
    if (!importMenu) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-import-menu]')) setImportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [importMenu])

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
      aula_id: aulaId || undefined,
      page: 1,
    }))
  }, [estado, cicloId, aulaId])

  /* ── Limpiar aula al cambiar turno ── */
  React.useEffect(() => { setAulaId('') }, [turno])

  /* ── Limpiar sección al cambiar ciclo ── */
  React.useEffect(() => { setAulaId('') }, [cicloId])

  const { data, isLoading, isFetching } = useAlumnos(filters)
  const { data: ciclos = [] } = useCiclos()
  const { data: secciones = [] } = useAulas(cicloId || undefined)
  const { selectedCiclo } = useCicloCtx()

  /* ── Seguir al ciclo del selector global (el dropdown local puede afinar) ── */
  React.useEffect(() => {
    if (selectedCiclo?.id) setCicloId(selectedCiclo.id)
  }, [selectedCiclo?.id])

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const rawItems = data?.data ?? []
  // Client-side turno filter (server doesn't support turno param yet)
  const items = turno
    ? rawItems.filter((a) => a.aula?.turno === turno)
    : rawItems
  // Aulas filtered by selected turno
  const aulasFiltradas = turno ? secciones.filter((s) => s.turno === turno) : secciones
  const page = filters.page ?? 1

  return (
    <div className="px-4 md:px-7 pt-4 md:pt-[22px] pb-7 flex flex-col gap-4">
      <PageHeader
        title="Alumnos"
        crumbs={['Administración', 'Alumnos']}
        action={!readOnly ? (
          <>
            {/* Menú de importaciones */}
            <div className="relative inline-block" data-import-menu>
              <Btn variant="secondary" size="sm" onClick={() => setImportMenu((v) => !v)}>
                <Upload size={14} />Importar<ChevD size={13} />
              </Btn>
              {importMenu && (
                <div className="absolute right-0 top-9 z-50 bg-surface border border-border rounded-2 shadow-2 py-1 min-w-[230px]">
                  <button
                    onClick={() => { setImportMenu(false); setShowImportSemestre(true) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
                  >
                    <FileText size={13} className="text-text-mute" />Matrícula del semestre (CSV)
                  </button>
                  <button
                    onClick={() => { setImportMenu(false); setShowImportFotos(true) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
                  >
                    <Users size={13} className="text-text-mute" />Fotos de alumnos (ZIP o RAR)
                  </button>
                  <div className="border-t border-border-s my-1" />
                  <button
                    onClick={() => { setImportMenu(false); setShowImport(true) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
                  >
                    <Grid size={13} className="text-text-mute" />Alumnos desde Excel
                  </button>
                </div>
              )}
            </div>
            <Btn variant="secondary" size="sm" onClick={() => router.push('/carnets')}>
              <Scan size={14} />Generar carnets
            </Btn>
            <Btn size="sm" onClick={() => router.push('/alumnos/nuevo')}>
              <Plus size={14} />Nuevo alumno
            </Btn>
          </>
        ) : undefined}
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
          label="Aula"
          value={aulaId}
          onChange={setAulaId}
          disabled={!cicloId}
          options={[
            { label: cicloId ? 'Todas' : 'Elige ciclo', value: '' },
            ...aulasFiltradas.map((s) => ({ label: s.nombre, value: s.id })),
          ]}
        />
        <FilterSelect
          label="Turno"
          value={turno}
          onChange={setTurno}
          options={[
            { label: 'Todos', value: '' },
            { label: 'Mañana', value: 'manana' },
            { label: 'Tarde', value: 'tarde' },
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
            // Solo el admin puede ver/reactivar alumnos dados de baja
            ...(isAdmin ? [{ label: 'Inactivos (baja)', value: 'inactivo' }] : []),
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
              {['Alumno', 'Código', 'DNI', 'Sección / Turno', 'Asistencia', 'Estado', ''].map((h) => (
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
                const inactive = a.estado === 'inactivo'
                return (
                  <tr
                    key={a.id}
                    className={cn(
                      'hover:bg-surface2/50 transition-colors',
                      i > 0 && 'border-t border-border-s',
                      inactive ? 'opacity-60' : 'cursor-pointer',
                    )}
                    onClick={() => { if (!inactive) router.push(`/alumnos/${a.id}`) }}
                  >
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={name} size={32} src={a.fotoUrl ?? a.foto_url ?? undefined} />
                        <div>
                          <div className="font-semibold text-[13px] leading-tight">{name}</div>
                          <div className="text-[11.5px] text-text-mute">{a.usuario.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[12.5px] tracking-[0.05em]">{a.codigo_barra}</td>
                    <td className="px-3.5 py-3 font-mono text-[12px] text-text-mute">{a.dni}</td>
                    <td className="px-3.5 py-3">
                      {a.aula ? (
                        <div className="flex items-center gap-1.5">
                          <Pill tone="neutral">{a.aula.nombre}</Pill>
                          <Pill tone={a.aula.turno === 'manana' ? 'success' : 'warning'} className="text-[10.5px]">
                            {a.aula.turno === 'manana' ? 'Mañana' : 'Tarde'}
                          </Pill>
                        </div>
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
                          <RowMenu id={a.id} name={name} onClose={() => setOpenMenu(null)} readOnly={readOnly} inactive={inactive} canRestore={isAdmin} />
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

      {showImport && (
        <ImportExcelModal onClose={() => setShowImport(false)} />
      )}

      {showImportSemestre && (
        <ImportSemestreModal onClose={() => setShowImportSemestre(false)} />
      )}

      {showImportFotos && (
        <ImportFotosModal onClose={() => setShowImportFotos(false)} />
      )}
    </div>
  )
}
