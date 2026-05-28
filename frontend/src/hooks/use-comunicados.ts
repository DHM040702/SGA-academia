import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

export interface Comunicado {
  id: string
  titulo: string
  cuerpo: string
  destinatarioTipo: 'todos' | 'alumnos' | 'apoderados' | 'docentes' | 'seccion' | 'usuario'
  aulaId?: string | null
  canalSistema: boolean
  canalWhatsapp: boolean
  publicadoPorId: string
  publicadoAt?: string | null
  createdAt: string
  publicadoPor: { id: string; email: string }
  aula?: { id: string; nombre: string } | null
  pct_enviado?: number
  _count?: { envios: number }
  envios?: {
    id: string
    usuarioId: string
    canal: string
    estado: string
    enviadoAt?: string | null
    errorDetalle?: string | null
  }[]
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

export interface CreateComunicadoDto {
  titulo: string
  cuerpo: string
  destinatario_tipo?: 'todos' | 'alumnos' | 'apoderados' | 'docentes' | 'seccion' | 'usuario'
  aula_id?: string
  canal_sistema?: boolean
  canal_whatsapp?: boolean
  publicar_ahora?: boolean
}

export interface UpdateComunicadoDto {
  id: string
  titulo?: string
  cuerpo?: string
  canal_sistema?: boolean
  canal_whatsapp?: boolean
  publicar_ahora?: boolean
}

export function useComunicados(filters: FilterComunicados = {}) {
  // Incluir el rol en la query key para que cada rol tenga su propio bucket
  // de caché y no se mezclen datos entre usuarios de distintos roles
  const { user } = useAuth()
  const rol = user?.rol ?? 'anonymous'
  return useQuery<PaginatedComunicados>({
    queryKey: ['comunicados', rol, filters],
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
    mutationFn: (dto: CreateComunicadoDto) =>
      api.post('/comunicados', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}

export function useUpdateComunicado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateComunicadoDto) =>
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
