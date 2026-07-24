import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface PersonaFoto {
  id: string
  nombre: string
  apellidos: string
  dni: string
  codigo: string | null
}

export interface IntegranteFoto extends PersonaFoto {
  fotoUrl: string | null
  size: number
}

export interface ReporteFotos {
  total: number
  conFoto: number
  sinFotoTotal: number
  sinFoto: PersonaFoto[]
  duplicados: { etag: string; integrantes: IntegranteFoto[] }[]
}

export interface FotosControl {
  generadoEn: string
  alumnos: ReporteFotos
  docentes: ReporteFotos
}

export function useFotosControl() {
  return useQuery<FotosControl>({
    queryKey: ['fotos-control'],
    queryFn: async () => {
      const { data } = await api.get('/fotos-control')
      return data
    },
    staleTime: 60_000,
  })
}

/** Quita la foto de un alumno o docente (deshacer una duplicada mal asignada). */
export function useEliminarFotoControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tipo, id }: { tipo: 'alumnos' | 'docentes'; id: string }) =>
      api.delete(`/fotos-control/${tipo}/${id}/foto`).then((r) => r.data),
    onSuccess: (_data, { tipo }) => {
      qc.invalidateQueries({ queryKey: ['fotos-control'] })
      qc.invalidateQueries({ queryKey: [tipo] }) // refresca listas de alumnos/docentes
    },
  })
}
