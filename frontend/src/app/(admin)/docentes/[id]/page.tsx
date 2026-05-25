'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDocente } from '@/hooks/use-docentes'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { PageHeader } from '@/components/layout/page-header'
import { Edit, Mail, Phone, Calendar, Layers } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { DocenteHorario } from '@/hooks/use-docentes'

/* ─── Constantes ──────────────────────────────────────────────── */
const DIAS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

const TABS = ['Resumen', 'Asistencia', 'Horarios'] as const
type Tab = typeof TABS[number]

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })
}

/* ─── InfoRow ─────────────────────────────────────────────────── */
function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-text">
      <span className="text-text-mute flex shrink-0">{icon}</span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function DocenteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>('Resumen')

  const { data: docente, isLoading } = useDocente(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-mute text-sm">
        Cargando…
      </div>
    )
  }

  if (!docente) {
    return (
      <div className="p-7 text-center">
        <p className="text-danger mb-4">Docente no encontrado</p>
        <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
      </div>
    )
  }

  const nombre = docente.nombre
  const apellidos = docente.apellidos
  const fullName = `${nombre} ${apellidos}`
  const asistencias = docente.asistencias ?? []
  const tardanzas = asistencias.filter((a) => a.esTardanza).length
  const pct = asistencias.length > 0
    ? Math.round((asistencias.filter((a) => !a.esTardanza).length / asistencias.length) * 100)
    : 100

  /* agrupar horarios por día */
  const horariosPorDia = (docente.horarios ?? []).reduce<Record<number, DocenteHorario[]>>((acc, h) => {
    const d = h.diaSemana
    if (!acc[d]) acc[d] = []
    acc[d].push(h)
    return acc
  }, {})
  const diasOrdenados = Object.keys(horariosPorDia).map(Number).sort()

  return (
    <>
      <PageHeader
        title={`${apellidos}, ${nombre}`}
        crumbs={[
          { label: 'Docentes', href: '/docentes' },
          { label: docente.dni },
        ]}
        action={
          <Btn variant="secondary" size="sm" onClick={() => router.push(`/docentes/${id}/editar`)}>
            <Edit size={14} />Editar
          </Btn>
        }
      />

      <div className="p-7 grid gap-[18px]" style={{ gridTemplateColumns: '300px 1fr' }}>

        {/* ── Columna izquierda ── */}
        <div className="flex flex-col gap-3.5">

          {/* Perfil */}
          <Card>
            <div className="flex flex-col items-center text-center px-5 pt-5 pb-4">
              <Avatar name={fullName} size={80} />
              <h3 className="font-serif text-[19px] font-semibold mt-3.5 mb-0.5 tracking-tight leading-snug">
                {nombre} {apellidos}
              </h3>
              <div className="font-mono text-[12px] text-text-mute">
                DNI {docente.dni}
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
                <Pill tone="success">
                  <Dot tone="success" size={6} />
                  Activo
                </Pill>
                {docente.especialidad && (
                  <Pill tone="primary">{docente.especialidad}</Pill>
                )}
              </div>
            </div>

            <div className="mx-5 mb-5 pt-4 border-t border-border-s flex flex-col gap-2.5">
              <InfoRow icon={<Mail size={14} />} value={docente.usuario?.email ?? '—'} />
              <InfoRow icon={<Phone size={14} />} value={docente.telefonoWhatsapp ?? '—'} />
              <InfoRow icon={<Calendar size={14} />} value={`Desde ${fmtDate(docente.createdAt)}`} />
            </div>
          </Card>

          {/* Horarios */}
          <Card>
            <div className="px-4 pt-4 pb-1 flex items-center gap-1.5">
              <Layers size={14} className="text-text-mute" />
              <span className="text-[12px] font-semibold text-text">Horario asignado</span>
            </div>

            {diasOrdenados.length === 0 ? (
              <p className="text-[12.5px] text-text-mute text-center py-5">
                Sin horario asignado
              </p>
            ) : (
              <div className="px-3 pb-3.5 mt-2 flex flex-col gap-2">
                {diasOrdenados.map((dia) => (
                  <div key={dia}>
                    <div className="text-[10.5px] font-semibold text-text-mute uppercase tracking-wide mb-1.5 px-1">
                      {DIAS[dia]}
                    </div>
                    <div className="flex flex-col gap-1">
                      {horariosPorDia[dia]!.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center gap-2 px-2.5 py-2 bg-surface2 border border-border-s rounded-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold truncate">{h.curso.nombre}</div>
                            <div className="text-[11px] text-text-mute">{h.aula?.nombre ?? '—'}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-[11px] text-text-mute">
                              {fmtTime(h.horaInicio)} – {fmtTime(h.horaFin)}
                            </div>
                            {h.aula && (
                              <div className="text-[10.5px] text-text-mute">{h.aula.nombre}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* ── Columna derecha ── */}
        <div className="flex flex-col gap-3.5">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3.5 py-2.5 text-[13px] border-none -mb-px transition-colors cursor-pointer bg-transparent"
                style={{
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-text-mute)',
                  borderBottom: `2px solid ${tab === t ? 'var(--color-primary)' : 'transparent'}`,
                  fontWeight: tab === t ? 600 : 500,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── Tab: Resumen ── */}
          {tab === 'Resumen' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <KPI
                  label="Puntualidad (30 días)"
                  value={`${pct}%`}
                  sub={`${asistencias.length} registros`}
                  accent="var(--color-success)"
                />
                <KPI
                  label="Tardanzas"
                  value={tardanzas}
                  sub="en los últimos 30 días"
                  accent="var(--color-warning)"
                />
                <KPI
                  label="Total asistencias"
                  value={asistencias.length}
                  sub="últimos 30 días"
                  accent="var(--color-primary)"
                />
              </div>

              <Card title="Últimos registros" subtitle="30 días recientes">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {['Fecha', 'Hora ingreso', 'Estado', 'Registro'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {asistencias.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3.5 py-8 text-center text-text-mute text-[13px]">
                          Sin registros de asistencia en los últimos 30 días
                        </td>
                      </tr>
                    ) : (
                      asistencias.map((a) => (
                        <tr key={a.id} className="border-t border-border-s">
                          <td className="px-3.5 py-2 text-text-mute font-mono text-[12px]">
                            {fmtDateShort(a.fecha)}
                          </td>
                          <td className="px-3.5 py-2 font-mono text-[12px]">
                            {fmtTime(a.horaIngreso)}
                          </td>
                          <td className="px-3.5 py-2">
                            <Pill tone={a.esTardanza ? 'warning' : 'success'}>
                              <Dot tone={a.esTardanza ? 'warning' : 'success'} size={6} />
                              {a.esTardanza ? 'Tardanza' : 'Puntual'}
                            </Pill>
                          </td>
                          <td className="px-3.5 py-2 text-text-mute text-[11.5px]">
                            {a.esManual ? 'Manual' : 'Automático'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {/* ── Tab: Asistencia ── */}
          {tab === 'Asistencia' && (
            <Card title="Historial de asistencia" subtitle="Últimos 30 días">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {['Fecha', 'Hora ingreso', 'Estado', 'Tipo'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {asistencias.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3.5 py-8 text-center text-text-mute">
                        Sin registros
                      </td>
                    </tr>
                  ) : (
                    asistencias.map((a) => (
                      <tr key={a.id} className="border-t border-border-s hover:bg-surface2/50">
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute">
                          {fmtDateShort(a.fecha)}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">
                          {fmtTime(a.horaIngreso)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Pill tone={a.esTardanza ? 'warning' : 'success'}>
                            <Dot tone={a.esTardanza ? 'warning' : 'success'} size={6} />
                            {a.esTardanza ? 'Tardanza' : 'Puntual'}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12px]">
                          {a.esManual
                            ? <Pill tone="info">Manual</Pill>
                            : <span className="text-text-mute">Automático</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {/* ── Tab: Horarios ── */}
          {tab === 'Horarios' && (
            <Card title="Cursos y horarios asignados">
              {(docente.horarios ?? []).length === 0 ? (
                <p className="text-[13px] text-text-mute px-1 py-6 text-center">
                  Sin horario asignado en este ciclo.
                </p>
              ) : (
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {['Día', 'Hora', 'Curso', 'Sección', 'Aula'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...(docente.horarios ?? [])]
                      .sort((a, b) => a.diaSemana - b.diaSemana)
                      .map((h) => (
                        <tr key={h.id} className="border-t border-border-s hover:bg-surface2/50">
                          <td className="px-3.5 py-2.5 font-semibold text-[12.5px]">
                            {DIAS[h.diaSemana] ?? `Día ${h.diaSemana}`}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute whitespace-nowrap">
                            {fmtTime(h.horaInicio)} – {fmtTime(h.horaFin)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-semibold text-[12.5px]">{h.curso.nombre}</div>
                            <div className="text-[11px] text-text-mute font-mono">{h.curso.codigo}</div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Pill tone="neutral">{h.aula?.nombre ?? '—'}</Pill>
                          </td>
                          <td className="px-3.5 py-2.5 text-[12px] text-text-mute">
                            {h.aula?.nombre ?? '—'}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </Card>
          )}

        </div>
      </div>
    </>
  )
}
