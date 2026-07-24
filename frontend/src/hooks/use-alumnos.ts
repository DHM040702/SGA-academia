import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

/* ─── Types ───────────────────────────────────────────────────── */
export type EstadoAlumno = 'activo' | 'observado' | 'riesgo' | 'inactivo'

export interface Alumno {
  id: string
  codigo_barra: string
  nombres: string
  apellidos: string
  dni: string
  telefono?: string | null
  fecha_nacimiento?: string | null
  // La API la manda camelCase y presignada; `foto_url` queda por compat.
  fotoUrl?: string | null
  foto_url?: string | null
  aula_id?: string | null
  carreraId?: string | null
  created_at: string
  asistencia_pct: number
  estado: EstadoAlumno
  usuario: { email: string; activo: boolean; rol: string }
  aula?: {
    id: string
    nombre: string
    turno?: 'manana' | 'tarde'
    area?: 'ciencias' | 'letras' | 'medicas'
    ciclo: { id: string; nombre: string }
    horarios?: {
      id: string
      diaSemana: number
      horaInicio: string
      horaFin: string
      publicado: boolean
      curso: { id: string; nombre: string; codigo: string }
      docente: { id: string; nombre: string; apellidos: string }
    }[]
  } | null
  carrera?: {
    id: string
    nombre: string
    area: 'ciencias' | 'letras' | 'medicas'
  } | null
}

export interface PaginatedAlumnos {
  data: Alumno[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FilterAlumnos {
  page?: number
  limit?: number
  q?: string
  ciclo_id?: string
  aula_id?: string
  estado?: EstadoAlumno
}

/* ─── Hooks ───────────────────────────────────────────────────── */
export function useAlumnos(filters: FilterAlumnos = {}) {
  return useQuery<PaginatedAlumnos>({
    queryKey: ['alumnos', filters],
    queryFn: async () => {
      const { data } = await api.get('/alumnos', { params: filters })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useAlumno(id: string) {
  return useQuery<Alumno>({
    queryKey: ['alumnos', id],
    queryFn: async () => {
      const { data } = await api.get(`/alumnos/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCreateAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/alumnos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

export function useUpdateAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Record<string, unknown>) =>
      api.patch(`/alumnos/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

export function useDeleteAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/alumnos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

export function useRestoreAlumno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/alumnos/${id}/restore`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

export interface ImportResult {
  ok: number
  /** Altas nuevas (alumnos que no existían) */
  creados?: number
  /** Re-matrículas (alumnos existentes movidos al aula del ciclo activo) */
  actualizados?: number
  errores: { fila: number; msg: string }[]
}

export function useImportarAlumnos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File): Promise<ImportResult> => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/alumnos/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}

/** Resultado del import del CSV oficial de matrícula (formato semestre). */
export interface SemestreImportResult {
  ok: number
  /** Altas nuevas */
  creados: number
  /** Alumnos existentes re-matriculados al ciclo activo */
  actualizados: number
  /** Apoderados creados (cuenta generada) */
  apoderados: number
  /** Cuotas registradas */
  pagos: number
  errores: { fila: number; msg: string }[]
}

/**
 * Importa el CSV oficial de matrícula. El backend parsea, auto-distribuye el
 * aula por área+turno, upserta carrera, crea el apoderado y registra la cuota.
 */
export function useImportarSemestre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File): Promise<SemestreImportResult> => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/alumnos/import-semestre', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: () => {
      // El import puede crear aulas y apoderados además de alumnos.
      qc.invalidateQueries({ queryKey: ['alumnos'] })
      qc.invalidateQueries({ queryKey: ['aulas'] })
      qc.invalidateQueries({ queryKey: ['apoderados'] })
    },
  })
}

/** Resultado de la carga masiva de fotos (ZIP). */
export interface FotosImportResult {
  /** Imágenes encontradas en el ZIP */
  procesados: number
  /** Fotos asignadas a su alumno */
  actualizados: number
  /** Archivos cuyo nombre no casó con ningún DNI */
  sinCoincidencia: string[]
  /** Archivos cuyo nombre casó con más de un DNI */
  ambiguos: string[]
  errores: { archivo: string; msg: string }[]
}

/**
 * Sube un ZIP de fotos. El backend asocia cada imagen a su alumno por el DNI
 * embebido en el nombre del archivo.
 */
export function useImportarFotos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File): Promise<FotosImportResult> => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/alumnos/import-fotos', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  })
}
