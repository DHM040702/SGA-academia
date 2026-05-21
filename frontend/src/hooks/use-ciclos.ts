import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Ciclo {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
  createdAt: string
  total_secciones?: number
  total_alumnos?: number
  secciones?: Seccion[]
}

export interface Seccion {
  id: string
  nombre: string
  turno: 'manana' | 'tarde' | 'noche'
  nivel?: string | null
  cupoMaximo: number
  cicloId: string
  ciclo?: { id: string; nombre: string; activo: boolean }
  _count?: { alumnos: number; horarios: number }
}

export function useCiclos() {
  return useQuery<Ciclo[]>({
    queryKey: ['ciclos'],
    queryFn: async () => {
      const { data } = await api.get('/ciclos')
      return data
    },
  })
}

export function useCiclo(id: string) {
  return useQuery<Ciclo>({
    queryKey: ['ciclos', id],
    queryFn: async () => {
      const { data } = await api.get(`/ciclos/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCreateCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/ciclos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos'] }),
  })
}

export function useUpdateCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/ciclos/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos'] }),
  })
}

export function useDeleteCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ciclos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos'] }),
  })
}

// ── Secciones ──
export function useSecciones(ciclo_id?: string) {
  return useQuery<Seccion[]>({
    queryKey: ['secciones', ciclo_id],
    queryFn: async () => {
      const { data } = await api.get('/secciones', { params: ciclo_id ? { ciclo_id } : {} })
      return data
    },
  })
}

export function useCreateSeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/secciones', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secciones'] }),
  })
}

export function useUpdateSeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/secciones/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secciones'] }),
  })
}

export function useDeleteSeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/secciones/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secciones'] }),
  })
}
