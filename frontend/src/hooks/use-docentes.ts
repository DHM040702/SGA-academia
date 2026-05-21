import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface DocenteHorario {
  id: string
  curso: { id: string; nombre: string; codigo: string }
  seccion: { id: string; nombre: string }
}

export interface Docente {
  id: string
  dni: string
  nombre: string
  apellidos: string
  especialidad?: string | null
  telefonoWhatsapp?: string | null
  fotoUrl?: string | null
  createdAt: string
  deletedAt?: string | null
  usuario: { id: string; email: string; activo: boolean }
  horarios?: DocenteHorario[]
  asistencia_pct?: number
  ultima_marca?: string | null
}

export interface PaginatedDocentes {
  data: Docente[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FilterDocentes {
  q?: string
  curso_id?: string
  page?: number
  limit?: number
}

export function useDocentes(filters: FilterDocentes = {}) {
  return useQuery<PaginatedDocentes>({
    queryKey: ['docentes', filters],
    queryFn: async () => {
      const { data } = await api.get('/docentes', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useDocente(id: string) {
  return useQuery<Docente>({
    queryKey: ['docentes', id],
    queryFn: async () => {
      const { data } = await api.get(`/docentes/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCreateDocente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/docentes', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  })
}

export function useUpdateDocente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/docentes/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  })
}

export function useDeleteDocente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/docentes/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  })
}
