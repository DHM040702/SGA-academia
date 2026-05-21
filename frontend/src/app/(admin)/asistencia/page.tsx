'use client'

import { useState } from 'react'
import { useAsistencia, useResumenAsistencia } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Download, Edit, ScanLine, MoreHorizontal } from '@/components/icons'

const TODAY = new Date().toISOString().split('T')[0]

function formatHora(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export default function AsistenciaPage() {
  const [seccionFilter, setSeccionFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'alumno' | 'docente' | ''>('')

  const { data: resumen } = useResumenAsistencia(TODAY)
  const { data: page, isLoading } = useAsistencia({
    fecha: TODAY,
    tipo: tipoFilter || undefined,
    seccion_id: seccionFilter || undefined,
    limit: 50,
  })

  const registros = page?.data ?? []

  const presentes = registros.filter((r) => !r.esTardanza).length
  const tardanzas = registros.filter((r) => r.esTardanza).length
  const total = registros.length

  return (
    <>
      <PageHeader
        title="Asistencia"
        crumbs={[{ label: 'Asistencia' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm">
              Exportar
            </Btn>
            <Btn variant="secondary" icon={<Edit size={14} />} size="sm">
              Corregir manual
            </Btn>
            <Btn icon={<ScanLine size={14} />} size="sm" onClick={() => window.open('/vigilante', '_blank')}>
              Abrir pantalla vigilante
            </Btn>
          </>
        }
      />

      <div className="p-7 flex flex-col gap-3.5">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3.5">
          <KPI
            label="Presentes ahora"
            value={resumen?.presentes ?? presentes}
            sub={`de ${resumen?.total ?? total} alumnos`}
            trend={4}
            accent="var(--color-success)"
          />
          <KPI
            label="Tardanzas hoy"
            value={resumen?.tardanzas ?? tardanzas}
            sub="del total"
            accent="var(--color-warning)"
          />
          <KPI
            label="Ausentes hoy"
            value={resumen?.ausentes ?? 0}
            sub="sin registro"
            accent="var(--color-danger)"
          />
          <KPI
            label="Total registros"
            value={total}
            sub="hoy"
            accent="var(--color-primary)"
          />
        </div>

        {/* Content */}
        <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          {/* Table */}
          <Card
            title={`Registros de hoy`}
            subtitle={new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            action={
              <div className="flex gap-1.5">
                <select
                  value={seccionFilter}
                  onChange={(e) => setSeccionFilter(e.target.value)}
                  className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface"
                >
                  <option value="">Todas las secciones</option>
                </select>
                <select
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value as any)}
                  className="text-[12px] px-2 py-1 border border-border rounded-2 bg-surface"
                >
                  <option value="">Todos</option>
                  <option value="alumno">Alumnos</option>
                  <option value="docente">Docentes</option>
                </select>
              </div>
            }
          >
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-2">
                  {['Hora', 'Persona', 'Tipo', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-text-mute">Cargando…</td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-text-mute">
                      No hay registros para hoy
                    </td>
                  </tr>
                ) : (
                  registros.map((r, i) => {
                    const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
                    const nombre = persona ? `${persona.nombre ?? (persona as any).nombres} ${persona.apellidos}` : '—'
                    return (
                      <tr key={r.id} className="border-t border-border-s">
                        <td className="px-3.5 py-2.5 font-mono text-[12.5px]">
                          {formatHora(r.horaIngreso)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={nombre} size={28} />
                            <span className="font-medium">{nombre}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={r.tipoPersona === 'alumno' ? 'primary' : 'info'}>
                            {r.tipoPersona === 'alumno' ? 'Alumno' : 'Docente'}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={r.esTardanza ? 'warning' : 'success'}>
                            <Dot tone={r.esTardanza ? 'warning' : 'success'} size={6} />
                            {r.esTardanza ? 'Tardanza' : 'Puntual'}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Btn variant="ghost" size="sm" style={{ padding: 4 }}>
                            <MoreHorizontal size={15} />
                          </Btn>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </Card>

          {/* Right panels */}
          <div className="flex flex-col gap-3.5">
            <Card title="Asistencia docente · hoy" subtitle="Registro del día">
              {registros
                .filter((r) => r.tipoPersona === 'docente' && r.docente)
                .slice(0, 5)
                .map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-t border-border-s">
                    <Avatar name={`${r.docente!.nombre} ${r.docente!.apellidos}`} size={26} />
                    <div className="flex-1 text-[12.5px] font-medium">
                      {r.docente!.nombre} {r.docente!.apellidos}
                    </div>
                    <span className="font-mono text-[11px] text-text-mute">{formatHora(r.horaIngreso)}</span>
                    <Pill tone="success" style={{ fontSize: 10 }}>Puntual</Pill>
                  </div>
                ))}
              {registros.filter((r) => r.tipoPersona === 'docente').length === 0 && (
                <div className="py-4 text-center text-[12px] text-text-mute">
                  Sin registros de docentes hoy
                </div>
              )}
            </Card>

            <Card title="Estadísticas" subtitle="Resumen del día">
              <div className="flex flex-col gap-2 py-1">
                <StatRow label="Total registros" value={total} />
                <StatRow label="Puntuales" value={presentes} color="var(--color-success)" />
                <StatRow label="Tardanzas" value={tardanzas} color="var(--color-warning)" />
                <StatRow label="% asistencia" value={total > 0 ? `${Math.round((presentes / total) * 100)}%` : '—'} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-t border-border-s first:border-t-0 text-[13px]">
      <span className="text-text-mute">{label}</span>
      <span className="font-mono font-semibold" style={{ color: color ?? 'inherit' }}>{value}</span>
    </div>
  )
}
