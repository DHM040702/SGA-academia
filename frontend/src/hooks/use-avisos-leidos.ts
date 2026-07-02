'use client'

import { useState, useCallback, useEffect } from 'react'
import api from '@/lib/api'

/**
 * Estado "leído" de los avisos/comunicados, ahora persistido SERVER-SIDE
 * (columna comunicados_envios.leido_en). Se sincroniza entre dispositivos.
 *
 * Mantiene la misma interfaz que la versión anterior (localStorage) para no
 * tocar los consumidores: campana, KPI y lista. Un cache a nivel de módulo +
 * un evento de ventana mantienen sincronizadas todas las instancias del hook
 * dentro de la misma pestaña.
 */
const EVENTO = 'avisos-leidos-changed'
let cache = new Set<string>()

export function useAvisosLeidos(userId?: string | null) {
  const [readIds, setReadIds] = useState<Set<string>>(cache)

  const load = useCallback(async () => {
    if (!userId) { cache = new Set(); setReadIds(cache); window.dispatchEvent(new Event(EVENTO)); return }
    try {
      const { data } = await api.get<string[]>('/comunicados/leidos')
      cache = new Set(data)
      setReadIds(cache)
      window.dispatchEvent(new Event(EVENTO))
    } catch { /* mantener lo que haya en cache */ }
  }, [userId])

  // Cargar al montar (y al cambiar de usuario); re-sincronizar cuando otra
  // instancia del hook actualiza el cache.
  useEffect(() => {
    void load()
    const onChange = () => setReadIds(new Set(cache))
    window.addEventListener(EVENTO, onChange)
    return () => window.removeEventListener(EVENTO, onChange)
  }, [load])

  const markRead = useCallback((id: string) => {
    if (cache.has(id)) return
    cache = new Set(cache)
    cache.add(id)
    setReadIds(cache)
    window.dispatchEvent(new Event(EVENTO))
    api.post(`/comunicados/${id}/leer`).catch(() => { /* optimista */ })
  }, [])

  const markAllRead = useCallback((ids: string[]) => {
    const next = new Set(cache)
    let changed = false
    for (const id of ids) if (!next.has(id)) { next.add(id); changed = true }
    if (!changed) return
    cache = next
    setReadIds(cache)
    window.dispatchEvent(new Event(EVENTO))
    api.post('/comunicados/leidos/todos').catch(() => { /* optimista */ })
  }, [])

  const isRead = useCallback((id: string) => readIds.has(id), [readIds])
  const countUnread = useCallback(
    (ids: string[]) => ids.reduce((n, id) => (readIds.has(id) ? n : n + 1), 0),
    [readIds],
  )

  return { readIds, isRead, markRead, markAllRead, countUnread }
}
