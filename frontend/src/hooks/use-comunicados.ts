import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Comunicado {
  id: string
  titulo: string
  cuerpo: string
  destinatarioTipo: string
  seccionId?: string | null
  canalSistema: boolean
  canalWhatsapp: boolean
  publicadoPorId: string
  publicadoAt?: string | null
  createdAt: string
  publicadoPor: { id: string; email: string }
  seccion?: { id: string; nombre: string } | null
  pct_enviado?: number
  _count?: { envios: number }
}

export interface PaginatedComunicados {
  data: Comunicado[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FilterComunicados {
  page?: number
  limit?: number
}

export function useComunicados(filters: FilterComunicados = {}) {
  return useQuery<PaginatedComunicados>({
    queryKey: ['comunicados', filters],
    queryFn: async () => {
      const { data } = await api.get('/comunicados', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useComunicado(id: string) {
  return useQuery<Comunicado>({
    queryKey: ['comunicados', id],
    queryFn: async () => {
      const { data } = await api.get(`/comunicados/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCreateComunicado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      api.post('/comunicados', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}

export function useUpdateComunicado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/comunicados/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}

export function useDeleteComunicado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/comunicados/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}

export function useMarcarLeido(comunicadoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post(`/comunicados/${comunicadoId}/leer`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}
