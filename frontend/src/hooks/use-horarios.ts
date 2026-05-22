import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Horario {
  id: string
  aulaId: string
  cursoId: string
  docenteId: string
  diaSemana: number  // 1=Lunes … 7=Domingo
  horaInicio: string
  horaFin: string
  publicado: boolean
  createdAt: string
  docente: { id: string; nombre: string; apellidos: string; dni?: string }
  curso: { id: string; nombre: string; codigo: string }
  aula: {
    id: string
    nombre: string
    ciclo: { id: string; nombre: string }
  }
}

export interface FilterHorarios {
  aula_id?: string
  docente_id?: string
  dia_semana?: number
  page?: number
  limit?: number
}

export interface Conflicto {
  tipo: 'docente' | 'aula'
  horario: Horario
}

export function useHorarios(filters: FilterHorarios = {}) {
  return useQuery({
    queryKey: ['horarios', filters],
    queryFn: async () => {
      const { data } = await api.get('/horarios', { params: { ...filters, limit: filters.limit ?? 200 } })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useHorario(id: string) {
  return useQuery<Horario>({
    queryKey: ['horarios', id],
    queryFn: async () => {
      const { data } = await api.get(`/horarios/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useConflictosHorario() {
  return useQuery<Horario[]>({
    queryKey: ['horarios', 'conflictos'],
    queryFn: async () => {
      const { data } = await api.get('/horarios/conflictos')
      return data
    },
  })
}

export function useCreateHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/horarios', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }),
  })
}

export function useUpdateHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/horarios/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }),
  })
}

export function useDeleteHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/horarios/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }),
  })
}
