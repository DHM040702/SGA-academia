'use client'
import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { useAuth } from '@/contexts/auth-context'
import { CicloProvider } from '@/contexts/ciclo-context'
import { cn } from '@/lib/utils'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [navOpen, setNavOpen] = React.useState(false)

  React.useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.debeCambiarPassword) router.replace('/cambiar-password')
  }, [user, loading, router])

  // Cerrar el menú móvil al navegar
  React.useEffect(() => { setNavOpen(false) }, [pathname])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="text-text-mute text-[13px]">Cargando…</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <CicloProvider>
      <div className="h-full flex overflow-hidden">
        {/* Backdrop móvil */}
        {navOpen && (
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* Sidebar — drawer en móvil, fijo en escritorio */}
        <div
          className={cn(
            'z-50 shrink-0 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:transition-transform max-md:duration-200',
            navOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          )}
        >
          <Sidebar />
        </div>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar onMenuClick={() => setNavOpen(true)} />
          <main className="flex-1 overflow-auto bg-bg">
            {children}
          </main>
        </div>
      </div>
    </CicloProvider>
  )
}
