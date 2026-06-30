'use client'

import { useState, useCallback, useEffect } from 'react'

/**
 * Estado "leído" de los avisos/comunicados, persistido en localStorage por
 * usuario. Así un aviso abierto sigue marcado como leído tras recargar o navegar
 * (antes el estado vivía solo en memoria y se perdía).
 *
 * Todas las instancias del hook se mantienen sincronizadas (campana, KPI, lista)
 * mediante un evento de ventana que se dispara al escribir.
 *
 * Es por dispositivo (no sincroniza entre equipos). Para sincronización real
 * haría falta una tabla server-side de lecturas.
 */
const EVENTO = 'avisos-leidos-changed'

function keyFor(userId?: string | null) {
  return `avisos-leidos:${userId ?? 'anon'}`
}

export function useAvisosLeidos(userId?: string | null) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(keyFor(userId))
      setReadIds(new Set<string>(raw ? JSON.parse(raw) : []))
    } catch {
      setReadIds(new Set())
    }
  }, [userId])

  // Cargar al montar (y al cambiar de usuario), y re-sincronizar cuando otra
  // instancia escribe (mismo tab) o cuando cambia en otra pestaña.
  useEffect(() => {
    load()
    function onChange() { load() }
    window.addEventListener(EVENTO, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(EVENTO, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [load])

  const persist = useCallback((s: Set<string>) => {
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify([...s]))
      window.dispatchEvent(new Event(EVENTO))
    } catch { /* */ }
  }, [userId])

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      queueMicrotask(() => persist(next))   // escribir fuera del render
      return next
    })
  }, [persist])

  const markAllRead = useCallback((ids: string[]) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of ids) if (!next.has(id)) { next.add(id); changed = true }
      if (changed) queueMicrotask(() => persist(next))
      return next
    })
  }, [persist])

  const isRead = useCallback((id: string) => readIds.has(id), [readIds])
  const countUnread = useCallback(
    (ids: string[]) => ids.reduce((n, id) => (readIds.has(id) ? n : n + 1), 0),
    [readIds],
  )

  return { readIds, isRead, markRead, markAllRead, countUnread }
}
