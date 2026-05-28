import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ── Tipos ────────────────────────────────────────────────────────────

export interface ApoderadoVinculado {
  alumnoId: string
  apoderadoId: string
  parentesco: string
  esPrincipal: boolean
  apoderado: {
    id: string
    nombre: string
    apellidos: string
    dni: string
    telefonoWhatsapp: string
    usuario: { id: string; email: string; activo: boolean }
  }
}

export interface AlumnoVinculado {
  alumnoId: string
  apoderadoId: string
  parentesco: string
  esPrincipal: boolean
  alumno: {
    id: string
    nombre: string
    apellidos: string
    dni: string
    codigoBarras: string
    aula?: { id: string; nombre: string; ciclo?: { id: string; nombre: string } } | null
    carrera?: { id: string; nombre: string; area: string } | null
  }
}

export interface ApoderadoSearchResult {
  id: string
  email: string
  nombre?: string | null
  apellidos?: string | null
  dni?: string | null
  apoderado?: { id: string; nombre: string; apellidos: string } | null
}

export const PARENTESCO_OPTS = [
  'Padre', 'Madre', 'Abuelo/a', 'Tío/a', 'Hermano/a mayor', 'Tutor legal', 'Otro',
] as const

// ── Hooks ────────────────────────────────────────────────────────────

/** Apoderados vinculados a un alumno */
export function useApoderadosByAlumno(alumnoId: string) {
  return useQuery<ApoderadoVinculado[]>({
    queryKey: ['alumnos', alumnoId, 'apoderados'],
    queryFn: () => api.get(`/alumnos/${alumnoId}/apoderados`).then((r) => r.data),
    enabled: Boolean(alumnoId),
  })
}

/** Alumnos vinculados a un usuario apoderado */
export function useAlumnosByApoderado(userId: string) {
  return useQuery<AlumnoVinculado[]>({
    queryKey: ['usuarios', userId, 'alumnos'],
    queryFn: () => api.get(`/usuarios/${userId}/alumnos`).then((r) => r.data),
    enabled: Boolean(userId),
  })
}

/** Buscar apoderados existentes (por nombre, apellidos o DNI) */
export function useSearchApoderados(q: string) {
  return useQuery<{ data: ApoderadoSearchResult[] }>({
    queryKey: ['usuarios', 'apoderados-search', q],
    queryFn: () =>
      api.get('/usuarios', { params: { rol: 'apoderado', search: q, limit: 10 } }).then((r) => r.data),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })
}

/** Vincular apoderado a un alumno (nuevo o existente) */
export function useVincularApoderado(alumnoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: object) =>
      api.post(`/alumnos/${alumnoId}/apoderados`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId, 'apoderados'] })
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId] })
    },
  })
}

/** Desvincular apoderado de un alumno */
export function useDesvincularApoderado(alumnoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (apoderadoId: string) =>
      api.delete(`/alumnos/${alumnoId}/apoderados/${apoderadoId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId, 'apoderados'] })
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId] })
    },
  })
}

/** Vincular apoderado a cualquier alumno — alumnoId dinámico (para uso desde la página de apoderado) */
export function useVincularApoderadoGenerico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ alumnoId, dto }: { alumnoId: string; dto: object }) =>
      api.post(`/alumnos/${alumnoId}/apoderados`, dto).then((r) => r.data),
    onSuccess: (_, { alumnoId }) => {
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId, 'apoderados'] })
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId] })
      qc.invalidateQueries({ queryKey: ['usuarios'] }) // cubre useAlumnosByApoderado
    },
  })
}

/** Desvincular apoderado de cualquier alumno — alumnoId dinámico (para uso desde la página de apoderado) */
export function useDesvincularApoderadoGenerico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ alumnoId, apoderadoId }: { alumnoId: string; apoderadoId: string }) =>
      api.delete(`/alumnos/${alumnoId}/apoderados/${apoderadoId}`).then((r) => r.data),
    onSuccess: (_, { alumnoId }) => {
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId, 'apoderados'] })
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId] })
      qc.invalidateQueries({ queryKey: ['usuarios'] }) // cubre useAlumnosByApoderado
    },
  })
}
