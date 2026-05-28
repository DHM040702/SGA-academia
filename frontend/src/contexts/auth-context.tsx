'use client'
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  rol: 'admin' | 'director' | 'vigilante' | 'docente' | 'alumno' | 'apoderado'
  nombre?: string | null
  apellidos?: string | null
  dni?: string | null
  alumno?: {
    id: string
    nombre: string
    apellidos: string
    codigoBarras?: string | null
    aulaId?: string | null
  } | null
  docente?: { id: string; nombre: string; apellidos: string } | null
  apoderado?: { id: string; nombre: string; apellidos: string } | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (dni: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const queryClient = useQueryClient()

  /* ── Hydrate on mount (token already in LS or cookie) ─── */
  React.useEffect(() => {
    api.get<AuthUser>('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = React.useCallback(async (dni: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { dni, password })
    localStorage.setItem('access_token', data.access_token)
    // Limpiar caché al cambiar de usuario para evitar que datos de un rol
    // contaminen la vista de otro rol (ej: admin → alumno)
    queryClient.clear()
    setUser(data.user)
  }, [queryClient])

  const logout = React.useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('access_token')
    // Limpiar caché al cerrar sesión
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
