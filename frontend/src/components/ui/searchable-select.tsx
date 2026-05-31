'use client'
/**
 * SearchableSelect — combobox con búsqueda en línea.
 * Se cierra con Escape, clic fuera, o al seleccionar.
 */
import * as React from 'react'
import { Search, X } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface SelectOption {
  id:    string
  label: string
  sub?:  string   // texto secundario (especialidad, turno, etc.)
}

interface Props {
  value:       string
  onChange:    (id: string) => void
  options:     SelectOption[]
  placeholder?: string
  loading?:    boolean
  required?:   boolean
  className?:  string
  disabled?:   boolean
}

export function SearchableSelect({
  value, onChange, options, placeholder = 'Buscar…',
  loading, required, className, disabled,
}: Props) {
  const [query,  setQuery]  = React.useState('')
  const [open,   setOpen]   = React.useState(false)
  const wrapRef  = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value)

  // Filtrar opciones
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    return q ? options.filter((o) =>
      o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q)
    ) : options
  }, [query, options])

  // Cerrar al hacer clic fuera
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cerrar con Escape
  React.useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  function close() { setOpen(false); setQuery('') }

  function openDropdown() {
    if (disabled) return
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  function select(id: string) {
    onChange(id)
    close()
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    close()
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {/* Trigger: muestra valor seleccionado o texto buscador */}
      <div
        role="combobox"
        aria-expanded={open}
        onClick={openDropdown}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-[13px] border rounded-2 bg-surface cursor-pointer select-none',
          'transition-colors',
          open
            ? 'border-primary ring-1 ring-primary/20'
            : 'border-border hover:border-primary/40',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {open ? (
          /* Input de búsqueda */
          <>
            <Search size={13} className="text-text-mute shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder:text-text-mute"
            />
          </>
        ) : (
          /* Valor seleccionado o placeholder */
          <>
            <span className={cn('flex-1 truncate', !selected && 'text-text-mute')}>
              {loading
                ? 'Cargando…'
                : selected
                  ? selected.label
                  : placeholder}
            </span>
            {selected && !required && (
              <button
                onClick={clear}
                className="text-text-mute hover:text-danger transition-colors shrink-0 bg-transparent border-none p-0 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
            {/* chevron */}
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className={cn('shrink-0 text-text-mute transition-transform', open && 'rotate-180')}
            >
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-surface border border-border rounded-2 shadow-3 max-h-[220px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-text-mute text-center">
              {query ? `Sin resultados para "${query}"` : 'Sin opciones disponibles'}
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                onClick={() => select(opt.id)}
                className={cn(
                  'w-full text-left px-3 py-2 text-[13px] hover:bg-surface2 transition-colors',
                  'border-none bg-transparent cursor-pointer flex items-start gap-2',
                  opt.id === value && 'bg-primary-light',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className={cn('font-medium truncate', opt.id === value && 'text-primary')}>
                    {opt.label}
                  </div>
                  {opt.sub && (
                    <div className="text-[11px] text-text-mute truncate">{opt.sub}</div>
                  )}
                </div>
                {opt.id === value && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary shrink-0 mt-0.5">
                    <path d="M2.5 7l3.5 3.5 5.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
