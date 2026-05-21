'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import {
  Home, Users, Teacher, Grid, Calendar, Check,
  Megaphone, Book, Chart, LogOut,
} from '@/components/icons'

const NAV_ADMIN = [
  { href: '/inicio',      icon: Home,      label: 'Inicio' },
  { href: '/alumnos',     icon: Users,     label: 'Alumnos' },
  { href: '/docentes',    icon: Teacher,   label: 'Docentes' },
  { href: '/ciclos',      icon: Grid,      label: 'Ciclos y secciones' },
  { href: '/horarios',    icon: Calendar,  label: 'Horarios' },
  { href: '/asistencia',  icon: Check,     label: 'Asistencia' },
  { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
  { href: '/biblioteca',  icon: Book,      label: 'Biblioteca' },
  { href: '/reportes',    icon: Chart,     label: 'Reportes' },
]

const NAV_DIRECTOR = [
  { href: '/inicio',      icon: Home,      label: 'Inicio' },
  { href: '/horarios',    icon: Calendar,  label: 'Horarios' },
  { href: '/asistencia',  icon: Check,     label: 'Asistencia' },
  { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
  { href: '/reportes',    icon: Chart,     label: 'Reportes' },
]

interface SidebarProps { compact?: boolean }

export function Sidebar({ compact = false }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const nav = user?.rol === 'director' ? NAV_DIRECTOR : NAV_ADMIN
  const displayName = user
    ? user.docente
      ? `${user.docente.nombre} ${user.docente.apellidos}`
      : user.email.split('@')[0]
    : ''

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface border-r border-border overflow-hidden',
        compact ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center h-[60px] border-b border-border-s shrink-0',
          compact ? 'px-3 justify-center' : 'px-[18px]',
        )}
      >
        {compact ? (
          <span className="font-serif font-bold text-primary text-[20px]">S</span>
        ) : (
          <span className="font-serif font-bold text-primary text-[18px] tracking-tight leading-none">
            CEPREUNASAM<br />
            <span className="text-[11px] font-sans font-normal text-text-mute tracking-[0.08em] uppercase">
              Sistema de Gestión
            </span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto', compact ? 'p-2' : 'px-3 py-3.5')}>
        {!compact && (
          <div className="text-[10px] tracking-[0.1em] uppercase text-text-soft font-semibold px-2 pb-2 pt-1">
            {user?.rol === 'director' ? 'Dirección' : 'Administración'}
          </div>
        )}
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-2 mb-0.5 font-medium text-[13px] no-underline transition-colors',
                compact ? 'p-2 justify-center' : 'px-2.5 py-2',
                active
                  ? 'bg-primary-light text-primary font-semibold'
                  : 'text-text hover:bg-surface2',
              )}
            >
              <span className={cn('flex shrink-0', active ? 'text-primary' : 'text-text-mute')}>
                <Icon size={16} />
              </span>
              {!compact && <span className="flex-1 truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        className={cn(
          'flex items-center gap-2.5 border-t border-border-s bg-surface2',
          compact ? 'px-2 py-3 justify-center' : 'px-3.5 py-3',
        )}
      >
        <Avatar name={displayName} size={32} />
        {!compact && (
          <>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-[12.5px] font-semibold truncate">{displayName}</div>
              <div className="text-[11px] text-text-mute capitalize">{user?.rol}</div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1 text-text-mute hover:text-danger transition-colors cursor-pointer bg-transparent border-none"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
