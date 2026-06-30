'use client'
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api, { setAccessToken } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  rol: 'admin' | 'director' | 'vigilante' | 'docente' | 'alumno' | 'apoderado'
  debeCambiarPassword?: boolean
  nombre?: string | null
  apellidos?: string | null
  dni?: string | null
  alumno?: {
    id: string
    nombre: string
    apellidos: string
    codigoBarras?: string | null
    aulaId?: string | null
    aula?: { area?: 'ciencias' | 'letras' | 'medicas' | null } | null
  } | null
  docente?: { id: string; nombre: string; apellidos: string } | null
  apoderado?: {
    id: string
    nombre: string
    apellidos: string
    alumnos?: {
      parentesco?: string
      esPrincipal?: boolean
      alumno: {
        id: string
        nombre: string
        apellidos: string
        codigoBarras?: string | null
        dni?: string | null
        aulaId?: string | null
        aula?: {
          nombre?: string | null
          area?: 'ciencias' | 'letras' | 'medicas' | null
          turno?: string | null
          ciclo?: { nombre: string; activo: boolean } | null
        } | null
      }
    }[]
  } | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (dni: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const queryClient = useQueryClient()

  /* ── Hidratar al montar ───────────────────────────────────
     El access token vive solo en memoria, así que tras una recarga
     se pierde. Si /auth/me falla, intentamos restaurar la sesión con
     el refresh token (cookie HttpOnly) antes de dar por cerrada la sesión. */
  React.useEffect(() => {
    async function hydrate() {
      try {
        const { data } = await api.get<AuthUser>('/auth/me')
        setUser(data)
      } catch {
        try {
          const { data: r } = await api.post<{ access_token: string }>('/auth/refresh')
          setAccessToken(r.access_token)
          const { data } = await api.get<AuthUser>('/auth/me')
          setUser(data)
        } catch {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }
    void hydrate()
  }, [])

  const login = React.useCallback(async (dni: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { dni, password })
    // Token en memoria — no en localStorage (evita robo por XSS)
    setAccessToken(data.access_token)
    // Limpiar caché al cambiar de usuario para evitar que datos de un rol
    // contaminen la vista de otro rol (ej: admin → alumno)
    queryClient.clear()
    setUser(data.user)
  }, [queryClient])

  const logout = React.useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setAccessToken(null)
    // Limpiar caché al cerrar sesión
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  // Re-obtiene el usuario actual (ej. tras cambiar la contraseña, para refrescar el flag)
  const refreshUser = React.useCallback(async () => {
    const { data } = await api.get<AuthUser>('/auth/me')
    setUser(data)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
