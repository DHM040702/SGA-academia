'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useAsistencia } from '@/hooks/use-asistencia'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Btn } from '@/components/ui/btn'
import { ChevL, ChevR, Download } from '@/components/icons'

async function exportarAsistenciaPersonal(
  records: any[],
  nombre: string,
  total: number,
  puntuales: number,
  tardanzas: number,
) {
  const [{ pdf }, { AsistenciaListaPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/reportes/asistencia-lista-pdf'),
  ])
  const logoUrl       = `${window.location.origin}/logo.png`
  const logoUnasamUrl = `${window.location.origin}/logo-unasam.png`
  const kpis = [
    { label: 'Total sesiones', value: total,    color: '#1e3a5f' },
    { label: 'Puntuales',      value: puntuales, color: '#166534' },
    { label: 'Tardanzas',      value: tardanzas, color: '#92400e' },
    { label: 'Asistencia',     value: `${total > 0 ? Math.round((puntuales / total) * 100) : 0}%`, color: '#4a6fa5' },
  ]
  const element = AsistenciaListaPDF({
    titulo:    'Mi Asistencia',
    subtitulo: `Historial completo — ${nombre}`,
    records,
    modo:      'personal',
    kpis,
    logoUrl,
    logoUnasamUrl,
  })
  const blob = await pdf(element).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `mi-asistencia.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── helpers ─────────────────────────────────────────────────── */
function fmtTime(t?: string | null) {
  if (!t) return '—'
  if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5)
  const d = new Date(t)
  return isNaN(d.getTime()) ? t : d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function getMonthDays(year: number, month: number) {
  // Returns array of day objects for the calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const days: (number | null)[] = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)
  return days
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/* ─── page ─────────────────────────────────────────────────────── */
export default function PortalAsistenciaPage() {
  const { user } = useAuth()
  const alumno = user?.alumno
  const alumnoId: string | undefined = alumno?.id

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const { data: asistencias, isLoading } = useAsistencia(
    alumnoId ? { alumno_id: alumnoId, limit: 100 } : {}
  )

  const records = asistencias?.data ?? []
  const total = records.length
  const puntuales = records.filter((r) => !r.esTardanza).length
  const tardanzas = records.filter((r) => r.esTardanza).length
  const pct = total > 0 ? Math.round((puntuales / total) * 100) : 0

  // Build attendance map by date
  const byDate = new Map<string, typeof records[0]>()
  for (const r of records) {
    const key = r.fecha?.split('T')[0] ?? r.fecha
    if (key) byDate.set(key, r)
  }

  const calDays = getMonthDays(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function dayStatus(day: number) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return byDate.get(key)
  }

  return (
    <div className="px-8 pt-7 pb-8">
      {/* Hero */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] text-text-mute mb-1">Ciclo 2026-I · seguimiento personal</div>
          <h1 className="m-0 font-serif font-semibold text-[30px] tracking-[-0.02em] leading-[1.1]">
            Mi asistencia
          </h1>
        </div>
        <Btn
          variant="secondary"
          icon={<Download size={14} />}
          size="sm"
          onClick={() => exportarAsistenciaPersonal(
            records,
            alumno ? `${alumno.nombre} ${alumno.apellidos}` : 'Alumno',
            total, puntuales, tardanzas,
          )}
        >Exportar PDF</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <KPI label="Asistencia ciclo" value={`${pct}%`} sub={`${puntuales} / ${total} sesiones`} accent="var(--color-success)" />
        <KPI label="Sesiones puntuales" value={puntuales} sub="del ciclo" accent="var(--color-primary)" />
        <KPI label="Tardanzas" value={tardanzas} sub="en el ciclo" accent="var(--color-warning)" />
        <KPI label="Ausencias" value={total - puntuales - tardanzas > 0 ? total - puntuales - tardanzas : 0} sub="no justificadas" accent="var(--color-danger)" />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '320px 1fr' }}>
        {/* Calendar */}
        <Card>
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={prevMonth}
                className="p-1 text-text-mute hover:text-text transition-colors bg-transparent border-none cursor-pointer"
              >
                <ChevL size={16} />
              </button>
              <span className="flex-1 text-center font-semibold text-[14px]">
                {MONTHS_ES[viewMonth]} {viewYear}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 text-text-mute hover:text-text transition-colors bg-transparent border-none cursor-pointer"
              >
                <ChevR size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-text-mute py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const rec = dayStatus(day)
                const today = new Date()
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

                let bg = 'transparent'
                let color = 'var(--color-text)'
                if (rec) {
                  bg = rec.esTardanza ? 'var(--color-warning)' : 'var(--color-success)'
                  color = '#fff'
                }
                if (isToday && !rec) {
                  bg = 'var(--color-primary-light)'
                  color = 'var(--color-primary)'
                }

                return (
                  <div
                    key={day}
                    className="w-full aspect-square flex items-center justify-center rounded-full text-[12px] font-medium cursor-default"
                    style={{ background: bg, color, fontWeight: isToday ? 700 : 500 }}
                  >
                    {day}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-3 pt-3 mt-2 border-t border-border-s text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-success inline-block" /> Puntual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-warning inline-block" /> Tardanza
              </span>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card title="Historial detallado" subtitle={`${total} registros`}>
          {isLoading ? (
            <div className="py-10 text-center text-text-mute text-[13px]">Cargando…</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {['Fecha', 'Hora ingreso', 'Estado', 'Tipo', 'Observación'].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3.5 py-8 text-center text-text-mute text-[13px]">
                      Sin registros de asistencia
                    </td>
                  </tr>
                )}
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-border-s hover:bg-surface2">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute">
                      {new Date(r.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">
                      {fmtTime(r.horaIngreso)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone={r.esTardanza ? 'warning' : 'success'}>
                        <Dot tone={r.esTardanza ? 'warning' : 'success'} size={6} />
                        {r.esTardanza ? 'Tardanza' : 'Puntual'}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-mute">
                      {r.esManual ? <Pill tone="neutral">Manual</Pill> : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text-mute">
                      {r.motivoManual ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
