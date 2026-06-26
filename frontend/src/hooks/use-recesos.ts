import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Receso {
  id: string
  aula_id: string
  dia_semana: number      // 1=Lunes … 7=Domingo
  hora_inicio: string     // "HH:MM:SS"
  hora_fin: string        // "HH:MM:SS"
  aula_nombre?: string
  turno?: string
  area?: string
}

export interface FilterRecesos {
  aula_id?: string
  ciclo_id?: string
}

export function useRecesos(filters: FilterRecesos = {}) {
  return useQuery<Receso[]>({
    queryKey: ['recesos', filters],
    queryFn: async () => {
      const { data } = await api.get('/recesos', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useUpsertReceso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      aula_id: string
      dia_semana: number
      hora_inicio: string
      hora_fin: string
    }) => api.post('/recesos', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recesos'] })
      qc.invalidateQueries({ queryKey: ['horarios'] })
    },
  })
}

export function useDeleteReceso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recesos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recesos'] }),
  })
}
