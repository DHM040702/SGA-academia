'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { useAuth } from '@/contexts/auth-context'
import { CicloProvider } from '@/contexts/ciclo-context'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.debeCambiarPassword) router.replace('/cambiar-password')
  }, [user, loading, router])

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
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto bg-bg">
            {children}
          </main>
        </div>
      </div>
    </CicloProvider>
  )
}
