import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Salida {
  id: string
  fecha: string          // Timestamptz (instante real)
  motivo: string
  alumno: string
  codigo: string
  dni: string
  aula: string
  autorizado_por: string
}

export interface SalidasPage {
  data: Salida[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SalidasFiltros {
  page?: number
  limit?: number
  alumno_id?: string
  ciclo_id?: string
  desde?: string
  hasta?: string
}

function clean(f: SalidasFiltros) {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''))
}

export function useSalidas(filtros: SalidasFiltros) {
  return useQuery<SalidasPage>({
    queryKey: ['salidas', filtros],
    queryFn: async () => {
      const { data } = await api.get('/salidas', { params: clean(filtros) })
      return data
    },
  })
}

export function useCreateSalida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { alumno_id: string; motivo: string }) =>
      api.post('/salidas', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salidas'] }),
  })
}
