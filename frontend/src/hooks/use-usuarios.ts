import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type RolUsuario = 'admin' | 'director' | 'auxiliar' | 'alumno' | 'apoderado' | 'docente'

export interface UsuarioRecord {
  id: string
  email: string
  rol: RolUsuario
  /** Nombre propio del usuario */
  nombre?: string | null
  /** Apellidos del usuario */
  apellidos?: string | null
  /** DNI de acceso al sistema */
  dni?: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  alumno?:    { id: string; nombre: string; apellidos: string } | null
  docente?:   { id: string; nombre: string; apellidos: string } | null
  apoderado?: { id: string; nombre: string; apellidos: string } | null
}

export interface UsuariosPage {
  data: UsuarioRecord[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  admin:      'Administrador',
  director:   'Director',
  auxiliar:  'Auxiliar',
  docente:    'Docente',
  alumno:     'Alumno',
  apoderado:  'Apoderado',
}

export const ROL_TONES: Record<RolUsuario, string> = {
  admin:     'danger',
  director:  'primary',
  auxiliar: 'warning',
  docente:   'info',
  alumno:    'success',
  apoderado: 'neutral',
}

interface FilterUsuarios {
  page?: number
  limit?: number
  rol?: string
  search?: string
}

export function useUsuarios(filters: FilterUsuarios = {}) {
  return useQuery<UsuariosPage>({
    queryKey: ['usuarios', filters],
    queryFn: () =>
      api.get('/usuarios', { params: filters }).then((r) => r.data),
  })
}

export function useUsuario(id: string) {
  return useQuery<UsuarioRecord>({
    queryKey: ['usuarios', id],
    queryFn: () => api.get(`/usuarios/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { email: string; password: string; rol: string; activo?: boolean }) =>
      api.post('/usuarios', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/usuarios/${id}`, dto).then((r) => r.data),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios', id] })
    },
  })
}

export function useDeleteUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/usuarios/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

/** Restablece la contraseña de un usuario a su DNI (solo admin). */
export function useResetPasswordUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/usuarios/${id}/reset-password`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}
