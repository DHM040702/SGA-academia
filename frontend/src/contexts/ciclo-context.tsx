'use client'
/**
 * CicloContext — ciclo activo / seleccionado compartido en toda la app.
 *
 * Usar en layouts cliente:
 *   <CicloProvider>{children}</CicloProvider>
 *
 * Consumir en cualquier componente:
 *   const { cicloActivo, selectedCiclo, setSelectedId } = useCicloCtx()
 */
import * as React from 'react'
import { useCiclos } from '@/hooks/use-ciclos'
import type { Ciclo } from '@/hooks/use-ciclos'

/* ─── helper: número de semana actual del ciclo ─────────────────── */
export function cicloWeekInfo(
  fechaInicio: string,
  fechaFin: string,
  hoy = new Date(),
): { week: number; total: number } {
  // Tolerante a ISO con o sin 'T' (la API devuelve @db.Date como ISO completo;
  // concatenar 'T12:00:00' a ciegas daría Invalid Date → semana NaN).
  const start = new Date(fechaInicio + (fechaInicio.includes('T') ? '' : 'T12:00:00'))
  const end   = new Date(fechaFin   + (fechaFin.includes('T')   ? '' : 'T12:00:00'))
  const totalMs = end.getTime() - start.getTime()
  const total   = Math.max(1, Math.ceil(totalMs / (7 * 86_400_000)))
  const elapsed = hoy.getTime() - start.getTime()
  const week    = Math.min(total, Math.max(1, Math.ceil(elapsed / (7 * 86_400_000))))
  return { week, total }
}

/* ─── Context ───────────────────────────────────────────────────── */
interface CicloCtxType {
  ciclos:        Ciclo[]
  cicloActivo:   Ciclo | null
  selectedCiclo: Ciclo | null
  setSelectedId: (id: string) => void
  loading:       boolean
}

const CicloContext = React.createContext<CicloCtxType>({
  ciclos: [], cicloActivo: null, selectedCiclo: null,
  setSelectedId: () => {}, loading: true,
})

export function CicloProvider({ children }: { children: React.ReactNode }) {
  const { data: ciclos = [], isLoading: loading } = useCiclos()
  const cicloActivo = React.useMemo(
    () => ciclos.find((c) => c.activo) ?? ciclos[0] ?? null,
    [ciclos],
  )
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  // Cuando carguen los ciclos, apuntar al activo por defecto
  React.useEffect(() => {
    if (cicloActivo && !selectedId) setSelectedId(cicloActivo.id)
  }, [cicloActivo, selectedId])

  const selectedCiclo = React.useMemo(
    () => ciclos.find((c) => c.id === selectedId) ?? cicloActivo,
    [ciclos, selectedId, cicloActivo],
  )

  return (
    <CicloContext.Provider value={{ ciclos, cicloActivo, selectedCiclo, setSelectedId, loading }}>
      {children}
    </CicloContext.Provider>
  )
}

export function useCicloCtx(): CicloCtxType {
  return React.useContext(CicloContext)
}
