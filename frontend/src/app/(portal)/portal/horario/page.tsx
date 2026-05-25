'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useHorarios, type Horario } from '@/hooks/use-horarios'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { Download, Calendar, ChevL, ChevR } from '@/components/icons'

const DIA_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

async function exportarHorarioPDF(horarios: Horario[], aulaLabel: string) {
  const fecha = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

  function t(dt: string | Date | undefined | null): string {
    if (!dt) return '00:00'
    const s = typeof dt === 'string' ? dt : dt.toISOString()
    return s.includes('T') ? s.slice(11, 16) : s.slice(0, 5)
  }

  const slots = Array.from(new Set(horarios.map((h) => t(h.horaInicio)))).sort()

  const encabezado = `
    <div style="display:flex;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1e3a5f">
      <div style="background:#7B1D1D;color:#fff;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-weight:bold;font-size:9px;text-align:center;flex-shrink:0">UNASAM</div>
      <div style="width:1px;height:44px;background:#e5e7eb;margin:0 8px;flex-shrink:0"></div>
      <div style="background:#1e3a5f;color:#fff;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-weight:bold;font-size:9px;flex-shrink:0">CPre</div>
      <div style="margin-left:10px;flex:1">
        <div style="font-weight:bold;font-size:15px;color:#1e3a5f">Centro Preuniversitario</div>
        <div style="font-size:8px;color:#6b7280;margin-top:2px">Universidad Nacional de San Martín · Sistema de Gestión Académica</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:8px;color:#6b7280">Generado: ${fecha}</div>
        <div style="background:#4a6fa5;color:#fff;padding:2px 8px;border-radius:10px;font-size:7px;font-weight:bold;display:inline-block;margin-top:4px">HORARIO OFICIAL</div>
      </div>
    </div>`

  const rows = slots.map((s) => {
    const cells = [1, 2, 3, 4, 5, 6].map((d) => {
      const h = horarios.find((x) => x.diaSemana === d && t(x.horaInicio) === s)
      if (!h) return '<td></td>'
      const doc = h.docente ? `<div style="color:#64748b;font-size:10px">${h.docente.nombre} ${h.docente.apellidos}</div>` : ''
      return `<td><div style="padding:3px 5px"><div style="font-weight:600;font-size:10px">${h.curso?.nombre ?? '—'}</div>${doc}</div></td>`
    }).join('')
    return `<tr><td class="hora">${s}</td>${cells}</tr>`
  }).join('')

  const css = `
    @page { size: A4 landscape; margin: 1.2cm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
    h2 { font-size: 14px; font-weight: 700; margin: 0 0 3px; }
    .sub { font-size: 10px; color: #64748b; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; font-size: 9.5px; font-weight: 600; text-transform: uppercase;
         letter-spacing: 0.04em; color: #475569; padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; }
    th.hora { text-align: left; width: 52px; }
    td { border: 1px solid #e2e8f0; padding: 3px; vertical-align: top; min-height: 60px; }
    td.hora { font-family: monospace; font-size: 10px; font-weight: 600; color: #94a3b8;
              background: #f8fafc; padding: 5px 6px; border-right: 1px solid #cbd5e1; }
  `

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Mi Horario — Centro Preuniversitario</title><style>${css}</style></head>
    <body>
      ${encabezado}
      <h2>Mi Horario Semanal — ${aulaLabel}</h2>
      <p class="sub">Ciclo 2026-I · ${fecha}</p>
      <table>
        <thead><tr><th class="hora">Hora</th>${DIA_FULL.map((d) => `<th>${d}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`

  const w = window.open('', '_blank', 'width=960,height=720')
  if (!w) { alert('Habilita las ventanas emergentes para exportar'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

/* ─── helpers ─────────────────────────────────────────────────── */
const DIAS_LABEL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const HOUR_SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

const COURSE_COLORS = [
  'oklch(0.55 0.13 240)',
  'oklch(0.55 0.13 280)',
  'oklch(0.55 0.13 200)',
  'oklch(0.55 0.13 110)',
  'oklch(0.55 0.13 30)',
  'oklch(0.55 0.13 350)',
]

function colorFor(name: string) {
  let h = 0
  for (const c of name) h = ((h * 31 + c.charCodeAt(0)) >>> 0)
  return COURSE_COLORS[h % COURSE_COLORS.length]
}

function fmtTime(t?: string | null) {
  if (!t) return '—'
  if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5)
  const d = new Date(t)
  return isNaN(d.getTime()) ? t : d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function getWeekDates(offsetWeeks = 0) {
  const now = new Date()
  const dayOfWeek = now.getDay() || 7 // Mon=1
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1 + offsetWeeks * 7)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isToday(date: Date) {
  const t = new Date()
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()
}

function horarioInSlot(horarios: Horario[], dia: number, slot: string): Horario | undefined {
  return horarios.find((h) => {
    if (h.diaSemana !== dia) return false
    const hStart = fmtTime(h.horaInicio)
    return hStart.startsWith(slot.slice(0, 2))
  })
}

/* ─── page ─────────────────────────────────────────────────────── */
export default function PortalHorarioPage() {
  const { user } = useAuth()
  const alumno = user?.alumno
  const aulaId: string | undefined = (alumno as any)?.aulaId ?? undefined

  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = getWeekDates(weekOffset)

  const { data: horariosRes, isLoading } = useHorarios(
    aulaId ? { aula_id: aulaId } : {}
  )

  const allHorarios: Horario[] = (horariosRes as any)?.data ?? []

  // Collect unique docentes
  const docentes = Array.from(
    new Map(allHorarios.map((h) => [h.docenteId, h.docente])).values()
  ).filter(Boolean)

  // Week range label
  const firstDay = weekDates[0]
  const lastDay = weekDates[5]
  const weekLabel = firstDay.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
    + ' al '
    + lastDay.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })

  return (
    <div className="px-8 pt-7 pb-8">
      {/* Hero */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] text-text-mute mb-1">
            Aula {aulaId ? 'activa' : '—'} · Ciclo 2026-I
          </div>
          <h1 className="m-0 font-serif font-semibold text-[30px] tracking-[-0.02em] leading-[1.1]">
            Mi horario
          </h1>
        </div>
        <div className="flex gap-2">
          <Btn
            variant="secondary"
            icon={<Download size={14} />}
            size="sm"
            onClick={() => exportarHorarioPDF(allHorarios, aulaId ? 'Aula activa' : 'Sin aula')}
          >PDF</Btn>
          <Btn variant="secondary" icon={<Calendar size={14} />} size="sm">Añadir a calendario</Btn>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <Btn variant="secondary" size="sm" icon={<ChevL size={14} />} onClick={() => setWeekOffset((w) => w - 1)} />
        <span className="font-serif text-[17px] font-semibold">Semana del {weekLabel}</span>
        <Btn variant="secondary" size="sm" icon={<ChevR size={14} />} onClick={() => setWeekOffset((w) => w + 1)} />
        {weekOffset === 0 && <Pill tone="primary">Semana actual</Pill>}
        <div className="flex-1" />
      </div>

      {/* Grid */}
      <div
        className="bg-surface border border-border rounded-3 shadow-1 overflow-hidden mb-4"
      >
        {/* Header row */}
        <div
          className="grid border-b border-border bg-surface2"
          style={{ gridTemplateColumns: '70px repeat(6, 1fr)' }}
        >
          <div className="px-2 py-2.5 text-[11px] font-semibold text-text-mute uppercase tracking-[0.05em]">Hora</div>
          {weekDates.map((d, i) => (
            <div key={i} className="px-2 py-2.5 text-center">
              <div
                className="text-[13px] font-semibold"
                style={{ color: isToday(d) ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                {DIAS_SHORT[i + 1]}
              </div>
              <div
                className="text-[11px] font-mono mt-0.5"
                style={{ color: isToday(d) ? 'var(--color-primary)' : 'var(--color-text-mute)' }}
              >
                {d.getDate()} {d.toLocaleDateString('es-PE', { month: 'short' })}
              </div>
            </div>
          ))}
        </div>

        {/* Hour rows */}
        {isLoading ? (
          <div className="py-12 text-center text-text-mute text-[13px]">Cargando horario…</div>
        ) : (
          HOUR_SLOTS.map((slot) => (
            <div
              key={slot}
              className="grid"
              style={{
                gridTemplateColumns: '70px repeat(6, 1fr)',
                borderTop: '1px solid var(--color-border-s)',
                minHeight: 88,
              }}
            >
              <div
                className="px-2 py-2.5 font-mono text-[11px] font-semibold text-text-mute"
                style={{ borderRight: '1px solid var(--color-border-s)' }}
              >
                {slot}
              </div>
              {[1, 2, 3, 4, 5, 6].map((dia) => {
                const h = horarioInSlot(allHorarios, dia, slot)
                const col = h ? colorFor(h.curso?.nombre ?? '') : ''
                return (
                  <div
                    key={dia}
                    className="p-1"
                    style={{ borderRight: dia < 6 ? '1px solid var(--color-border-s)' : 'none' }}
                  >
                    {h && (
                      <div
                        className="rounded-2 p-1.5 h-full flex flex-col gap-0.5"
                        style={{
                          background: `color-mix(in oklch, ${col} 10%, white)`,
                          border: `1px solid ${col}`,
                          borderLeft: `3px solid ${col}`,
                        }}
                      >
                        <div className="text-[11.5px] font-semibold text-text leading-tight">
                          {h.curso?.nombre ?? '—'}
                        </div>
                        <div className="text-[10px] text-text-mute">
                          {h.docente ? `${h.docente.nombre} ${h.docente.apellidos}` : '—'}
                        </div>
                        {h.aula && (
                          <div className="mt-auto text-[9.5px] font-mono font-semibold" style={{ color: col }}>
                            {h.aula}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Mis docentes">
          <div className="px-4 pb-3">
            {docentes.length === 0 && (
              <p className="text-[13px] text-text-mute py-3 text-center">Sin docentes asignados.</p>
            )}
            {docentes.map((d, i) => {
              const h = allHorarios.find((x) => x.docenteId === d?.id)
              return (
                <div
                  key={d?.id ?? i}
                  className="flex items-center gap-2.5 py-2"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border-s)' : 'none' }}
                >
                  <Avatar name={`${d?.nombre ?? ''} ${d?.apellidos ?? ''}`} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold truncate">
                      {d?.nombre} {d?.apellidos}
                    </div>
                    <div className="text-[11px] text-text-mute">
                      {h?.curso?.nombre ?? '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Próximas evaluaciones">
          <div className="px-4 pb-3">
            <p className="text-[13px] text-text-mute py-3 text-center">
              Sin evaluaciones programadas.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
