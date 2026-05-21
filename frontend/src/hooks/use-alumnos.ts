import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

/* ─── Types ───────────────────────────────────────────────────── */
export type EstadoAlumno = 'activo' | 'observado' | 'riesgo' | 'inactivo'

export interface Alumno {
  id: string
  codigo_barra: string
  nombres: string
  apellidos: string
  dni: string
  telefono?: string | null
  fecha_nacimiento?: string | null
  seccion_id?: string | null
  created_at: string
  asistencia_pct: number
  estado: EstadoAlumno
  usuario: { email: string; activo: boolean; rol: string }
  seccion?: {
    id: string
    nombre: string
    ciclo: { id: string; nombre: string }
  } | null
}

export interface PaginatedAlumnos {
  data: Alumno[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FilterAlumnos {
  page?: number
  limit?: number
  q?: string
  ciclo_id?: string
  seccion_id?: string
  estado?: EstadoAlumno
}

/* ─── Hooks ───────────────────────────────────────────────────── */
export function useAlumnos(filters: FilterAlumnos = {}) {
  return useQuery<PaginatedAlumnos>({
    queryKey: ['alumnos', filters],
    queryFn: async () => {
      const { data } = await api.get('/alumnos', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useAlumno(id: string) {
  return useQuery<Alumno>({
    queryKey: ['alumnos', id],
    queryFn: async () => {
      const { data } = await api.get(`/alumnos/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCreateAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/alumnos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

export function useUpdateAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/alumnos/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

export function useDeleteAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/alumnos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}
