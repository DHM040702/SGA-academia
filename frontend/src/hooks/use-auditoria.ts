import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface AuditoriaEvento {
  id: string
  usuarioEmail: string | null
  usuarioRol: string | null
  accion: string
  entidad: string
  entidadId: string | null
  detalle: unknown
  ip: string | null
  createdAt: string
}

export interface AuditoriaPage {
  data: AuditoriaEvento[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuditoriaResumen {
  total: number
  hoy: number
  accesos7: number
  porAccion: { accion: string; total: number }[]
  porEntidad: { entidad: string; total: number }[]
  usuariosActivos: { email: string | null; total: number }[]
}

export interface AuditoriaFiltros {
  page?: number
  limit?: number
  usuario?: string
  accion?: string
  entidad?: string
  desde?: string
  hasta?: string
}

function cleanParams(f: AuditoriaFiltros) {
  return Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== ''),
  )
}

export function useAuditoria(filtros: AuditoriaFiltros) {
  return useQuery({
    queryKey: ['auditoria', filtros],
    queryFn: () =>
      api.get<AuditoriaPage>('/auditoria', { params: cleanParams(filtros) }).then((r) => r.data),
  })
}

export function useAuditoriaResumen() {
  return useQuery({
    queryKey: ['auditoria', 'resumen'],
    queryFn: () => api.get<AuditoriaResumen>('/auditoria/resumen').then((r) => r.data),
  })
}

/** Descarga el CSV de auditoría con los filtros actuales. */
export async function exportarAuditoriaCsv(filtros: AuditoriaFiltros) {
  const res = await api.get('/auditoria/export', {
    params: cleanParams(filtros),
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export const ACCION_LABELS: Record<string, string> = {
  crear: 'Creación',
  actualizar: 'Actualización',
  eliminar: 'Eliminación',
  reset_password: 'Reset contraseña',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
}
