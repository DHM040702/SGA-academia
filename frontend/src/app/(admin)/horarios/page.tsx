'use client'

import { useState } from 'react'
import { useHorarios, useConflictosHorario } from '@/hooks/use-horarios'
import { useAulas } from '@/hooks/use-ciclos'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Download, AlertTriangle, MoreHorizontal } from '@/components/icons'
import type { Horario } from '@/hooks/use-horarios'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIA_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Group horarios into time slots
function getSlots(horarios: Horario[]): string[] {
  const times = new Set<string>()
  horarios.forEach((h) => {
    const t = typeof h.horaInicio === 'string' ? h.horaInicio.slice(11, 16) : '00:00'
    times.add(t)
  })
  return Array.from(times).sort()
}

const CURSO_COLORS: Record<string, string> = {}
const PALETTE = [
  'oklch(0.55 0.13 240)', 'oklch(0.55 0.13 280)', 'oklch(0.55 0.13 200)',
  'oklch(0.55 0.13 145)', 'oklch(0.55 0.13 110)', 'oklch(0.55 0.13 30)',
  'oklch(0.55 0.13 60)',  'oklch(0.55 0.13 170)',
]
let colorIdx = 0
function cursoColor(nombre: string) {
  if (!CURSO_COLORS[nombre]) {
    CURSO_COLORS[nombre] = PALETTE[colorIdx % PALETTE.length]
    colorIdx++
  }
  return CURSO_COLORS[nombre]
}

export default function HorariosPage() {
  const [aulaId, setAulaId] = useState<string>('')
  const { data: secciones = [] } = useAulas()
  const { data: horariosPage, isLoading } = useHorarios({ aula_id: aulaId || undefined })
  const { data: conflictos = [] } = useConflictosHorario()

  const horarios: Horario[] = (horariosPage as any)?.data ?? horariosPage ?? []
  const slots = getSlots(horarios)

  function getCell(dia: number, slot: string) {
    return horarios.filter((h) => {
      const hSlot = typeof h.horaInicio === 'string' ? h.horaInicio.slice(11, 16) : '00:00'
      return h.diaSemana === dia && hSlot === slot
    })
  }

  const isConflicto = (id: string) => conflictos.some((c) => c.id === id)

  return (
    <>
      <PageHeader
        title="Horarios"
        crumbs={[{ label: 'Horarios' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm">
              Exportar PDF
            </Btn>
            <Btn icon={<Plus size={14} />} size="sm">
              Asignar clase
            </Btn>
          </>
        }
      />

      <div className="p-7 grid gap-3.5" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* Main grid */}
        <div className="flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex gap-2.5 items-center">
            <select
              value={aulaId}
              onChange={(e) => setAulaId(e.target.value)}
              className="px-3 py-1.5 text-[13px] border border-border rounded-2 bg-surface"
            >
              <option value="">Todas las secciones</option>
              {secciones.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <div className="flex-1" />
            {conflictos.length > 0 && (
              <Pill tone="danger">
                <Dot tone="danger" size={6} />
                {conflictos.length} conflicto{conflictos.length > 1 ? 's' : ''} detectado{conflictos.length > 1 ? 's' : ''}
              </Pill>
            )}
          </div>

          {/* Conflict alert */}
          {conflictos.length > 0 && (
            <div className="flex gap-3 p-3 bg-danger-l border border-danger rounded-2 items-center">
              <AlertTriangle size={16} className="text-danger shrink-0" />
              <div className="flex-1 text-[12.5px]">
                <strong className="text-danger">Conflicto de horario:</strong>{' '}
                <span>Hay {conflictos.length} horario{conflictos.length > 1 ? 's' : ''} con superposición. Revise y corrija.</span>
              </div>
              <Btn variant="secondary" size="sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                Resolver
              </Btn>
            </div>
          )}

          {/* Grid */}
          <div className="bg-surface border border-border rounded-3 shadow-1 overflow-auto">
            {isLoading ? (
              <div className="text-center py-10 text-text-mute text-[13px]">Cargando horarios…</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-10 text-text-mute text-[13px]">
                No hay horarios registrados{aulaId ? ' para esta aula' : ''}.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border">
                    <th className="px-2 py-2.5 text-[11px] font-semibold text-text-mute uppercase tracking-[0.05em] w-[70px] text-left">
                      Hora
                    </th>
                    {DIA_FULL.map((d) => (
                      <th key={d} className="px-2 py-2.5 text-[11px] font-semibold text-text text-center">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot} className="border-t border-border-s" style={{ minHeight: 96 }}>
                      <td className="px-2 py-2.5 font-mono text-[11px] font-semibold text-text-mute border-r border-border-s align-top">
                        {slot}
                      </td>
                      {[1, 2, 3, 4, 5, 6].map((dia) => {
                        const cells = getCell(dia, slot)
                        return (
                          <td key={dia} className="p-1 border-r border-border-s align-top" style={{ minWidth: 110, height: 90 }}>
                            {cells.map((h) => {
                              const col = cursoColor(h.curso.nombre)
                              const conflicto = isConflicto(h.id)
                              return (
                                <div
                                  key={h.id}
                                  className="rounded-2 p-1.5 h-full flex flex-col gap-0.5 cursor-pointer text-[11px]"
                                  style={{
                                    background: conflicto ? 'var(--color-danger-l)' : `color-mix(in oklch, ${col} 12%, white)`,
                                    border: `1px solid ${conflicto ? 'var(--color-danger)' : col}`,
                                    borderLeft: `3px solid ${conflicto ? 'var(--color-danger)' : col}`,
                                  }}
                                >
                                  <div className="font-semibold text-text leading-tight">{h.curso.nombre}</div>
                                  <div className="text-text-mute leading-tight">{h.docente.nombre} {h.docente.apellidos}</div>
                                  <div className="mt-auto flex items-center justify-between gap-1">
                                    <span
                                      className="font-mono font-semibold"
                                      style={{ color: conflicto ? 'var(--color-danger)' : col }}
                                    >
                                      {h.aula ?? 'Sin aula'}
                                    </span>
                                    {conflicto && <AlertTriangle size={11} className="text-danger" />}
                                  </div>
                                </div>
                              )
                            })}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3">
          <Card title="Secciones" subtitle="Resumen">
            <div className="flex flex-col divide-y divide-border-s">
              {secciones.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 py-2">
                  <Dot tone="success" />
                  <div className="flex-1 text-[12.5px]">{s.nombre}</div>
                  <span className="font-mono text-[11.5px] text-text-mute">{s._count?.horarios ?? 0}h</span>
                </div>
              ))}
              {secciones.length === 0 && (
                <div className="py-4 text-center text-[12px] text-text-mute">Sin secciones</div>
              )}
            </div>
          </Card>

          <Card title="Leyenda" subtitle="Cursos">
            <div className="flex flex-col gap-1.5 text-[12px]">
              {Object.entries(CURSO_COLORS).slice(0, 8).map(([nombre, col]) => (
                <div key={nombre} className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: col }} />
                  <span>{nombre}</span>
                </div>
              ))}
              {Object.keys(CURSO_COLORS).length === 0 && (
                <span className="text-text-mute">Sin cursos en pantalla</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
