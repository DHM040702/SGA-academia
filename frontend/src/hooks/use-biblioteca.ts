import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type TipoRecurso = 'pdf' | 'video' | 'enlace' | 'iframe'

export interface RecursoBiblioteca {
  id: string
  titulo: string
  descripcion?: string | null
  tipo: TipoRecurso
  url: string
  nivel?: string | null
  cursoId?: string | null
  activo: boolean
  descargas: number
  subidoPorId: string
  createdAt: string
  subidoPor: { id: string; email: string }
  curso?: { id: string; nombre: string; codigo: string } | null
}

export interface PaginatedRecursos {
  data: RecursoBiblioteca[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FilterBiblioteca {
  page?: number
  limit?: number
  q?: string
  tipo?: TipoRecurso
  curso_id?: string
}

export function useBiblioteca(filters: FilterBiblioteca = {}) {
  return useQuery<PaginatedRecursos>({
    queryKey: ['biblioteca', filters],
    queryFn: async () => {
      const { data } = await api.get('/biblioteca', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useRecurso(id: string) {
  return useQuery<RecursoBiblioteca>({
    queryKey: ['biblioteca', id],
    queryFn: async () => {
      const { data } = await api.get(`/biblioteca/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useBibliotecaStats() {
  return useQuery<{ total_pdf: number; total_video: number; total_enlace: number; total_iframe: number }>({
    queryKey: ['biblioteca', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/biblioteca/stats')
      return data
    },
  })
}

export function useCreateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      api.post('/biblioteca', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biblioteca'] }),
  })
}

export function useUpdateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/biblioteca/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biblioteca'] }),
  })
}

export function useDeleteRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/biblioteca/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biblioteca'] }),
  })
}
