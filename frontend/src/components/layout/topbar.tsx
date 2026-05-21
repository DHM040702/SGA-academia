'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Search, Bell } from '@/components/icons'

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
      {search && (
        <div className="flex-1 max-w-[480px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none flex">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar alumno, docente, curso, código..."
            className={cn(
              'w-full bg-surface2 border border-border-s rounded-2 pl-8 pr-3 py-1.5',
              'text-[13px] font-sans text-text placeholder:text-text-soft',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
            )}
          />
        </div>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative p-1.5 text-text-mute hover:text-text transition-colors bg-transparent border-none cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-danger rounded-full border-[1.5px] border-surface" />
        </button>

        <div className="w-px h-[22px] bg-border mx-1" />

        {/* Ciclo selector */}
        <span className="text-[12px] text-text-mute">Ciclo</span>
        <select
          defaultValue="2026-I"
          className={cn(
            'text-[12.5px] font-sans font-medium px-2.5 py-1.5 pr-7 border border-border rounded-2 bg-surface text-text',
            'focus:outline-none focus:border-primary appearance-none cursor-pointer',
            'bg-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M2 4l3 3 3-3\' fill=\'none\' stroke=\'%23666\' stroke-width=\'1.5\'/></svg>")] bg-no-repeat bg-[right_8px_center]',
          )}
        >
          <option>2026-I</option>
          <option>2025-II</option>
        </select>
      </div>
    </header>
  )
}
