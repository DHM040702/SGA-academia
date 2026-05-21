import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type AreaCarrera = 'ciencias' | 'letras' | 'medicas'

export interface Carrera {
  id: string
  nombre: string
  area: AreaCarrera
  activo: boolean
  _count?: { alumnos: number }
}

export function useCarreras(area?: AreaCarrera) {
  return useQuery<Carrera[]>({
    queryKey: ['carreras', area ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get('/carreras', { params: area ? { area } : {} })
      return data
    },
  })
}

export function useCreateCarrera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      api.post('/carreras', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carreras'] }),
  })
}

export function useUpdateCarrera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/carreras/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carreras'] }),
  })
}

export function useDeleteCarrera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/carreras/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carreras'] }),
  })
}
