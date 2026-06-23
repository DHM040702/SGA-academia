'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { KPI } from '@/components/ui/kpi'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { useCicloCtx, cicloWeekInfo } from '@/contexts/ciclo-context'
import api from '@/lib/api'
import { Download, Plus, ChevR, Calendar, ScanLine, RefreshCw, AlertTriangle } from '@/components/icons'
import { useCerrarTurno } from '@/hooks/use-asistencia'
import { cn } from '@/lib/utils'

/* ── Helpers compartidos ──────────────────────────────────────── */
function formatHora(isoTime: string | null | undefined): string {
  if (!isoTime) return '--:--'
  const d = new Date(isoTime)
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
}

function formatHoraLocal(isoTime: string | null | undefined): string {
  if (!isoTime) return '--:--'
  const d = new Date(isoTime)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function isLive(horaInicio: string, horaFin: string): boolean {
  const now = new Date()
  // Las horas se almacenan en la DB como Time(UTC) — comparar todo en UTC para consistencia
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes()
  const ini = new Date(horaInicio)
  const fin = new Date(horaFin)
  const s = ini.getUTCHours() * 60 + ini.getUTCMinutes()
  const e = fin.getUTCHours() * 60 + fin.getUTCMinutes()
  return cur >= s && cur <= e
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

/* ── Weekly bar chart (solo admin) ───────────────────────────── */
function WeeklyBar({ data, h = 180 }: { data: { day: string; v: number; today?: boolean }[]; h?: number }) {
  const max = Math.max(...data.map((d) => d.v), 1)
  return (
    <div className="flex items-end gap-2.5 pt-3" style={{ height: h }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
          <div className="flex-1 w-full flex items-end relative">
            <div
              className={cn(
                'w-full rounded-t-[4px] relative',
                d.today ? 'bg-primary' : 'bg-primary-light border border-primary',
              )}
              style={{ height: `${(d.v / max) * 100}%` }}
            >
              {d.today && d.v > 0 && (
                <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 text-[11px] font-bold text-primary font-mono whitespace-nowrap">
                  {d.v}%
                </div>
              )}
            </div>
          </div>
          <div className={cn('text-[11px]', d.today ? 'text-primary font-semibold' : 'text-text-mute font-medium')}>
            {d.day}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PANTALLA VIGILANTE
   ═══════════════════════════════════════════════════════════════ */
function VigilanteInicio() {
  const { user } = useAuth()
  const router = useRouter()

  const now = new Date()
  const horaStr = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayDia = now.getDay() === 0 ? 7 : now.getDay()

  const firstName = user?.nombre?.split(' ')[0] ?? user?.email?.split('@')[0]?.split('.')[0] ?? 'vigilante'
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  // Estado para el modal de cierre de turno
  const [cierreTurno, setCierreTurno] = React.useState<'manana' | 'tarde' | null>(null)
  const [cierreResult, setCierreResult] = React.useState<string | null>(null)
  const cerrarTurnoMut = useCerrarTurno()

  /* ── Queries con auto-refresh ─────────────────────────────── */
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['asistencia', 'stats', 'vigilante-inicio'],
    queryFn: () => api.get('/asistencia/stats').then((r) => r.data),
    staleTime: 20_000,
    refetchInterval: 30_000,
  })

  const { data: asistenciaPage, refetch: refetchAsistencia, dataUpdatedAt } = useQuery({
    queryKey: ['asistencia', 'hoy-vigilante', todayIso],
    queryFn: () =>
      api.get('/asistencia', { params: { fecha: todayIso, limit: 15 } }).then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  // Sin filtro publicado para mostrar todas las clases del día (publicadas o no)
  const { data: horariosPage } = useQuery({
    queryKey: ['horarios', 'hoy-vigilante', todayDia],
    queryFn: () =>
      api.get('/horarios', { params: { dia_semana: todayDia, limit: 50 } }).then((r) => r.data),
    staleTime: 60_000,
  })

  /* ── Datos derivados ─────────────────────────────────────── */
  const presentes    = stats?.presentes    ?? 0
  const tardanzas    = stats?.tardanzas    ?? 0
  const ausentes     = stats?.ausentes     ?? 0
  const sinRegistro  = stats?.sin_registro ?? 0
  const totalAlum    = stats?.total_alumno ?? 0
  const docentesHoy  = stats?.docentes_hoy ?? 0
  const pctAsist     = stats?.pct_asistencia ?? 0

  const registros: any[] = asistenciaPage?.data ?? []
  const clasesHoy: any[] = horariosPage?.data ?? []
  const clasesEnCurso    = clasesHoy.filter((c: any) => isLive(c.horaInicio, c.horaFin))

  const ultimaActualizacion = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '—'

  function handleRefresh() {
    refetchStats()
    refetchAsistencia()
  }

  async function handleCerrarTurno() {
    if (!cierreTurno) return
    try {
      const res = await cerrarTurnoMut.mutateAsync({ turno: cierreTurno })
      setCierreResult(res.message ?? 'Turno cerrado correctamente')
      refetchStats()
    } catch (err: any) {
      setCierreResult(err?.response?.data?.message ?? 'Error al cerrar el turno')
    }
  }

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4">
      {/* Header */}
      <PageHeader
        title={`${horaStr}, ${capitalized}`}
        crumbs={['Vigilancia', 'Inicio']}
        action={
          <>
            <Btn variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw size={14} />Actualizar
            </Btn>
            <Btn size="sm" onClick={() => window.open('/vigilante', '_blank')}>
              <ScanLine size={14} />Registro de asistencia
            </Btn>
          </>
        }
      />

      <p className="text-[12.5px] text-text-mute m-0 px-1">
        <span className="text-text font-medium capitalize">{fechaStr}</span>
        {' · '}Última actualización: {ultimaActualizacion}
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5">
        <KPI
          label="Presentes hoy"
          value={presentes}
          sub={totalAlum > 0 ? `${pctAsist}% de ${totalAlum} alumnos` : 'Sin registros'}
          accent="var(--color-success)"
        />
        <KPI
          label="Tardanzas"
          value={tardanzas}
          sub="llegada fuera de hora"
          accent="var(--color-warning)"
        />
        <KPI
          label="Ausentes"
          value={ausentes + sinRegistro}
          sub={ausentes > 0
            ? `${ausentes} falta${ausentes !== 1 ? 's' : ''} confirmada${ausentes !== 1 ? 's' : ''}${sinRegistro > 0 ? ` · ${sinRegistro} sin registro` : ''}`
            : sinRegistro > 0 ? `${sinRegistro} sin registro aún` : 'ninguno'}
          accent="var(--color-danger)"
        />
        <KPI
          label="Docentes hoy"
          value={docentesHoy}
          sub={clasesEnCurso.length > 0 ? `${clasesEnCurso.length} clase${clasesEnCurso.length > 1 ? 's' : ''} en curso` : 'marcaron asistencia'}
          accent="var(--color-primary)"
        />
      </div>

      {/* Barra de progreso de asistencia */}
      {totalAlum > 0 && (
        <div className="bg-surface border border-border rounded-3 px-5 py-3.5 shadow-1 flex items-center gap-4">
          <span className="text-[12.5px] font-medium text-text-mute w-32 shrink-0">Asistencia del día</span>
          <div className="flex-1 h-3 bg-surface3 rounded-full overflow-hidden flex">
            <div className="h-full bg-success transition-all" style={{ width: `${Math.round((presentes / totalAlum) * 100)}%` }} />
            <div className="h-full bg-warning transition-all" style={{ width: `${Math.round((tardanzas / totalAlum) * 100)}%` }} />
            <div className="h-full bg-danger transition-all" style={{ width: `${Math.round((ausentes / totalAlum) * 100)}%` }} />
          </div>
          <div className="flex gap-4 shrink-0 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />Puntual: {presentes}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />Tarde: {tardanzas}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />Falta: {ausentes}</span>
            {sinRegistro > 0 && (
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-surface3 border border-border inline-block" />Sin registro: {sinRegistro}</span>
            )}
          </div>
        </div>
      )}

      {/* Grid principal */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
        {/* Clases del día */}
        <Card
          title="Clases de hoy"
          subtitle={
            clasesHoy.length > 0
              ? `${clasesHoy.length} clase${clasesHoy.length > 1 ? 's' : ''} programadas · ${clasesEnCurso.length} en curso ahora`
              : 'Sin clases programadas hoy'
          }
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/horarios')}>
              <Calendar size={14} />Ver horarios
            </Btn>
          }
        >
          {clasesHoy.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-6 text-center">No hay clases programadas para hoy.</p>
          ) : (
            <div className="flex flex-col max-h-[360px] overflow-y-auto">
              {clasesHoy.map((c: any, i: number) => {
                const live = isLive(c.horaInicio, c.horaFin)
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'flex gap-3 items-center py-2.5 px-2 rounded-2 transition-colors',
                      i > 0 && 'border-t border-border-s',
                      live && 'bg-success-light',
                    )}
                  >
                    <div className={cn('font-mono text-[12.5px] font-semibold w-12 shrink-0', live ? 'text-success' : 'text-text')}>
                      {formatHora(c.horaInicio)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold leading-tight truncate">
                        {c.curso?.nombre ?? '—'}
                      </div>
                      <div className="text-[11.5px] text-text-mute truncate mt-0.5">
                        {c.docente ? `${c.docente.nombre} ${c.docente.apellidos}` : '—'}
                        {c.aula ? ` · ${c.aula.nombre}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {live ? (
                        <Pill tone="success" className="text-[10px] flex items-center gap-1">
                          <Dot tone="success" size={5} />En curso
                        </Pill>
                      ) : (
                        <span className="font-mono text-[11px] text-text-mute">
                          {formatHora(c.horaInicio)}–{formatHora(c.horaFin)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Panel derecho */}
        <div className="flex flex-col gap-3.5">
          {/* Últimas marcaciones */}
          <Card
            title="Últimas marcaciones"
            subtitle={`Hoy · actualiza cada 30s`}
            action={
              <button onClick={handleRefresh} className="text-[12px] text-primary font-medium hover:underline">
                Actualizar
              </button>
            }
          >
            {registros.length === 0 ? (
              <p className="text-[12.5px] text-text-mute py-4 text-center">Sin registros hoy.</p>
            ) : (
              <div className="flex flex-col max-h-[280px] overflow-y-auto">
                {registros.map((r: any, i: number) => {
                  const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
                  const nombre = persona
                    ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}`
                    : '—'
                  const estado = r.esAusente ? 'falta' : r.esTardanza ? 'tardanza' : 'puntual'
                  return (
                    <div key={r.id} className={cn('flex items-center gap-2.5 py-2', i > 0 && 'border-t border-border-s')}>
                      <Avatar name={nombre} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate leading-tight">{nombre}</div>
                        <div className="text-[10.5px] text-text-mute font-mono">
                          {r.esAusente ? 'Ausente' : formatHoraLocal(r.horaIngreso)}
                          {' · '}{timeAgo(r.createdAt)}
                        </div>
                      </div>
                      <Pill
                        tone={estado === 'puntual' ? 'success' : estado === 'tardanza' ? 'warning' : 'danger'}
                        className="text-[10px] shrink-0"
                      >
                        {estado === 'puntual' ? 'Puntual' : estado === 'tardanza' ? 'Tarde' : 'Falta'}
                      </Pill>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Acceso al registro de asistencia */}
          <Card title="Registro de asistencia" subtitle="Modo pantalla completa">
            <div className="flex flex-col gap-2.5 pt-1">
              <Btn
                className="w-full justify-center py-2.5"
                onClick={() => window.open('/vigilante', '_blank')}
              >
                <ScanLine size={15} />Abrir pantalla de registro
              </Btn>
              <p className="text-[11px] text-text-mute text-center leading-relaxed">
                Lector de código de barras USB en modo HID. Abre en una ventana nueva.
              </p>
            </div>
          </Card>

          {/* Cierre de turno */}
          <Card
            title="Cierre de turno"
            subtitle="Registra ausentes al finalizar el turno"
          >
            <div className="flex flex-col gap-2.5 pt-1">
              {cierreResult ? (
                <div className="rounded-2 px-3 py-2.5 text-[12.5px] bg-success-light text-success border border-success/20 text-center">
                  {cierreResult}
                  <button
                    onClick={() => setCierreResult(null)}
                    className="block w-full mt-2 text-[11px] text-text-mute hover:text-text underline"
                  >
                    Cerrar
                  </button>
                </div>
              ) : cierreTurno ? (
                <div className="rounded-2 px-3 py-3 bg-warning-light border border-warning/20 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-[12px] text-text leading-snug">
                      Se registrarán como <strong>ausentes</strong> todos los alumnos del turno{' '}
                      <strong>{cierreTurno === 'manana' ? 'mañana' : 'tarde'}</strong> sin asistencia hoy.
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      variant="secondary"
                      size="sm"
                      className="flex-1 justify-center"
                      onClick={() => setCierreTurno(null)}
                      disabled={cerrarTurnoMut.isPending}
                    >
                      Cancelar
                    </Btn>
                    <Btn
                      size="sm"
                      className="flex-1 justify-center bg-warning hover:bg-warning/90 border-warning"
                      onClick={handleCerrarTurno}
                      disabled={cerrarTurnoMut.isPending}
                    >
                      {cerrarTurnoMut.isPending ? 'Cerrando…' : 'Confirmar'}
                    </Btn>
                  </div>
                </div>
              ) : (
                <>
                  <Btn
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => setCierreTurno('manana')}
                  >
                    Cerrar turno mañana
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => setCierreTurno('tarde')}
                  >
                    Cerrar turno tarde
                  </Btn>
                  <p className="text-[11px] text-text-mute text-center leading-relaxed">
                    Marca como ausentes a los alumnos sin registro al terminar el turno.
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal overlay de confirmación — accesible desde cualquier parte de la página si se necesita */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PANTALLA ADMIN / DIRECTOR
   ═══════════════════════════════════════════════════════════════ */
function AdminInicio() {
  const { user } = useAuth()
  const router = useRouter()
  const { cicloActivo } = useCicloCtx()

  const firstName = user?.nombre?.split(' ')[0] ?? user?.email?.split('@')[0]?.split('.')[0] ?? 'usuario'
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  const now = new Date()
  const horaStr = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayDia = now.getDay() === 0 ? 7 : now.getDay()

  const cicloWeek = cicloActivo
    ? cicloWeekInfo(cicloActivo.fechaInicio, cicloActivo.fechaFin)
    : null
  const cicloTag = cicloActivo
    ? `Ciclo ${cicloActivo.nombre}, semana ${cicloWeek!.week} de ${cicloWeek!.total}`
    : ''

  const { data: reporte } = useQuery({
    queryKey: ['reportes', 'asistencia', '30d'],
    queryFn: () => api.get('/reportes/asistencia').then((r) => r.data),
    staleTime: 60_000,
  })

  // Stats en tiempo real del día de hoy (presentes, tardanzas, %)
  const { data: statsHoy } = useQuery({
    queryKey: ['asistencia', 'stats', 'admin-inicio'],
    queryFn: () => api.get('/asistencia/stats').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: alumnosData } = useQuery({
    queryKey: ['alumnos', 'dashboard'],
    queryFn: () => api.get('/alumnos', { params: { page: 1, limit: 100 } }).then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: docentesData } = useQuery({
    queryKey: ['docentes', 'dashboard'],
    queryFn: () => api.get('/docentes', { params: { page: 1, limit: 1 } }).then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: horariosData } = useQuery({
    queryKey: ['horarios', 'hoy', todayDia],
    queryFn: () => api.get('/horarios', { params: { dia_semana: todayDia, limit: 8 } }).then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: comunicadosData } = useQuery({
    queryKey: ['comunicados', 'recientes'],
    queryFn: () => api.get('/comunicados', { params: { page: 1, limit: 3 } }).then((r) => r.data),
    staleTime: 60_000,
  })

  const totalAlumnos     = alumnosData?.total ?? '—'
  const totalDocentes    = docentesData?.total ?? '—'
  const totalComunicados = comunicadosData?.total ?? 0

  // % de asistencia de HOY (tiempo real desde /asistencia/stats)
  const asistenciaHoyPct      = statsHoy?.pct_asistencia ?? 0
  const presentesHoy          = (statsHoy?.presentes ?? 0) + (statsHoy?.tardanzas ?? 0)
  const totalMatriculadosHoy  = statsHoy?.total_alumno ?? 0

  // Promedio histórico 30 días (para el gráfico semanal y comparativas)
  const asistenciaPct = reporte?.kpis?.asistencia_media ?? 0

  const alumnosRiesgo: any[] = React.useMemo(
    () =>
      (alumnosData?.data ?? [])
        .filter((a: any) => a.asistencia_pct < 75)
        .sort((a: any, b: any) => a.asistencia_pct - b.asistencia_pct)
        .slice(0, 4),
    [alumnosData],
  )

  const weekData = React.useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const jsDay = now.getDay()
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
    return days.map((day, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + mondayOffset + i)
      // Usar fecha local consistentemente para evitar desfase UTC
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const isToday = dateStr === todayStr
      // Para hoy: siempre usar stats en tiempo real (no el reporte que puede tener 0 o dato viejo)
      // Para días pasados: usar tendencia_30d del reporte
      const entry = isToday ? null : reporte?.tendencia_30d?.find((t: any) => t.fecha === dateStr)
      const v = isToday ? asistenciaHoyPct : (entry?.pct ?? 0)
      return { day: isToday ? `${day} ${d.getDate()}` : day, v, today: isToday }
    })
  }, [reporte, todayStr, asistenciaHoyPct])

  const porSeccion: any[] = reporte?.por_seccion ?? []
  const seccionMenor = porSeccion.length ? porSeccion.reduce((a, b) => (b.pct_asistencia < a.pct_asistencia ? b : a)) : null
  const seccionMayor = porSeccion.length ? porSeccion.reduce((a, b) => (b.pct_asistencia > a.pct_asistencia ? b : a)) : null

  const vsSemanaPasada = React.useMemo(() => {
    const tend = reporte?.tendencia_30d ?? []
    const thisWeek = tend.slice(-7).map((t: any) => t.pct)
    const lastWeek = tend.slice(-14, -7).map((t: any) => t.pct)
    if (!thisWeek.length || !lastWeek.length) return null
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
    return +(avg(thisWeek) - avg(lastWeek)).toFixed(1)
  }, [reporte])

  const clasesHoy: any[]           = horariosData?.data ?? []
  const comunicadosRecientes: any[] = comunicadosData?.data ?? []

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4">
      <PageHeader
        title={`${horaStr}, ${capitalized}`}
        crumbs={['Administración', 'Inicio']}
        action={
          <>
            <Btn variant="secondary" size="sm" onClick={() => router.push('/reportes')}>
              <Download size={14} />Exportar resumen
            </Btn>
            <Btn size="sm" onClick={() => router.push('/comunicados')}>
              <Plus size={14} />Comunicado rápido
            </Btn>
          </>
        }
      />

      <p className="text-[12.5px] text-text-mute m-0 px-1">
        <span className="text-text font-medium capitalize">{fechaStr}</span>
        {cicloTag ? ` · ${cicloTag}` : ''}
      </p>

      <div className="grid grid-cols-4 gap-3.5">
        <KPI
          label="Alumnos activos"
          value={totalMatriculadosHoy > 0 ? String(totalMatriculadosHoy) : String(totalAlumnos)}
          sub={totalMatriculadosHoy > 0 ? `${totalMatriculadosHoy} matriculados` : 'Cargando…'}
          accent="var(--color-primary)"
        />
        <KPI label="Docentes activos" value={String(totalDocentes)} sub="en el sistema" accent="var(--color-success)" />
        <KPI
          label="Asistencia hoy"
          value={statsHoy ? `${asistenciaHoyPct}%` : '—'}
          sub={statsHoy
            ? `${presentesHoy} de ${totalMatriculadosHoy} presentes`
            : 'Cargando…'}
          trend={vsSemanaPasada ?? undefined}
          accent="var(--color-info)"
        />
        <KPI label="Comunicados" value={String(totalComunicados)} sub={totalComunicados > 0 ? 'publicados en el sistema' : 'Sin comunicados'} accent="var(--color-danger)" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <Card
          title="Asistencia esta semana"
          subtitle="Promedio diario por ciclo y sección"
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/reportes')}>
              <ChevR size={14} />Ver reporte
            </Btn>
          }
        >
          <WeeklyBar data={weekData} />
          <div className="flex gap-4 mt-4 pt-3.5 border-t border-border-s">
            {[
              { label: 'Hoy', value: statsHoy ? `${asistenciaHoyPct}%` : '—', tone: 'success' as const },
              { label: 'Vs. semana pasada', value: vsSemanaPasada !== null ? `${vsSemanaPasada > 0 ? '+' : ''}${vsSemanaPasada}pts` : '—', tone: vsSemanaPasada !== null && vsSemanaPasada >= 0 ? ('primary' as const) : ('warning' as const) },
              { label: 'Aula menor', value: seccionMenor?.nombre ?? '—', sub: seccionMenor ? `${seccionMenor.pct_asistencia}%` : undefined, tone: 'warning' as const },
              { label: 'Aula mayor', value: seccionMayor?.nombre ?? '—', sub: seccionMayor ? `${seccionMayor.pct_asistencia}%` : undefined, tone: 'success' as const },
            ].map((s) => (
              <div key={s.label} className="flex-1">
                <div className="text-[11px] text-text-mute uppercase tracking-[0.05em] mb-1">{s.label}</div>
                <div className={cn('font-serif text-[22px] font-semibold', { 'text-success': s.tone === 'success', 'text-primary': s.tone === 'primary', 'text-warning': s.tone === 'warning' })}>
                  {s.value}
                </div>
                {s.sub && <div className="text-[11px] text-text-mute">{s.sub}</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Clases de hoy"
          subtitle={clasesHoy.length > 0 ? `${clasesHoy.length} clase${clasesHoy.length > 1 ? 's' : ''} programadas` : 'Sin clases programadas hoy'}
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/horarios')}>
              <Calendar size={14} />Horario
            </Btn>
          }
        >
          {clasesHoy.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-4 text-center">No hay clases programadas para hoy.</p>
          ) : (
            <div className="flex flex-col">
              {clasesHoy.slice(0, 6).map((c: any, i: number) => {
                const live = isLive(c.horaInicio, c.horaFin)
                return (
                  <div key={c.id} className={cn('flex gap-3 items-center py-2.5', i > 0 && 'border-t border-border-s')}>
                    <div className={cn('font-mono text-[12px] font-semibold w-11', live ? 'text-primary' : 'text-text')}>
                      {formatHora(c.horaInicio)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold mb-0.5 truncate">{c.curso?.nombre} · {c.aula?.nombre}</div>
                      <div className="text-[11.5px] text-text-mute truncate">
                        {c.docente ? `${c.docente.nombre} ${c.docente.apellidos}` : '—'}
                        {c.aula ? ` · ${c.aula?.nombre ?? c.aula}` : ''}
                      </div>
                    </div>
                    {live && (
                      <Pill tone="success" className="text-[10px] flex items-center gap-1">
                        <Dot tone="success" size={6} />En curso
                      </Pill>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Alumnos en riesgo" subtitle="Asistencia bajo 75%" action={<Btn variant="ghost" size="sm" onClick={() => router.push('/alumnos')}>Ver todos</Btn>}>
          {alumnosRiesgo.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-4 text-center">{alumnosData ? 'Sin alumnos en riesgo' : 'Cargando…'}</p>
          ) : (
            <div className="flex flex-col">
              {alumnosRiesgo.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2.5 py-2 border-t border-border-s first:border-t-0">
                  <Avatar name={`${a.nombre} ${a.apellidos}`} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{a.nombre} {a.apellidos}</div>
                    <div className="text-[11px] text-text-mute font-mono">{a.codigoBarras} · {a.aula?.nombre ?? '—'}</div>
                  </div>
                  <Pill tone={a.asistencia_pct < 70 ? 'danger' : 'warning'}>{a.asistencia_pct}%</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Últimos comunicados"
          subtitle="Panel + WhatsApp/SMS"
          action={<Btn variant="ghost" size="sm" onClick={() => router.push('/comunicados')}>Nuevo</Btn>}
        >
          {comunicadosRecientes.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-4 text-center">{comunicadosData ? 'Sin comunicados' : 'Cargando…'}</p>
          ) : (
            <div className="flex flex-col">
              {comunicadosRecientes.map((c: any, i: number) => {
                const canales: string[] = []
                if (c.canalSistema) canales.push('Panel')
                if (c.canalWhatsapp) canales.push('WhatsApp')
                if (!canales.length) canales.push('Panel')
                return (
                  <div key={c.id} className={cn('py-2.5', i > 0 && 'border-t border-border-s')}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-[12.5px] font-medium flex-1 line-clamp-2">{c.titulo}</div>
                      <span className="text-[10.5px] text-text-soft whitespace-nowrap">{timeAgo(c.createdAt)}</span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {canales.map((x) => <Pill key={x} tone="primary" className="text-[10px]">{x}</Pill>)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Estado del sistema" subtitle="Servicios y dispositivos">
          <div className="flex flex-col">
            {[
              { l: 'Base de datos',            s: 'Conectada',                                                                                                   t: 'success' as const },
              { l: 'Alumnos en sistema',        s: `${totalAlumnos} activos`,                                                                                    t: 'success' as const },
              { l: 'Docentes en sistema',       s: `${totalDocentes} activos`,                                                                                   t: 'success' as const },
              { l: 'Datos de asistencia (30d)', s: reporte ? `${reporte.kpis?.sesiones_registradas ?? 0} registros` : 'Cargando…',                               t: reporte ? 'success' as const : 'neutral' as const },
              { l: 'Comunicados publicados',    s: `${totalComunicados} en total`,                                                                               t: 'neutral' as const },
            ].map((r, i) => (
              <div key={i} className={cn('flex items-center gap-2.5 py-2', i > 0 && 'border-t border-border-s')}>
                <Dot tone={r.t} />
                <span className="text-[12.5px] flex-1">{r.l}</span>
                <span className="text-[11.5px] text-text-mute font-mono">{r.s}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PANTALLA DOCENTE
   ═══════════════════════════════════════════════════════════════ */
function DocenteInicio() {
  const { user } = useAuth()
  const router = useRouter()

  const now = new Date()
  const horaStr = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayDia = now.getDay() === 0 ? 7 : now.getDay()
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const docenteId = user?.docente?.id
  const displayName = user?.docente
    ? `${user.docente.nombre} ${user.docente.apellidos}`
    : user?.nombre
      ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}`
      : user?.email?.split('@')[0] ?? 'Docente'

  const { data: horariosHoy } = useQuery({
    queryKey: ['horarios', 'docente-inicio', todayDia, docenteId],
    queryFn: () =>
      api.get('/horarios', { params: { dia_semana: todayDia, docente_id: docenteId, limit: 20 } }).then((r) => r.data),
    enabled: Boolean(docenteId),
    staleTime: 60_000,
  })

  const { data: asistenciaPage } = useQuery({
    queryKey: ['asistencia', 'docente-inicio', docenteId],
    queryFn: () =>
      api.get('/asistencia', { params: { docente_id: docenteId, limit: 10 } }).then((r) => r.data),
    enabled: Boolean(docenteId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: comunicadosPage } = useQuery({
    queryKey: ['comunicados', 'docente-inicio'],
    queryFn: () => api.get('/comunicados', { params: { limit: 5 } }).then((r) => r.data),
    staleTime: 60_000,
  })

  const clasesHoy: any[]    = horariosHoy?.data ?? []
  const clasesEnCurso       = clasesHoy.filter((c: any) => isLive(c.horaInicio, c.horaFin))
  const proximaClase        = clasesHoy.find((c: any) => {
    const s = new Date(c.horaInicio).getUTCHours() * 60 + new Date(c.horaInicio).getUTCMinutes()
    const cur = now.getUTCHours() * 60 + now.getUTCMinutes()
    return s >= cur
  })
  const registros: any[]    = asistenciaPage?.data ?? []
  const comunicados: any[]  = comunicadosPage?.data ?? []

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4">
      <PageHeader
        title={`${horaStr}, ${displayName.split(' ')[0]}`}
        crumbs={['Docente', 'Inicio']}
      />

      <p className="text-[12.5px] text-text-mute m-0 px-1">
        <span className="text-text font-medium capitalize">{fechaStr}</span>
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3.5">
        <KPI
          label="Clases hoy"
          value={clasesHoy.length}
          sub={clasesEnCurso.length > 0 ? `${clasesEnCurso.length} en curso ahora` : 'programadas para hoy'}
          accent="var(--color-primary)"
        />
        <KPI
          label="Próxima clase"
          value={proximaClase ? formatHora(proximaClase.horaInicio) : '—'}
          sub={proximaClase ? `${proximaClase.curso?.nombre ?? '—'} · ${proximaClase.aula?.nombre ?? '—'}` : 'sin más clases hoy'}
          accent="var(--color-info)"
        />
        <KPI
          label="Mis marcaciones"
          value={registros.length}
          sub="últimas registradas"
          accent="var(--color-success)"
        />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
        {/* Clases del día */}
        <Card
          title="Mis clases de hoy"
          subtitle={clasesHoy.length > 0
            ? `${clasesHoy.length} clase${clasesHoy.length !== 1 ? 's' : ''} · ${clasesEnCurso.length} en curso`
            : 'Sin clases programadas'}
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/horarios')}>
              <Calendar size={14} />Ver horario completo
            </Btn>
          }
        >
          {clasesHoy.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-6 text-center">No tienes clases hoy.</p>
          ) : (
            <div className="flex flex-col">
              {clasesHoy.map((c: any, i: number) => {
                const live = isLive(c.horaInicio, c.horaFin)
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'flex gap-3 items-center py-2.5 px-2 rounded-2 transition-colors',
                      i > 0 && 'border-t border-border-s',
                      live && 'bg-success-light',
                    )}
                  >
                    <div className={cn('font-mono text-[12.5px] font-semibold w-12 shrink-0', live ? 'text-success' : 'text-text')}>
                      {formatHora(c.horaInicio)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold leading-tight truncate">
                        {c.curso?.nombre ?? '—'}
                      </div>
                      <div className="text-[11.5px] text-text-mute truncate mt-0.5">
                        {c.aula?.nombre ?? '—'}
                        {c.aula?.ciclo ? ` · ${c.aula.ciclo.nombre}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {live ? (
                        <Pill tone="success" className="text-[10px] flex items-center gap-1">
                          <Dot tone="success" size={5} />En curso
                        </Pill>
                      ) : (
                        <span className="font-mono text-[11px] text-text-mute">
                          {formatHora(c.horaInicio)}–{formatHora(c.horaFin)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Panel derecho */}
        <div className="flex flex-col gap-3.5">
          {/* Mis últimas marcaciones */}
          <Card
            title="Mis marcaciones"
            subtitle="Historial de asistencia reciente"
            action={
              <Btn variant="ghost" size="sm" onClick={() => router.push('/asistencia')}>
                Ver todo
              </Btn>
            }
          >
            {registros.length === 0 ? (
              <p className="text-[12.5px] text-text-mute py-4 text-center">Sin marcaciones registradas.</p>
            ) : (
              <div className="flex flex-col">
                {registros.slice(0, 5).map((r: any, i: number) => (
                  <div key={r.id} className={cn('flex items-center gap-2.5 py-2', i > 0 && 'border-t border-border-s')}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-text">
                        {new Date(r.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[10.5px] text-text-mute font-mono">
                        {formatHoraLocal(r.horaIngreso)}
                      </div>
                    </div>
                    <Pill
                      tone={r.esAusente ? 'danger' : r.esTardanza ? 'warning' : 'success'}
                      className="text-[10px] shrink-0"
                    >
                      {r.esAusente ? 'Ausente' : r.esTardanza ? 'Tardanza' : 'Puntual'}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Comunicados recientes */}
          <Card
            title="Comunicados"
            subtitle="Últimos publicados"
            action={
              <Btn variant="ghost" size="sm" onClick={() => router.push('/comunicados')}>
                Ver todos
              </Btn>
            }
          >
            {comunicados.length === 0 ? (
              <p className="text-[12.5px] text-text-mute py-4 text-center">Sin comunicados.</p>
            ) : (
              <div className="flex flex-col">
                {comunicados.map((c: any, i: number) => (
                  <div key={c.id} className={cn('py-2', i > 0 && 'border-t border-border-s')}>
                    <div className="text-[12.5px] font-medium line-clamp-2">{c.titulo}</div>
                    <div className="text-[11px] text-text-mute mt-0.5">{timeAgo(c.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER DE ROLES
   ═══════════════════════════════════════════════════════════════ */
export default function InicioPage() {
  const { user } = useAuth()
  if (user?.rol === 'vigilante') return <VigilanteInicio />
  if (user?.rol === 'docente')   return <DocenteInicio />
  return <AdminInicio />
}
