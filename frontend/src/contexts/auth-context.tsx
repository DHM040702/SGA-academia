'use client'
import * as React from 'react'
import api from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  rol: 'admin' | 'director' | 'vigilante' | 'alumno' | 'apoderado'
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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  /* ── Hydrate on mount (token already in LS or cookie) ─── */
  React.useEffect(() => {
    api.get<AuthUser>('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    setUser(data.user)
  }, [])

  const logout = React.useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('access_token')
    setUser(null)
  }, [])

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
