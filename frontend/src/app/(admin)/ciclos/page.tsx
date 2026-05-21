'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCiclos, useAulas, useCreateCiclo, useCreateAula } from '@/hooks/use-ciclos'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Plus, Eye, Calendar, MoreHorizontal } from '@/components/icons'

const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }
const AREA_LABEL: Record<string, string> = { ciencias: 'Área A — Ciencias', letras: 'Área B — Letras', medicas: 'Área C — Médicas' }
const AREA_COLOR: Record<string, string> = {
  ciencias: 'oklch(0.42 0.12 240)',
  letras:   'oklch(0.50 0.13 50)',
  medicas:  'oklch(0.42 0.12 155)',
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function cicloProgress(inicio: string, fin: string) {
  const now = Date.now()
  const start = new Date(inicio).getTime()
  const end = new Date(fin).getTime()
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
  const totalWeeks = Math.round((end - start) / (7 * 24 * 3600 * 1000))
  const currentWeek = Math.round((now - start) / (7 * 24 * 3600 * 1000))
  return { pct, totalWeeks, currentWeek }
}

export default function CiclosPage() {
  const router = useRouter()
  const { data: ciclos = [], isLoading } = useCiclos()
  const cicloActivo = ciclos.find((c) => c.activo)
  const { data: secciones = [] } = useAulas(cicloActivo?.id)

  const progress = cicloActivo
    ? cicloProgress(cicloActivo.fechaInicio, cicloActivo.fechaFin)
    : null

  const ciclosHistorico = ciclos.filter((c) => !c.activo)

  return (
    <>
      <PageHeader
        title="Ciclos y secciones"
        crumbs={[{ label: 'Ciclos y secciones' }]}
        action={
          <>
            <Btn variant="secondary" icon={<Plus size={14} />} size="sm">
              Nueva sección
            </Btn>
            <Btn icon={<Plus size={14} />} size="sm">
              Nuevo ciclo
            </Btn>
          </>
        }
      />

      <div className="p-7 flex flex-col gap-3.5">
        {/* Ciclo activo */}
        {cicloActivo ? (
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-serif text-[22px] font-semibold tracking-tight m-0">
                      Ciclo {cicloActivo.nombre}
                    </h2>
                    <Pill tone="success">
                      <Dot tone="success" size={6} />
                      En curso
                    </Pill>
                  </div>
                  <div className="mt-1 text-[12.5px] text-text-mute">
                    {formatDate(cicloActivo.fechaInicio)} → {formatDate(cicloActivo.fechaFin)}
                    {progress && ` · semana ${progress.currentWeek} de ${progress.totalWeeks}`}
                  </div>
                </div>
                <div className="flex gap-5">
                  <Stat label="Alumnos" value={cicloActivo.total_alumnos ?? '—'} />
                  <Stat label="Secciones" value={cicloActivo.total_secciones ?? secciones.length} />
                </div>
              </div>
              {progress && (
                <>
                  <div className="h-2 bg-surface-3 rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${progress.pct}%`,
                        background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-d, oklch(0.29 0.09 255)))',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-text-mute font-mono">
                    <span>{new Date(cicloActivo.fechaInicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                    <span className="text-primary font-semibold">HOY · {progress.pct}% completado</span>
                    <span>{new Date(cicloActivo.fechaFin).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        ) : (
          !isLoading && (
            <Card>
              <div className="p-5 text-center text-text-mute text-[13px]">
                No hay ningún ciclo activo.{' '}
                <button className="text-primary underline">Crear ciclo</button>
              </div>
            </Card>
          )
        )}

        {/* Secciones del ciclo activo */}
        {secciones.length > 0 && (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(${Math.min(secciones.length, 3)}, 1fr)` }}>
            {secciones.map((s) => {
              const col = AREA_COLOR[s.area] ?? 'oklch(0.42 0.10 255)'
              return (
                <Card key={s.id}>
                  <div className="p-[18px]">
                    <div className="flex items-start justify-between mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center font-serif font-bold text-[13px] text-white"
                            style={{ background: col }}
                          >
                            {s.nombre[0]}
                          </div>
                          <h3 className="font-serif text-[17px] font-semibold m-0">{s.nombre}</h3>
                        </div>
                        <div className="mt-1.5 text-[12.5px] text-text-mute">
                          {s.ciclo?.nombre ?? '—'} · {TURNO_LABEL[s.turno] ?? s.turno}
                        </div>
                        <div className="mt-0.5 text-[11px] text-text-soft">{AREA_LABEL[s.area] ?? s.area}</div>
                        {s.carrera && (
                          <div className="mt-0.5 text-[11px] text-text-soft leading-tight opacity-75">{s.carrera}</div>
                        )}
                      </div>
                      <Btn variant="ghost" size="sm" style={{ padding: 4 }}>
                        <MoreHorizontal size={16} />
                      </Btn>
                    </div>
                    <div className="flex gap-4 pt-2.5 border-t border-border-s">
                      <Stat label="Alumnos" value={s._count?.alumnos ?? '—'} />
                      <Stat label="Horarios" value={s._count?.horarios ?? '—'} />
                      <Stat label="Cupo" value={s.cupoMaximo} />
                    </div>
                    <div className="flex gap-1.5 mt-3.5">
                      <Btn
                        variant="secondary" size="sm" className="flex-1" icon={<Eye size={12} />}
                        onClick={() => router.push(`/ciclos/aulas/${s.id}`)}
                      >
                        Detalle
                      </Btn>
                      <Btn
                        variant="ghost" size="sm" className="flex-1" icon={<Calendar size={12} />}
                        onClick={() => router.push(`/ciclos/aulas/${s.id}?tab=horarios`)}
                      >
                        Horario
                      </Btn>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Histórico */}
        {ciclosHistorico.length > 0 && (
          <Card title="Ciclos anteriores">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['Ciclo', 'Período', 'Alumnos', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ciclosHistorico.map((c, i) => (
                  <tr key={c.id} className="border-t border-border-s">
                    <td className="px-3.5 py-2.5 font-serif font-semibold text-[14px]">{c.nombre}</td>
                    <td className="px-3.5 py-2.5 text-text-mute text-[12.5px]">
                      {formatDate(c.fechaInicio)} → {formatDate(c.fechaFin)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono">{c.total_alumnos ?? '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone="neutral">Cerrado</Pill>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Btn variant="ghost" size="sm">Ver reportes</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-10 text-text-mute text-[13px]">Cargando…</div>
        )}
      </div>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="font-serif text-[20px] font-semibold leading-none">{value}</div>
      <div className="text-[11.5px] text-text-mute mt-1">{label}</div>
      {sub && <div className="text-[10.5px] text-text-soft">{sub}</div>}
    </div>
  )
}
