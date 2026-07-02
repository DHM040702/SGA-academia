import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface AsistenciaRecord {
  id: string
  tipoPersona: 'alumno' | 'docente'
  alumnoId?: string | null
  docenteId?: string | null
  fecha: string
  horaIngreso: string
  esTardanza: boolean
  esManual: boolean
  esAusente: boolean
  motivoManual?: string | null
  justificacionRazon?: string | null
  justificacionDoc?: string | null
  justificadoEn?: string | null
  justificadoPor?: {
    id: string
    nombre?: string | null
    apellidos?: string | null
    rol: string
  } | null
  registradoPorId: string
  createdAt: string
  alumno?: {
    id: string
    nombre: string
    apellidos: string
    codigoBarras: string
    dni?: string | null
    aula?: { id: string; nombre: string; area?: string | null; turno?: string | null } | null
  } | null
  docente?: {
    id: string
    nombre: string
    apellidos: string
    dni: string
  } | null
}

export interface FilterAsistencia {
  fecha?: string
  desde?: string
  hasta?: string
  tipo?: 'alumno' | 'docente'
  turno?: 'manana' | 'tarde'
  aula_id?: string
  alumno_id?: string
  docente_id?: string
  page?: number
  limit?: number
}

export interface PaginatedAsistencia {
  data: AsistenciaRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ScanDto {
  codigo: string
}

export function useAsistencia(filters: FilterAsistencia = {}) {
  return useQuery<PaginatedAsistencia>({
    queryKey: ['asistencia', filters],
    queryFn: async () => {
      const { data } = await api.get('/asistencia', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
    refetchInterval: 10_000, // refresh every 10s on attendance screen
  })
}

export function useScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ScanDto) => api.post('/asistencia/scan', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

export function useManualAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      api.post('/asistencia/manual', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

export function useCorrectAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/asistencia/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

/** Cambia solo puntual/tardanza — permitido al auxiliar en el kiosco. */
export function useSetTardanza() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, es_tardanza }: { id: string; es_tardanza: boolean }) =>
      api.patch(`/asistencia/${id}/tardanza`, { es_tardanza }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

export function useDeleteAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/asistencia/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

export function useCerrarTurno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { turno: 'manana' | 'tarde' }) =>
      api.post('/asistencia/cerrar-turno', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

export interface FilterInasistencias {
  desde?: string
  hasta?: string
  aula_id?: string
  estado?: 'todas' | 'pendientes' | 'justificadas'
}

export interface InasistenciasResponse {
  data: AsistenciaRecord[]
  total: number
  justificadas: number
  pendientes: number
  desde: string
  hasta: string
}

export function useInasistencias(filters: FilterInasistencias) {
  return useQuery({
    queryKey: ['asistencia', 'inasistencias', filters],
    queryFn: (): Promise<InasistenciasResponse> => {
      const params = new URLSearchParams()
      if (filters.desde)   params.set('desde', filters.desde)
      if (filters.hasta)   params.set('hasta', filters.hasta)
      if (filters.aula_id) params.set('aula_id', filters.aula_id)
      if (filters.estado)  params.set('estado', filters.estado)
      return api.get(`/asistencia/inasistencias?${params.toString()}`).then((r) => r.data)
    },
  })
}

export function useJustificarAusencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; razon: string; doc_num: string }) =>
      api.patch(`/asistencia/${id}/justificar`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia'] }),
  })
}

export interface StatsAsistencia {
  presentes: number
  tardanzas: number
  ausentes: number       // faltas confirmadas por cerrarTurno
  sin_registro: number   // matriculados sin ningún registro hoy
  total_alumno: number   // total matriculados activos
  pct_asistencia: number
  docentes_hoy: number
}

export function useResumenAsistencia() {
  return useQuery<StatsAsistencia>({
    queryKey: ['asistencia', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/asistencia/stats')
      return data
    },
    refetchInterval: 30_000,
  })
}
