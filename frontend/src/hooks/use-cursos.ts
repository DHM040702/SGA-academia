import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Curso {
  id: string
  nombre: string
  codigo: string
  activo: boolean
}

export function useCursos() {
  return useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: async () => {
      const { data } = await api.get('/cursos')
      return data?.data ?? data ?? []
    },
  })
}
