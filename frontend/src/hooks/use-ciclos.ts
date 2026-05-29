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
  aulas?: Aula[]
}

export interface Aula {
  id: string
  nombre: string
  turno: 'manana' | 'tarde'
  area: 'ciencias' | 'letras' | 'medicas'
  cupoMaximo: number
  cicloId: string
  ciclo?: { id: string; nombre: string; activo: boolean }
  _count?: { alumnos: number; horarios: number }
}

/** Devuelve el ciclo activo (o el primero disponible). */
export function useActiveCiclo(): Ciclo | null {
  const { data: ciclos = [] } = useCiclos()
  return ciclos.find((c) => c.activo) ?? ciclos[0] ?? null
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

// ── Aulas ──

export interface HorarioAula {
  id: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  publicado: boolean
  docente: { id: string; nombre: string; apellidos: string }
  curso: { id: string; nombre: string; codigo: string }
}

export interface AlumnoAula {
  id: string
  nombre: string
  apellidos: string
  dni: string
  codigoBarras: string
  usuario: { email: string; activo: boolean }
}

export interface AulaDetalle extends Aula {
  ciclo: { id: string; nombre: string; activo: boolean; fechaInicio: string; fechaFin: string }
  alumnos: AlumnoAula[]
  horarios: HorarioAula[]
}

export function useAula(id: string) {
  return useQuery<AulaDetalle>({
    queryKey: ['aulas', id],
    queryFn: async () => {
      const { data } = await api.get(`/aulas/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useAulas(ciclo_id?: string) {
  return useQuery<Aula[]>({
    queryKey: ['aulas', ciclo_id],
    queryFn: async () => {
      const { data } = await api.get('/aulas', { params: ciclo_id ? { ciclo_id } : {} })
      return data
    },
  })
}

export function useCreateAula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/aulas', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

export function useUpdateAula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/aulas/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

export function useDeleteAula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/aulas/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

// ── Backward-compat aliases (remove once all usages updated) ──
/** @deprecated Use useAulas */
export const useSecciones = useAulas
/** @deprecated Use useAula */
export const useSeccion = useAula
/** @deprecated Use useCreateAula */
export const useCreateSeccion = useCreateAula
/** @deprecated Use Aula */
export type Seccion = Aula
/** @deprecated Use AulaDetalle */
export type SeccionDetalle = AulaDetalle
/** @deprecated Use HorarioAula */
export type HorarioSeccion = HorarioAula
/** @deprecated Use AlumnoAula */
export type AlumnoSeccion = AlumnoAula
