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
  motivoManual?: string | null
  registradoPorId: string
  createdAt: string
  alumno?: {
    id: string
    nombre: string
    apellidos: string
    codigoBarras: string
    seccion?: { id: string; nombre: string } | null
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
  tipo?: 'alumno' | 'docente'
  seccion_id?: string
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
      api.patch(`/asistencia/${id}/corregir`, dto).then((r) => r.data),
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

export function useResumenAsistencia(fecha?: string) {
  return useQuery({
    queryKey: ['asistencia', 'resumen', fecha],
    queryFn: async () => {
      const { data } = await api.get('/reportes/asistencia', { params: { fecha } })
      return data
    },
    refetchInterval: 30_000,
  })
}
