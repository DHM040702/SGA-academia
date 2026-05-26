import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type TurnoKey = 'manana' | 'tarde'

export interface TurnoConfig {
  id: string
  turno: TurnoKey
  horaEntrada: string        // ISO datetime "1970-01-01THH:MM:SS.000Z"
  horaLimitePuntual: string  // ISO datetime
  horaFin: string            // ISO datetime
  activo: boolean
}

/** Extracts "HH:MM" from an ISO datetime string produced by Prisma @db.Time */
export function isoToHHMM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function useTurnos() {
  return useQuery<TurnoConfig[]>({
    queryKey: ['turnos'],
    queryFn: () => api.get('/turnos').then((r) => r.data),
    staleTime: 5 * 60_000,
  })
}

export function useTurno(turno: TurnoKey) {
  return useQuery<TurnoConfig>({
    queryKey: ['turnos', turno],
    queryFn: () => api.get(`/turnos/${turno}`).then((r) => r.data),
    enabled: Boolean(turno),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateTurno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ turno, ...dto }: { turno: TurnoKey } & Record<string, unknown>) =>
      api.patch(`/turnos/${turno}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turnos'] }),
  })
}
