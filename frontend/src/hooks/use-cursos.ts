import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

/* ─── tipos ──────────────────────────────────────────────────────── */
export interface Curso {
  id: string
  nombre: string
  codigo: string
  activo: boolean
  _count?: { horarios: number }
}

export interface HorarioCurso {
  id: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  publicado: boolean
  docente: { id: string; nombre: string; apellidos: string }
  aula: {
    id: string
    nombre: string
    ciclo: { id: string; nombre: string }
  }
}

export interface CursoDetalle extends Curso {
  horarios: HorarioCurso[]
}

export interface CreateCursoDto {
  nombre: string
  codigo: string
}

export interface UpdateCursoDto {
  nombre?: string
  codigo?: string
}

/* ─── hooks ──────────────────────────────────────────────────────── */
export function useCursos() {
  return useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: async () => {
      const { data } = await api.get('/cursos')
      return data?.data ?? data ?? []
    },
    staleTime: 60_000,
  })
}

export function useCurso(id: string) {
  return useQuery<CursoDetalle>({
    queryKey: ['cursos', id],
    queryFn: async () => {
      const { data } = await api.get(`/cursos/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCreateCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCursoDto) =>
      api.post('/cursos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos'] }),
  })
}

export function useUpdateCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateCursoDto) =>
      api.patch(`/cursos/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos'] }),
  })
}

export function useDeleteCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/cursos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos'] }),
  })
}
