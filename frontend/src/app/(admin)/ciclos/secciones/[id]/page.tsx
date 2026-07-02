'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSeccion, type HorarioSeccion } from '@/hooks/use-ciclos'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { PageHeader } from '@/components/layout/page-header'
import { Edit, Users, Calendar, MapPin } from '@/components/icons'

/* ─── Constantes ─────────────────────────────────────────────────── */
const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }
const AREA_LABEL: Record<string, string> = {
  ciencias: 'Área A — Ciencias',
  letras:   'Área B — Letras',
  medicas:  'Área C — Médicas',
}
// Variables CSS con fallback hex solo para navegadores sin oklch (ver globals.css).
const AREA_COLOR: Record<string, string> = {
  ciencias: 'var(--area-ciencias)',
  letras:   'var(--area-letras)',
  medicas:  'var(--area-medicas)',
}
const DIAS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

const TABS = ['Alumnos', 'Horarios'] as const
type Tab = typeof TABS[number]

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function SeccionDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: seccion, isLoading } = useSeccion(id)

  const initialTab: Tab = searchParams.get('tab') === 'horarios' ? 'Horarios' : 'Alumnos'
  const [tab, setTab] = useState<Tab>(initialTab)

  // Agrupar horarios por día
  const horariosPorDia = (seccion?.horarios ?? []).reduce<Record<number, HorarioSeccion[]>>(
    (acc, h) => {
      if (!acc[h.diaSemana]) acc[h.diaSemana] = []
      acc[h.diaSemana].push(h)
      return acc
    },
    {},
  )
  const diasOrdenados = Object.keys(horariosPorDia).map(Number).sort()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-mute text-sm">
        Cargando…
      </div>
    )
  }

  if (!seccion) {
    return (
      <div className="p-7 text-center">
        <p className="text-danger mb-4">Sección no encontrada</p>
        <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
      </div>
    )
  }

  const col = AREA_COLOR[seccion.area] ?? 'var(--area-default)'
  const pctCupo = seccion._count
    ? Math.round((seccion._count.alumnos / seccion.cupoMaximo) * 100)
    : 0

  return (
    <>
      <PageHeader
        title={`Sección ${seccion.nombre}`}
        crumbs={[
          { label: 'Ciclos y secciones', href: '/ciclos' },
          { label: seccion.ciclo?.nombre ?? 'Ciclo', href: '/ciclos' },
          { label: `Sección ${seccion.nombre}` },
        ]}
        action={
          <Btn variant="secondary" size="sm" icon={<Edit size={14} />}>
            Editar sección
          </Btn>
        }
      />

      <div className="p-4 md:p-7 grid gap-[18px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">

        {/* ── Columna izquierda ── */}
        <div className="flex flex-col gap-3.5">

          {/* Badge + nombre */}
          <Card>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold text-[18px] text-white shrink-0"
                  style={{ background: col }}
                >
                  {seccion.nombre[0]}
                </div>
                <div>
                  <div className="font-serif text-[20px] font-semibold leading-tight">
                    Sección {seccion.nombre}
                  </div>
                  <div className="text-[12px] text-text-mute">
                    Ciclo {seccion.ciclo?.nombre ?? '—'}
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                <Pill tone="neutral">{TURNO_LABEL[seccion.turno] ?? seccion.turno}</Pill>
                <Pill tone="primary">{AREA_LABEL[seccion.area] ?? seccion.area}</Pill>
              </div>
            </div>
          </Card>

          {/* Info */}
          <Card title="Información">
            <div className="px-4 pb-4 flex flex-col gap-2.5 text-[12.5px]">
              <InfoFila icon={<Calendar size={13} />} label="Período">
                {formatDate(seccion.ciclo?.fechaInicio ?? '')} → {formatDate(seccion.ciclo?.fechaFin ?? '')}
              </InfoFila>
              <InfoFila icon={<MapPin size={13} />} label="Turno">
                {TURNO_LABEL[seccion.turno] ?? seccion.turno}
              </InfoFila>
              {seccion.carrera && (
                <InfoFila icon={<Users size={13} />} label="Carreras objetivo">
                  {seccion.carrera}
                </InfoFila>
              )}
            </div>
          </Card>

          {/* KPIs */}
          <Card>
            <div className="p-4 grid grid-cols-2 gap-3">
              <KPI
                label="Alumnos"
                value={seccion._count?.alumnos ?? 0}
                sub={`de ${seccion.cupoMaximo} cupos`}
                accent={col}
              />
              <KPI
                label="Cupo libre"
                value={seccion.cupoMaximo - (seccion._count?.alumnos ?? 0)}
                sub={`${100 - pctCupo}% disponible`}
                accent="var(--color-success)"
              />
            </div>
            {/* Barra de ocupación */}
            <div className="px-4 pb-4">
              <div className="h-1.5 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${pctCupo}%`, background: col }}
                />
              </div>
              <div className="text-[10.5px] text-text-mute mt-1 text-right">{pctCupo}% ocupado</div>
            </div>
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
                className="px-3.5 py-2.5 text-[13px] border-none -mb-px cursor-pointer transition-colors"
                style={{
                  background: 'transparent',
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-text-mute)',
                  borderBottom: `2px solid ${tab === t ? 'var(--color-primary)' : 'transparent'}`,
                  fontWeight: tab === t ? 600 : 500,
                }}
              >
                {t} {t === 'Alumnos' && seccion._count && (
                  <span className="ml-1 text-[11px] opacity-70">({seccion._count.alumnos})</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Alumnos ── */}
          {tab === 'Alumnos' && (
            <Card>
              {seccion.alumnos.length === 0 ? (
                <div className="py-10 text-center text-text-mute text-[13px]">
                  No hay alumnos en esta sección
                </div>
              ) : (
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-2">
                      {['Código', 'Apellidos y nombres', 'DNI', 'Correo'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold border-b border-border"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seccion.alumnos.map((a) => (
                      <tr
                        key={a.id}
                        className="border-t border-border-s hover:bg-surface-2 cursor-pointer transition-colors"
                        onClick={() => router.push(`/alumnos/${a.id}`)}
                      >
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute">
                          {a.codigoBarras}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium">
                          {a.apellidos}, {a.nombre}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[12px]">{a.dni}</td>
                        <td className="px-3.5 py-2.5 text-text-mute text-[12px]">
                          {a.usuario.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* ── Tab Horarios ── */}
          {tab === 'Horarios' && (
            <div className="flex flex-col gap-3">
              {diasOrdenados.length === 0 ? (
                <Card>
                  <div className="py-10 text-center text-text-mute text-[13px]">
                    No hay horarios registrados
                  </div>
                </Card>
              ) : (
                diasOrdenados.map((dia) => (
                  <Card key={dia} title={DIAS[dia] ?? `Día ${dia}`}>
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-surface-2">
                          {['Hora', 'Curso', 'Docente', 'Aula', ''].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold border-b border-border"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {horariosPorDia[dia].map((h) => (
                          <tr key={h.id} className="border-t border-border-s">
                            <td className="px-3.5 py-2.5 font-mono text-[12px] whitespace-nowrap text-text-mute">
                              {formatTime(h.horaInicio)} – {formatTime(h.horaFin)}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="font-medium">{h.curso.nombre}</span>
                              <span className="ml-1.5 text-[11px] text-text-mute font-mono">{h.curso.codigo}</span>
                            </td>
                            <td className="px-3.5 py-2.5 text-text-mute">
                              {h.docente.apellidos}, {h.docente.nombre}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-[12px]">
                              {h.aula ?? '—'}
                            </td>
                            <td className="px-3.5 py-2.5">
                              {h.publicado
                                ? <Pill tone="success"><Dot tone="success" size={5} />Publicado</Pill>
                                : <Pill tone="neutral">Borrador</Pill>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─── Componentes auxiliares ─────────────────────────────────────── */
function InfoFila({
  icon, label, children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2">
      <span className="text-text-soft mt-0.5 shrink-0">{icon}</span>
      <div>
        <div className="text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">{label}</div>
        <div className="text-text leading-snug">{children}</div>
      </div>
    </div>
  )
}
