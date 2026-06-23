'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import {
  Home, Users, Teacher, Grid, Calendar, Check,
  Megaphone, Book, Chart, LogOut, Layers, ScanLine,
  Clock, Shield, CreditCard, FileText,
} from '@/components/icons'

/* ─── Tipos ────────────────────────────────────────────────── */
type IC = React.FC<{ size?: number; className?: string }>

interface NavItem  { href: string; icon: IC; label: string }
interface NavGroup { label?: string; items: NavItem[] }

/* ─── Definición de grupos por rol ────────────────────────── */
const GROUPS_ADMIN: NavGroup[] = [
  {
    items: [{ href: '/inicio', icon: Home, label: 'Inicio' }],
  },
  {
    label: 'Académico',
    items: [
      { href: '/alumnos',  icon: Users,    label: 'Alumnos' },
      { href: '/docentes', icon: Teacher,  label: 'Docentes' },
      { href: '/ciclos',   icon: Grid,     label: 'Ciclos y aulas' },
      { href: '/cursos',   icon: Layers,   label: 'Cursos' },
      { href: '/horarios', icon: Calendar, label: 'Horarios' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/asistencia', icon: Check,      label: 'Asistencia' },
      { href: '/carnets',    icon: CreditCard, label: 'Carnets' },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
      { href: '/biblioteca',  icon: Book,      label: 'Biblioteca' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { href: '/reportes',  icon: Chart,    label: 'Reportes' },
      { href: '/turnos',    icon: Clock,    label: 'Turnos' },
      { href: '/usuarios',  icon: Shield,   label: 'Usuarios' },
      { href: '/auditoria', icon: FileText, label: 'Auditoría' },
    ],
  },
]

const GROUPS_DIRECTOR: NavGroup[] = [
  {
    items: [{ href: '/inicio', icon: Home, label: 'Inicio' }],
  },
  {
    label: 'Académico',
    items: [
      { href: '/horarios', icon: Calendar, label: 'Horarios' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/asistencia', icon: Check,      label: 'Asistencia' },
      { href: '/carnets',    icon: CreditCard, label: 'Carnets' },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { href: '/reportes',  icon: Chart,    label: 'Reportes' },
      { href: '/turnos',    icon: Clock,    label: 'Turnos' },
      { href: '/auditoria', icon: FileText, label: 'Auditoría' },
    ],
  },
]

const GROUPS_VIGILANTE: NavGroup[] = [
  {
    items: [{ href: '/inicio', icon: Home, label: 'Inicio' }],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/vigilante',  icon: ScanLine, label: 'Registro asistencia' },
      { href: '/asistencia', icon: Check,    label: 'Asistencia' },
    ],
  },
  {
    label: 'Consulta',
    items: [
      { href: '/alumnos',  icon: Users,    label: 'Alumnos' },
      { href: '/docentes', icon: Teacher,  label: 'Docentes' },
      { href: '/horarios', icon: Calendar, label: 'Horarios' },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
    ],
  },
]

const GROUPS_DOCENTE: NavGroup[] = [
  {
    items: [{ href: '/inicio', icon: Home, label: 'Inicio' }],
  },
  {
    label: 'Mi espacio',
    items: [
      { href: '/horarios',   icon: Calendar, label: 'Mi horario' },
      { href: '/asistencia', icon: Check,    label: 'Mi asistencia' },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
      { href: '/biblioteca',  icon: Book,      label: 'Biblioteca' },
    ],
  },
]

/* ─── Sidebar ──────────────────────────────────────────────── */
interface SidebarProps { compact?: boolean }

export function Sidebar({ compact = false }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const groups: NavGroup[] =
    user?.rol === 'director'  ? GROUPS_DIRECTOR
    : user?.rol === 'vigilante' ? GROUPS_VIGILANTE
    : user?.rol === 'docente'   ? GROUPS_DOCENTE
    : GROUPS_ADMIN

  const displayName = user
    ? (user.docente
        ? `${user.docente.nombre} ${user.docente.apellidos}`
        : user.nombre
          ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}`
          : user.email.split('@')[0])
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
            Centro Preuniversitario<br />
            <span className="text-[11px] font-sans font-normal text-text-mute tracking-[0.08em] uppercase">
              Sistema de Gestión
            </span>
          </span>
        )}
      </div>

      {/* Nav con subgrupos */}
      <nav className={cn('flex-1 overflow-y-auto', compact ? 'p-2' : 'px-3 py-2')}>
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {/* Etiqueta del grupo */}
            {!compact && group.label && (
              <div className="text-[10px] tracking-[0.1em] uppercase text-text-soft font-semibold px-2 pt-3 pb-1.5">
                {group.label}
              </div>
            )}
            {/* Items del grupo */}
            {group.items.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-2 mb-0.5 font-medium text-[13px] no-underline transition-colors',
                    compact ? 'p-2 justify-center' : 'px-2.5 py-[7px]',
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
          </div>
        ))}
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
