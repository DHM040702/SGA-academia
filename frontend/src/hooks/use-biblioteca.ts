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
  area?: 'ciencias' | 'letras' | 'medicas' | null
  activo: boolean
  descargas: number
  subidoPorId: string
  createdAt: string
  subidoPor: { id: string; email: string }
  curso?: { id: string; nombre: string; codigo: string } | null
}

export interface HistorialEntry {
  id: string
  recurso_id: string
  titulo_anterior: string | null
  descripcion_anterior: string | null
  url_anterior: string | null
  nivel_anterior: string | null
  curso_id_anterior: string | null
  modificado_por_id: string
  modificado_at: string
  editor_email?: string
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
  area?: 'ciencias' | 'letras' | 'medicas'
  solo_generales?: boolean
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

export function useBibliotecaStats(opts?: { area?: string; solo_generales?: boolean }) {
  const params: Record<string, string> = {}
  if (opts?.area) params.area = opts.area
  if (opts?.solo_generales) params.solo_generales = 'true'
  return useQuery<{ total_pdf: number; total_video: number; total_enlace: number; total_iframe: number }>({
    queryKey: ['biblioteca', 'stats', params],
    queryFn: async () => {
      const { data } = await api.get('/biblioteca/stats', { params })
      return data
    },
  })
}

export function useHistorialRecurso(recursoId: string) {
  return useQuery<HistorialEntry[]>({
    queryKey: ['biblioteca', 'historial', recursoId],
    queryFn: async () => {
      const { data } = await api.get(`/biblioteca/${recursoId}/historial`)
      return data
    },
    enabled: Boolean(recursoId),
  })
}

/** Crea un recurso. Si tipo=pdf y se pasa un File, envía multipart. De lo contrario JSON. */
export function useCreateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      titulo: string
      descripcion?: string
      tipo: TipoRecurso
      url?: string
      nivel?: string
      curso_id?: string
      area?: string
      file?: File
    }) => {
      const { file, ...fields } = payload

      if (file) {
        const fd = new FormData()
        Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) fd.append(k, String(v)) })
        fd.append('file', file)
        const { data } = await api.post('/biblioteca', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
      }

      const { data } = await api.post('/biblioteca', fields)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biblioteca'] }),
  })
}

/** Edita un recurso. Si tipo=pdf y se pasa un nuevo File, envía multipart. */
export function useUpdateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      titulo?: string
      descripcion?: string
      tipo?: TipoRecurso
      url?: string
      nivel?: string
      curso_id?: string
      area?: string | null
      file?: File
    }) => {
      const { id, file, ...fields } = payload

      if (file) {
        const fd = new FormData()
        Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) fd.append(k, String(v)) })
        fd.append('file', file)
        const { data } = await api.patch(`/biblioteca/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
      }

      const { data } = await api.patch(`/biblioteca/${id}`, fields)
      return data
    },
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
