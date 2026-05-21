'use client'

import { useState } from 'react'
import { useCiclos } from '@/hooks/use-ciclos'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { PageHeader } from '@/components/layout/page-header'
import { Download, Filter } from '@/components/icons'
import api from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

const REPORT_TYPES = [
  'Asistencia general',
  'Puntualidad docentes',
  'Alumnos en riesgo',
  'Reporte por sección',
]

const PERIODOS = ['Últimos 7 días', 'Últimos 30 días', 'Ciclo completo', 'Personalizado']

function useMisReportes(tipo: string, cicloId: string) {
  return useQuery({
    queryKey: ['reportes', tipo, cicloId],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (cicloId) params.ciclo_id = cicloId
      const endpoint = tipo === 'Asistencia general'
        ? '/reportes/asistencia-general'
        : tipo === 'Puntualidad docentes'
          ? '/reportes/puntualidad-docentes'
          : tipo === 'Alumnos en riesgo'
            ? '/reportes/alumnos-riesgo'
            : '/reportes/asistencia-general'
      const { data } = await api.get(endpoint, { params })
      return data
    },
    enabled: false, // manual trigger
  })
}

export default function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState(REPORT_TYPES[0])
  const [cicloId, setCicloId] = useState('')
  const [periodo, setPeriodo] = useState(PERIODOS[1])

  const { data: ciclos = [] } = useCiclos()
  const cicloActivo = ciclos.find((c) => c.activo)

  const { data: reporte, refetch, isFetching } = useMisReportes(tipoReporte, cicloId)

  const summaryData = reporte ? Object.values(reporte).slice(0, 4) : []

  return (
    <>
      <PageHeader
        title="Reportes"
        crumbs={[{ label: 'Reportes' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm">
              Excel
            </Btn>
            <Btn icon={<Download size={14} />} size="sm">
              PDF
            </Btn>
          </>
        }
      />

      <div className="p-7 flex flex-col gap-3.5">
        {/* Filters */}
        <div className="flex gap-2.5 items-center bg-surface border border-border rounded-3 p-3 shadow-1">
          <div>
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium block mb-1">Tipo</label>
            <select
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value)}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium block mb-1">Ciclo</label>
            <select
              value={cicloId}
              onChange={(e) => setCicloId(e.target.value)}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface"
            >
              <option value="">Todos los ciclos</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' (activo)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium block mb-1">Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface"
            >
              {PERIODOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <Btn variant="ghost" size="sm" icon={<Filter size={14} />}>Filtros avanzados</Btn>
          <Btn size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Generando…' : 'Generar reporte'}
          </Btn>
        </div>

        {/* KPIs from reporte data or defaults */}
        <div className="grid grid-cols-4 gap-3.5">
          <KPI
            label="Asistencia media"
            value={reporte?.asistencia_media ? `${reporte.asistencia_media}%` : '—'}
            sub="del período"
            accent="var(--color-primary)"
          />
          <KPI
            label="Alumnos en riesgo"
            value={reporte?.alumnos_riesgo ?? '—'}
            sub="< 75% asistencia"
            accent="var(--color-danger)"
          />
          <KPI
            label="Docentes puntuales"
            value={reporte?.docentes_puntuales ? `${reporte.docentes_puntuales}%` : '—'}
            sub="del período"
            accent="var(--color-success)"
          />
          <KPI
            label="Ciclo activo"
            value={cicloActivo?.nombre ?? '—'}
            sub={cicloActivo ? `${cicloActivo.total_alumnos ?? '—'} alumnos` : 'Sin ciclo activo'}
            accent="var(--color-warning)"
          />
        </div>

        {/* Content */}
        {!reporte && !isFetching && (
          <Card>
            <div className="py-16 text-center">
              <div className="text-[48px] mb-4">📊</div>
              <h3 className="font-serif text-[20px] font-semibold mb-2">Seleccione un reporte</h3>
              <p className="text-[13px] text-text-mute mb-6">
                Configure los filtros y presione "Generar reporte" para ver los resultados.
              </p>
              <Btn onClick={() => refetch()}>Generar reporte</Btn>
            </div>
          </Card>
        )}

        {isFetching && (
          <Card>
            <div className="py-16 text-center text-text-mute text-[13px]">
              Generando reporte…
            </div>
          </Card>
        )}

        {reporte && !isFetching && (
          <>
            {/* Asistencia general report */}
            {tipoReporte === 'Asistencia general' && reporte.secciones && (
              <Card title="Asistencia por sección" subtitle={cicloActivo?.nombre ?? 'Ciclo activo'}>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-2 border-b border-border">
                      {['Sección', 'Alumnos', 'Asistencia media', 'Tardanzas', 'En riesgo'].map((h) => (
                        <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.secciones.map((s: any, i: number) => (
                      <tr key={s.aulaId ?? i} className="border-t border-border-s">
                        <td className="px-3.5 py-2.5 font-semibold">{s.nombre ?? s.aulaId}</td>
                        <td className="px-3.5 py-2.5 font-mono">{s.total_alumnos ?? '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-surface-3 rounded overflow-hidden">
                              <div
                                className="h-full rounded"
                                style={{
                                  width: `${s.asistencia_media ?? 0}%`,
                                  background: (s.asistencia_media ?? 0) < 85 ? 'var(--color-warning)' : 'var(--color-success)',
                                }}
                              />
                            </div>
                            <span className="font-mono text-[12px] font-semibold">
                              {s.asistencia_media ?? '—'}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono">{s.tardanzas ?? '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={s.en_riesgo > 0 ? 'danger' : 'success'}>
                            {s.en_riesgo ?? 0}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {/* Alumnos en riesgo */}
            {tipoReporte === 'Alumnos en riesgo' && reporte.alumnos && (
              <Card title="Alumnos en riesgo de desaprobación" subtitle="Asistencia < 75%">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-2 border-b border-border">
                      {['Alumno', 'DNI', 'Sección', '% Asistencia', 'Faltas'].map((h) => (
                        <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.alumnos.map((a: any, i: number) => (
                      <tr key={a.alumno_id ?? i} className="border-t border-border-s">
                        <td className="px-3.5 py-2.5 font-medium">{a.nombre ?? '—'} {a.apellidos ?? ''}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{a.dni ?? '—'}</td>
                        <td className="px-3.5 py-2.5">{a.aula ?? '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone="danger">{a.asistencia_pct ?? '—'}%</Pill>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono">{a.faltas ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}
