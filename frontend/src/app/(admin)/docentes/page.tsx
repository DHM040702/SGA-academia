'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useDocentes, useDeleteDocente } from '@/hooks/use-docentes'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { KPI } from '@/components/ui/kpi'
import { Btn } from '@/components/ui/btn'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { Search, Plus, Download, More, Eye, Edit, Trash, ChevL, ChevR } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

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
function RowMenu({ id, name, onClose, readOnly }: { id: string; name: string; onClose: () => void; readOnly?: boolean }) {
  const router = useRouter()
  const deleteDocente = useDeleteDocente()

  function go(path: string) { router.push(path); onClose() }

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${name}? Esta acción aplica soft-delete.`)) return
    deleteDocente.mutate(id, { onSuccess: onClose })
  }

  return (
    <div className="absolute right-0 top-8 z-50 bg-surface border border-border rounded-2 shadow-2 py-1 min-w-[150px]">
      <button
        onClick={() => go(`/docentes/${id}`)}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-surface2 transition-colors border-none bg-transparent cursor-pointer font-sans"
      >
        <Eye size={13} className="text-text-mute" />Ver detalle
      </button>
      {!readOnly && (
        <>
          <button
            onClick={() => go(`/docentes/${id}/editar`)}
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
export default function DocentesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAuxiliar = user?.rol === 'auxiliar'
  const [q, setQ] = React.useState('')
  const [debouncedQ, setDebouncedQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    if (!openMenu) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-row-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  const { data: docentesResult, isLoading, isFetching } = useDocentes({ q: debouncedQ || undefined, page, limit: 20 })
  const docentes = docentesResult?.data ?? []
  const total = docentesResult?.total ?? 0
  const totalPages = docentesResult?.totalPages ?? 1

  return (
    <>
      <PageHeader
        title="Docentes"
        crumbs={['Administración', 'Docentes']}
        action={!isAuxiliar ? (
          <>
            <Btn variant="secondary" size="sm" onClick={() => router.push('/reportes')}>
              <Download size={14} />Reporte asistencia
            </Btn>
            <Btn size="sm" onClick={() => router.push('/docentes/nuevo')}>
              <Plus size={14} />Nuevo docente
            </Btn>
          </>
        ) : undefined}
      />

      <div className="p-4 md:p-7 flex flex-col gap-3.5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <KPI label="Docentes activos" value={total} sub="en plantilla" accent="var(--color-primary)" />
          <KPI label="Puntualidad media" value="97%" trend={1} accent="var(--color-success)" />
          <KPI label="Asistencia ciclo" value="98%" accent="var(--color-primary)" />
          <KPI label="Cursos cubiertos" value="12/12" accent="var(--color-success)" />
        </div>

        {/* Toolbar */}
        <div className="flex gap-2.5 items-center bg-surface border border-border rounded-3 p-3 shadow-1">
          <div className="flex-1 max-w-[340px]">
            <Input
              icon={<Search size={14} />}
              placeholder="Buscar docente, curso o DNI…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex-1" />
          <span className={cn('text-[12px] text-text-mute transition-opacity', isFetching && 'opacity-40')}>
            {total} docente{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded-3 shadow-1 overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface2 border-b border-border">
                {['Docente', 'DNI / código asistencia', 'Curso', 'Secciones', 'Asistencia ciclo', 'Última marca', ''].map((h) => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.05em] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-mute text-[13px]">Cargando docentes…</td>
                </tr>
              ) : docentes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-mute text-[13px]">
                    No se encontraron docentes con los filtros actuales.
                  </td>
                </tr>
              ) : (
                docentes.map((d, i) => {
                  const name = `${d.nombre} ${d.apellidos}`
                  const asistPct = d.asistencia_pct ?? 98
                  const cursos = d.horarios?.map((h) => h.curso.nombre) ?? []
                  const uniqueCursos = [...new Set(cursos)]
                  const secciones = d.horarios?.map((h) => h.aula?.nombre ?? '—') ?? []
                  const uniqueSecciones = [...new Set(secciones)]

                  return (
                    <tr
                      key={d.id}
                      className={cn('hover:bg-surface2/50 cursor-pointer transition-colors', i > 0 && 'border-t border-border-s')}
                      onClick={() => router.push(`/docentes/${d.id}`)}
                    >
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} size={32} />
                          <div>
                            <div className="font-semibold text-[13px] leading-tight">{name}</div>
                            <div className="text-[11.5px] text-text-mute">{d.usuario?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-mono text-[12.5px]">{d.dni}</div>
                        <div className="text-[11px] text-text-mute font-mono">DNI = código de asistencia</div>
                      </td>
                      <td className="px-3.5 py-3">
                        {uniqueCursos.length > 0
                          ? uniqueCursos.map((c) => <Pill key={c} tone="primary" className="mr-1">{c}</Pill>)
                          : <span className="text-text-mute text-[12px]">—</span>
                        }
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[12.5px]">
                        {uniqueSecciones.length > 0 ? uniqueSecciones.join(', ') : '—'}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-surface3 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${asistPct}%`,
                                background: asistPct < 95 ? 'var(--color-warning)' : 'var(--color-success)',
                              }}
                            />
                          </div>
                          <span className="font-mono text-[12px] font-semibold w-8">{asistPct}%</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[12px] text-text-mute">
                        {d.ultima_marca ?? '—'}
                      </td>
                      <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block" data-row-menu>
                          <Btn
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => setOpenMenu(openMenu === d.id ? null : d.id)}
                          >
                            <More size={15} />
                          </Btn>
                          {openMenu === d.id && (
                            <RowMenu id={d.id} name={name} onClose={() => setOpenMenu(null)} readOnly={isAuxiliar} />
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
              Mostrando {docentes.length > 0 ? (page - 1) * 20 + 1 : 0}–
              {Math.min(page * 20, total)} de {total} docentes
            </div>
            <Pagination
              page={page}
              totalPages={Math.max(totalPages, 1)}
              onPage={setPage}
            />
          </div>
        </div>
      </div>
    </>
  )
}
