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
import api from '@/lib/api'
import { Download, Plus, ChevR, Calendar } from '@/components/icons'
import { cn } from '@/lib/utils'

/* ── Weekly bar chart ─────────────────────────────────────────── */
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

/* ── Helpers ──────────────────────────────────────────────────── */
function formatHora(isoTime: string | null | undefined): string {
  if (!isoTime) return '--:--'
  const d = new Date(isoTime)
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
}

function isLive(horaInicio: string, horaFin: string): boolean {
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const ini = new Date(horaInicio)
  const fin = new Date(horaFin)
  const s = ini.getUTCHours() * 60 + ini.getUTCMinutes()
  const e = fin.getUTCHours() * 60 + fin.getUTCMinutes()
  return cur >= s && cur <= e
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'hace < 1h'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d}d`
}

/* ── Dashboard ────────────────────────────────────────────────── */
export default function InicioPage() {
  const { user } = useAuth()
  const router = useRouter()

  const firstName = user?.email?.split('@')[0]?.split('.')[0] ?? 'usuario'
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  const now = new Date()
  const horaStr = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayStr = now.toISOString().split('T')[0]
  // 1=Lun … 7=Dom (nuestro sistema), JS: 0=Dom … 6=Sáb
  const todayDia = now.getDay() === 0 ? 7 : now.getDay()

  /* ── Queries ─────────────────────────────────────────────────── */
  const { data: reporte } = useQuery({
    queryKey: ['reportes', 'asistencia', '30d'],
    queryFn: () => api.get('/reportes/asistencia').then((r) => r.data),
    staleTime: 60_000,
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

  /* ── Datos derivados ─────────────────────────────────────────── */
  const totalAlumnos = alumnosData?.total ?? '—'
  const totalDocentes = docentesData?.total ?? '—'
  const asistenciaPct = reporte?.kpis?.asistencia_media ?? 0
  const totalComunicados = comunicadosData?.total ?? 0

  const alumnosRiesgo: any[] = React.useMemo(
    () =>
      (alumnosData?.data ?? [])
        .filter((a: any) => a.asistencia_pct < 75)
        .sort((a: any, b: any) => a.asistencia_pct - b.asistencia_pct)
        .slice(0, 4),
    [alumnosData],
  )

  // Gráfica semanal: Lun–Sáb de la semana actual
  const weekData = React.useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const jsDay = now.getDay() // 0=Dom
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
    return days.map((day, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + mondayOffset + i)
      const dateStr = d.toISOString().split('T')[0]
      const entry = reporte?.tendencia_30d?.find((t: any) => t.fecha === dateStr)
      const isToday = dateStr === todayStr
      // Si hoy no tiene entrada en tendencia_30d, usa asistenciaPct del KPI como fallback
      const v = entry?.pct ?? (isToday && asistenciaPct > 0 ? asistenciaPct : 0)
      return { day: isToday ? `${day} ${d.getDate()}` : day, v, today: isToday }
    })
  }, [reporte, todayStr, asistenciaPct])

  // Stats de sección
  const porSeccion: any[] = reporte?.por_seccion ?? []
  const seccionMenor = porSeccion.length
    ? porSeccion.reduce((a, b) => (b.pct_asistencia < a.pct_asistencia ? b : a))
    : null
  const seccionMayor = porSeccion.length
    ? porSeccion.reduce((a, b) => (b.pct_asistencia > a.pct_asistencia ? b : a))
    : null

  // Comparación vs semana pasada
  const vsSemanaPasada = React.useMemo(() => {
    const tend = reporte?.tendencia_30d ?? []
    const thisWeek = tend.slice(-7).map((t: any) => t.pct)
    const lastWeek = tend.slice(-14, -7).map((t: any) => t.pct)
    if (!thisWeek.length || !lastWeek.length) return null
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
    return +(avg(thisWeek) - avg(lastWeek)).toFixed(1)
  }, [reporte])

  const clasesHoy: any[] = horariosData?.data ?? []
  const comunicadosRecientes: any[] = comunicadosData?.data ?? []

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4">
      {/* Page header */}
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

      {/* Date line */}
      <p className="text-[12.5px] text-text-mute m-0 px-1">
        <span className="text-text font-medium capitalize">{fechaStr}</span>
        {' · '}Ciclo 2026-I, semana 5 de 16
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5">
        <KPI
          label="Alumnos activos"
          value={String(totalAlumnos)}
          sub={totalAlumnos !== '—' ? `${totalAlumnos} matriculados` : 'Cargando…'}
          trend={2}
          accent="var(--color-primary)"
        />
        <KPI
          label="Docentes activos"
          value={String(totalDocentes)}
          sub="en el sistema"
          accent="var(--color-success)"
        />
        <KPI
          label="Asistencia hoy"
          value={asistenciaPct > 0 ? `${asistenciaPct}%` : '—'}
          sub={
            asistenciaPct > 0 && totalAlumnos !== '—'
              ? `${Math.round((Number(totalAlumnos) * asistenciaPct) / 100)} presentes`
              : 'Sin registros hoy'
          }
          trend={vsSemanaPasada ?? undefined}
          accent="var(--color-info)"
        />
        <KPI
          label="Comunicados"
          value={String(totalComunicados)}
          sub={totalComunicados > 0 ? 'publicados en el sistema' : 'Sin comunicados'}
          accent="var(--color-danger)"
        />
      </div>

      {/* Main row */}
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        {/* Attendance chart */}
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
              {
                label: 'Promedio semana',
                value: asistenciaPct > 0 ? `${asistenciaPct}%` : '—',
                tone: 'success' as const,
              },
              {
                label: 'Vs. semana pasada',
                value: vsSemanaPasada !== null ? `${vsSemanaPasada > 0 ? '+' : ''}${vsSemanaPasada}pts` : '—',
                tone: vsSemanaPasada !== null && vsSemanaPasada >= 0 ? ('primary' as const) : ('warning' as const),
              },
              {
                label: 'Aula menor',
                value: seccionMenor?.nombre ?? '—',
                sub: seccionMenor ? `${seccionMenor.pct_asistencia}%` : undefined,
                tone: 'warning' as const,
              },
              {
                label: 'Aula mayor',
                value: seccionMayor?.nombre ?? '—',
                sub: seccionMayor ? `${seccionMayor.pct_asistencia}%` : undefined,
                tone: 'success' as const,
              },
            ].map((s) => (
              <div key={s.label} className="flex-1">
                <div className="text-[11px] text-text-mute uppercase tracking-[0.05em] mb-1">{s.label}</div>
                <div
                  className={cn('font-serif text-[22px] font-semibold', {
                    'text-success': s.tone === 'success',
                    'text-primary': s.tone === 'primary',
                    'text-warning': s.tone === 'warning',
                  })}
                >
                  {s.value}
                </div>
                {s.sub && <div className="text-[11px] text-text-mute">{s.sub}</div>}
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming classes */}
        <Card
          title="Clases de hoy"
          subtitle={
            clasesHoy.length > 0
              ? `${clasesHoy.length} clase${clasesHoy.length > 1 ? 's' : ''} programadas`
              : 'Sin clases programadas hoy'
          }
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
                  <div
                    key={c.id}
                    className={cn('flex gap-3 items-center py-2.5', i > 0 && 'border-t border-border-s')}
                  >
                    <div
                      className={cn(
                        'font-mono text-[12px] font-semibold w-11',
                        live ? 'text-primary' : 'text-text',
                      )}
                    >
                      {formatHora(c.horaInicio)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold mb-0.5 truncate">
                        {c.curso?.nombre} · {c.seccion?.nombre}
                      </div>
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

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* At-risk students */}
        <Card
          title="Alumnos en riesgo"
          subtitle="Asistencia bajo 75%"
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/alumnos')}>
              Ver todos
            </Btn>
          }
        >
          {alumnosRiesgo.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-4 text-center">
              {alumnosData ? 'Sin alumnos en riesgo' : 'Cargando…'}
            </p>
          ) : (
            <div className="flex flex-col">
              {alumnosRiesgo.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2.5 py-2 border-t border-border-s first:border-t-0"
                >
                  <Avatar name={`${a.nombre} ${a.apellidos}`} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">
                      {a.nombre} {a.apellidos}
                    </div>
                    <div className="text-[11px] text-text-mute font-mono">
                      {a.codigoBarras} · {a.seccion?.nombre ?? '—'}
                    </div>
                  </div>
                  <Pill tone={a.asistencia_pct < 70 ? 'danger' : 'warning'}>{a.asistencia_pct}%</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent comunicados */}
        <Card
          title="Últimos comunicados"
          subtitle="Panel + WhatsApp/SMS"
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/comunicados')}>
              Nuevo
            </Btn>
          }
        >
          {comunicadosRecientes.length === 0 ? (
            <p className="text-[12.5px] text-text-mute py-4 text-center">
              {comunicadosData ? 'Sin comunicados' : 'Cargando…'}
            </p>
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
                      <span className="text-[10.5px] text-text-soft whitespace-nowrap">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {canales.map((x) => (
                        <Pill key={x} tone="primary" className="text-[10px]">
                          {x}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* System status */}
        <Card title="Estado del sistema" subtitle="Servicios y dispositivos">
          <div className="flex flex-col">
            {[
              { l: 'Base de datos',             s: 'Conectada',       t: 'success' as const },
              { l: 'Alumnos en sistema',         s: `${totalAlumnos} activos`, t: 'success' as const },
              { l: 'Docentes en sistema',        s: `${totalDocentes} activos`, t: 'success' as const },
              { l: 'Datos de asistencia (30d)',  s: reporte ? `${reporte.kpis?.sesiones_registradas ?? 0} registros` : 'Cargando…', t: reporte ? 'success' as const : 'neutral' as const },
              { l: 'Comunicados publicados',     s: `${totalComunicados} en total`, t: 'neutral' as const },
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
