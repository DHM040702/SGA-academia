'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Search, Bell, Users, Teacher, Layers, ChevD } from '@/components/icons'
import api from '@/lib/api'
import { useCicloCtx } from '@/contexts/ciclo-context'

/* ─── tipos de resultado ─────────────────────────────────────────── */
interface AlumnoResult {
  id: string
  nombre: string
  apellidos: string
  codigoBarras: string
  dni?: string
  aula?: { nombre: string } | null
}

interface DocenteResult {
  id: string
  nombre: string
  apellidos: string
  dni: string
}

interface CursoResult {
  id: string
  nombre: string
  codigo: string
  _count?: { horarios: number }
}

/* ─── SearchBox ──────────────────────────────────────────────────── */
function SearchBox() {
  const router = useRouter()
  const [q, setQ]           = React.useState('')
  const [debQ, setDebQ]     = React.useState('')
  const [open, setOpen]     = React.useState(false)
  const wrapRef             = React.useRef<HTMLDivElement>(null)
  const inputRef            = React.useRef<HTMLInputElement>(null)

  /* debounce 300 ms */
  React.useEffect(() => {
    const t = setTimeout(() => setDebQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  /* abrir/cerrar dropdown según query */
  React.useEffect(() => {
    setOpen(debQ.length >= 2)
  }, [debQ])

  /* cerrar al hacer clic fuera */
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const enabled = debQ.length >= 2

  /* queries paralelas */
  const { data: alumnosPage, isFetching: fAlumnos } = useQuery({
    queryKey: ['search', 'alumnos', debQ],
    queryFn: () =>
      api.get('/alumnos', { params: { q: debQ, limit: 5 } }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })

  const { data: docentesPage, isFetching: fDocentes } = useQuery({
    queryKey: ['search', 'docentes', debQ],
    queryFn: () =>
      api.get('/docentes', { params: { q: debQ, limit: 5 } }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })

  const { data: cursosRaw, isFetching: fCursos } = useQuery({
    queryKey: ['search', 'cursos', debQ],
    queryFn: () =>
      api.get('/cursos').then((r) => {
        const list: CursoResult[] = r.data?.data ?? r.data ?? []
        const term = debQ.toLowerCase()
        return list
          .filter((c) => c.nombre.toLowerCase().includes(term) || c.codigo.toLowerCase().includes(term))
          .slice(0, 5)
      }),
    enabled,
    staleTime: 60_000,
  })

  const alumnos: AlumnoResult[]   = alumnosPage?.data ?? []
  const docentes: DocenteResult[] = docentesPage?.data ?? []
  const cursos: CursoResult[]     = cursosRaw ?? []
  const isFetching = fAlumnos || fDocentes || fCursos
  const hasResults = alumnos.length > 0 || docentes.length > 0 || cursos.length > 0

  function navigate(href: string) {
    setOpen(false)
    setQ('')
    router.push(href)
  }

  function initials(nombre: string, apellidos: string) {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()
  }

  return (
    <div ref={wrapRef} className="flex-1 max-w-[480px] relative">
      {/* Input */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none flex">
        <Search size={14} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (debQ.length >= 2) setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); setQ('') }
        }}
        placeholder="Buscar alumno, docente, código..."
        className={cn(
          'w-full bg-surface2 border border-border-s rounded-2 pl-8 pr-3 py-1.5',
          'text-[13px] font-sans text-text placeholder:text-text-soft',
          'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
          open && 'border-primary ring-1 ring-primary/20',
        )}
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-surface border border-border rounded-3 shadow-3 z-50 overflow-hidden max-h-[440px] overflow-y-auto">

          {/* Cargando */}
          {isFetching && !hasResults && (
            <div className="py-5 text-center text-[12.5px] text-text-mute">
              Buscando…
            </div>
          )}

          {/* Sin resultados */}
          {!isFetching && !hasResults && (
            <div className="py-7 text-center">
              <div className="text-[22px] mb-1">🔍</div>
              <div className="text-[12.5px] text-text-mute">
                Sin resultados para <span className="font-semibold text-text">"{debQ}"</span>
              </div>
            </div>
          )}

          {/* Alumnos */}
          {alumnos.length > 0 && (
            <div>
              <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-text-soft uppercase tracking-[0.07em]">
                <Users size={11} /> Alumnos
                <span className="ml-auto font-normal normal-case tracking-normal text-text-soft">
                  {alumnosPage?.total > 5 ? `${alumnosPage.total} resultados` : ''}
                </span>
              </div>
              {alumnos.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/alumnos/${a.id}`)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-surface2 flex items-center gap-3 bg-transparent border-none cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-[11px] font-bold shrink-0 select-none">
                    {initials(a.nombre, a.apellidos)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-text truncate">
                      {a.nombre} {a.apellidos}
                    </div>
                    <div className="text-[11px] text-text-mute font-mono">
                      {a.codigoBarras}
                      {a.aula ? ` · ${a.aula.nombre}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Separador */}
          {alumnos.length > 0 && docentes.length > 0 && (
            <div className="h-px bg-border-s mx-3 my-1" />
          )}

          {/* Docentes */}
          {docentes.length > 0 && (
            <div>
              <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-text-soft uppercase tracking-[0.07em]">
                <Teacher size={11} /> Docentes
                <span className="ml-auto font-normal normal-case tracking-normal text-text-soft">
                  {docentesPage?.total > 5 ? `${docentesPage.total} resultados` : ''}
                </span>
              </div>
              {docentes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/docentes/${d.id}`)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-surface2 flex items-center gap-3 bg-transparent border-none cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-success-light flex items-center justify-center text-success text-[11px] font-bold shrink-0 select-none">
                    {initials(d.nombre, d.apellidos)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-text truncate">
                      {d.nombre} {d.apellidos}
                    </div>
                    <div className="text-[11px] text-text-mute font-mono">
                      DNI {d.dni}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Separador */}
          {(alumnos.length > 0 || docentes.length > 0) && cursos.length > 0 && (
            <div className="h-px bg-border-s mx-3 my-1" />
          )}

          {/* Cursos */}
          {cursos.length > 0 && (
            <div>
              <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-text-soft uppercase tracking-[0.07em]">
                <Layers size={11} /> Cursos
              </div>
              {cursos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/cursos/${c.id}`)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-surface2 flex items-center gap-3 bg-transparent border-none cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded bg-primary-light flex items-center justify-center text-primary text-[10px] font-bold shrink-0 select-none font-mono">
                    {c.codigo.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-text truncate">{c.nombre}</div>
                    <div className="text-[11px] text-text-mute font-mono">
                      {c.codigo} · {c._count?.horarios ?? 0} horario{(c._count?.horarios ?? 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          {hasResults && (
            <div className="px-3.5 py-2.5 border-t border-border-s bg-surface2/60 flex gap-3 flex-wrap">
              {alumnos.length > 0 && (
                <button
                  onClick={() => navigate(`/alumnos?q=${encodeURIComponent(debQ)}`)}
                  className="text-[12px] text-primary font-medium bg-transparent border-none cursor-pointer hover:underline"
                >
                  Ver alumnos →
                </button>
              )}
              {docentes.length > 0 && (
                <button
                  onClick={() => navigate(`/docentes`)}
                  className="text-[12px] text-primary font-medium bg-transparent border-none cursor-pointer hover:underline"
                >
                  Ver docentes →
                </button>
              )}
              {cursos.length > 0 && (
                <button
                  onClick={() => navigate(`/cursos`)}
                  className="text-[12px] text-primary font-medium bg-transparent border-none cursor-pointer hover:underline"
                >
                  Ver cursos →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── CicloSelector ──────────────────────────────────────────────── */
function CicloSelector() {
  const { ciclos, selectedCiclo, setSelectedId, loading } = useCicloCtx()

  if (loading) {
    return (
      <div className="h-7 w-[90px] rounded-2 bg-surface2 animate-pulse" />
    )
  }

  if (ciclos.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[12px] text-text-mute select-none">Ciclo</span>
      <div className="relative">
        <select
          value={selectedCiclo?.id ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedId(e.target.value)}
          className={cn(
            'text-[12.5px] font-sans font-semibold pl-2.5 py-1.5 pr-6 border border-border rounded-2',
            'bg-surface text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
            'appearance-none cursor-pointer transition-colors hover:border-primary/40',
          )}
        >
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
              {c.activo ? ' ✓' : ''}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-text-mute">
          <ChevD size={10} />
        </span>
      </div>
    </div>
  )
}

/* ─── TopBar ─────────────────────────────────────────────────────── */
interface TopBarProps {
  search?: boolean
  className?: string
}

export function TopBar({ search = true, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'h-[60px] border-b border-border bg-surface flex items-center gap-4 px-[22px] shrink-0',
        className,
      )}
    >
      {search && <SearchBox />}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Campana de notificaciones */}
        <button className="relative p-1.5 text-text-mute hover:text-text transition-colors bg-transparent border-none cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-danger rounded-full border-[1.5px] border-surface" />
        </button>

        <div className="w-px h-[22px] bg-border mx-1" />

        {/* Selector de ciclo — datos reales */}
        <CicloSelector />
      </div>
    </header>
  )
}
