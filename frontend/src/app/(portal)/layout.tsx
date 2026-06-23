'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useActiveCiclo } from '@/hooks/use-ciclos'
import { cicloWeekInfo } from '@/contexts/ciclo-context'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Home, Calendar, Check, Book, Megaphone, Users, LogOut, Search, Bell } from '@/components/icons'
import { cn } from '@/lib/utils'

const NAV_ALUMNO = [
  { href: '/portal/inicio',      icon: Home,      label: 'Inicio' },
  { href: '/portal/horario',     icon: Calendar,  label: 'Mi horario' },
  { href: '/portal/asistencia',  icon: Check,     label: 'Mi asistencia' },
  { href: '/portal/biblioteca',  icon: Book,      label: 'Biblioteca' },
  { href: '/portal/comunicados', icon: Megaphone, label: 'Avisos' },
]

const NAV_APODERADO = [
  { href: '/portal/inicio',      icon: Home,      label: 'Inicio' },
  { href: '/portal/asistencia',  icon: Check,     label: 'Asistencia' },
  { href: '/portal/horario',     icon: Calendar,  label: 'Horario' },
  { href: '/portal/comunicados', icon: Megaphone, label: 'Avisos' },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const cicloActivo = useActiveCiclo()
  const cicloWeek   = cicloActivo
    ? cicloWeekInfo(cicloActivo.fechaInicio, cicloActivo.fechaFin)
    : null
  const cicloTag = cicloActivo && cicloWeek
    ? `Ciclo ${cicloActivo.nombre} · semana ${cicloWeek.week}`
    : cicloActivo?.nombre ?? ''

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.debeCambiarPassword) router.replace('/cambiar-password')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-text-mute text-sm">Cargando…</div>
      </div>
    )
  }

  if (!user) return null

  const isApoderado = user.rol === 'apoderado'
  const nav = isApoderado ? NAV_APODERADO : NAV_ALUMNO
  const alumno = user.alumno
  const apoderado = user.apoderado
  const displayName = alumno
    ? `${alumno.nombre} ${alumno.apellidos}`
    : apoderado
      ? `${apoderado.nombre} ${apoderado.apellidos}`
      : user.email.split('@')[0]

  const roleLabel = isApoderado ? 'Apoderado' : 'Alumno'

  return (
    <div
      className="w-screen h-screen overflow-hidden grid"
      style={{
        gridTemplateColumns: '240px minmax(0,1fr)',
        gridTemplateRows: '100%',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Sidebar */}
      <aside className="flex flex-col h-full bg-surface border-r border-border overflow-hidden">
        {/* Brand */}
        <div className="h-[60px] flex items-center px-[18px] border-b border-border-s">
          <span className="font-serif font-bold text-primary text-[17px] tracking-tight leading-tight">
            Centro Preuniversitario<br />
            <span className="text-[10.5px] font-sans font-normal text-text-mute tracking-[0.07em] uppercase">
              {isApoderado ? 'Portal del apoderado' : 'Portal del alumno'}
            </span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3.5">
          <div className="text-[10px] tracking-[0.1em] uppercase text-text-soft font-semibold px-2 pb-2 pt-1">
            {isApoderado ? 'Seguimiento' : 'Mi cuenta'}
          </div>
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-2 mb-0.5 font-medium text-[13px] no-underline transition-colors px-2.5 py-2',
                  active ? 'bg-primary-light text-primary font-semibold' : 'text-text hover:bg-surface2',
                )}
              >
                <span className={cn('flex shrink-0', active ? 'text-primary' : 'text-text-mute')}>
                  <Icon size={16} />
                </span>
                <span className="flex-1 truncate">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Mini carnet for alumno */}
        {!isApoderado && alumno && (
          <div className="px-3 py-3 border-t border-border-s">
            <div
              className="rounded-2 px-3 py-2.5 relative overflow-hidden"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <div className="text-[9px] tracking-[0.18em] opacity-80 uppercase">Mi código</div>
              <div className="font-mono text-[18px] font-semibold tracking-[0.18em] mt-1">
                {alumno.codigoBarras ?? '——'}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">
                {(alumno as any).aulaId ? 'Aula activa' : 'Sin aula'}
                {cicloActivo ? ` · ${cicloActivo.nombre}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* User footer */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-t border-border-s bg-surface2">
          <Avatar name={displayName} size={32} />
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[12.5px] font-semibold truncate">{displayName}</div>
            <div className="text-[11px] text-text-mute">{roleLabel}</div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1 text-text-mute hover:text-danger transition-colors cursor-pointer bg-transparent border-none"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <header
          className="h-[60px] border-b border-border bg-surface flex items-center gap-4 px-6 shrink-0"
        >
          <div className="flex-1 max-w-[380px] relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-soft flex">
              <Search size={14} />
            </span>
            <input
              placeholder="Buscar cursos, recursos, avisos…"
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-border-s rounded-2 bg-surface-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1" />
          {cicloTag && (
            <Pill tone="primary">
              <Dot tone="primary" size={6} />
              {cicloTag}
            </Pill>
          )}
          <button className="relative p-1.5 text-text-mute hover:text-text transition-colors bg-transparent border-none cursor-pointer">
            <Bell size={18} />
            <span
              className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger rounded-full"
              style={{ border: '1.5px solid var(--color-surface)' }}
            />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-bg">
          {children}
        </main>
      </div>
    </div>
  )
}
