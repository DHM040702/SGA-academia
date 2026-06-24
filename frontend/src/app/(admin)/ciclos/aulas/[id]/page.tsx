'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAula, useUpdateAula, type HorarioAula, type AulaDetalle } from '@/hooks/use-ciclos'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { PageHeader } from '@/components/layout/page-header'
import { Edit, Users, Calendar, MapPin, X, Download } from '@/components/icons'

/* ─── Constantes ─────────────────────────────────────────────────── */
const TURNO_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' }
const AREA_LABEL: Record<string, string> = {
  ciencias: 'Área A — Ciencias',
  letras:   'Área B — Letras',
  medicas:  'Área C — Médicas',
}
const AREA_COLOR: Record<string, string> = {
  ciencias: 'oklch(0.42 0.12 240)',
  letras:   'oklch(0.50 0.13 50)',
  medicas:  'oklch(0.42 0.12 155)',
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

/* ─── EditarAulaModal (inline en esta página) ────────────────────── */
const TURNO_OPTS = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde',  label: 'Tarde'  },
]
const AREA_OPTS = [
  { value: 'ciencias', label: 'Área A — Ciencias' },
  { value: 'letras',   label: 'Área B — Letras'   },
  { value: 'medicas',  label: 'Área C — Médicas'   },
]

function EditarAulaModal({ aula, onClose }: {
  aula: AulaDetalle
  onClose: () => void
}) {
  const updateMut = useUpdateAula()
  const [nombre, setNombre] = useState(aula.nombre)
  const [turno,  setTurno]  = useState(aula.turno)
  const [area,   setArea]   = useState(aula.area)
  const [cupo,   setCupo]   = useState(String(aula.cupoMaximo))
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateMut.mutateAsync({
        id: aula.id,
        nombre, turno, area,
        cupo_maximo: Number(cupo),
        ciclo_id: aula.cicloId,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al guardar.'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[460px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[19px] font-semibold m-0">Editar aula</h2>
          <Btn variant="ghost" size="sm" onClick={onClose} style={{ padding: 6 }}><X size={16} /></Btn>
        </header>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">Cupo máximo</span>
              <input type="number" min={1} value={cupo} onChange={(e) => setCupo(e.target.value)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">Turno</span>
              <select value={turno} onChange={(e) => setTurno(e.target.value as any)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary">
                {TURNO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-text-mute uppercase tracking-[0.05em]">Área</span>
              <select value={area} onChange={(e) => setArea(e.target.value as any)}
                className="px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary">
                {AREA_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="text-[12px] text-danger bg-danger-l px-3 py-2 rounded-2 m-0">{error}</p>}
          <div className="flex justify-end gap-2 pt-1 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
            <Btn size="sm" type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function AulaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: aula, isLoading } = useAula(id)
  const [showEdit,      setShowEdit]      = useState(false)
  const [carnetLoading, setCarnetLoading] = useState(false)

  const initialTab: Tab = searchParams.get('tab') === 'horarios' ? 'Horarios' : 'Alumnos'
  const [tab, setTab] = useState<Tab>(initialTab)

  /* ── Generar hoja A4 con carnets de todos los alumnos del aula ── */
  async function generarCarnetsAula() {
    if (!aula || aula.alumnos.length === 0) return
    setCarnetLoading(true)
    try {
      const cicloLabel = aula.ciclo?.nombre ?? '2026-I'
      const turno = aula.turno === 'tarde' ? 'Tarde' : aula.turno === 'manana' ? 'Mañana' : undefined
      const alumnos = aula.alumnos.map((a) => ({
        nombre:       a.nombre,
        apellidos:    a.apellidos,
        dni:          a.dni,
        codigoBarras: a.codigoBarras,
        turno,
        aula:         { nombre: aula.nombre, ciclo: { nombre: cicloLabel } },
      }))
      const [{ pdf }, { CarnetSheetPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/reportes/carnet-pdf'),
      ])
      const blob = await pdf(CarnetSheetPDF({ alumnos, cicloLabel })).toBlob()
      const url  = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), {
        href:     url,
        download: `carnets-hoja-A4-${aula.nombre}-${cicloLabel}.pdf`,
      })
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al generar carnets:', err)
      alert('No se pudo generar los carnets. Inténtalo de nuevo.')
    } finally {
      setCarnetLoading(false)
    }
  }

  // Agrupar horarios por día
  const horariosPorDia = (aula?.horarios ?? []).reduce<Record<number, HorarioAula[]>>(
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

  if (!aula) {
    return (
      <div className="p-7 text-center">
        <p className="text-danger mb-4">Aula no encontrada</p>
        <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
      </div>
    )
  }

  const col = AREA_COLOR[aula.area] ?? 'oklch(0.42 0.10 255)'
  const pctCupo = aula._count
    ? Math.round((aula._count.alumnos / aula.cupoMaximo) * 100)
    : 0

  return (
    <>
      {showEdit && <EditarAulaModal aula={aula} onClose={() => setShowEdit(false)} />}

      <PageHeader
        title={`Aula ${aula.nombre}`}
        crumbs={[
          { label: 'Ciclos y aulas', href: '/ciclos' },
          { label: aula.ciclo?.nombre ?? 'Ciclo', href: '/ciclos' },
          { label: `Aula ${aula.nombre}` },
        ]}
        action={
          <Btn variant="secondary" size="sm" icon={<Edit size={14} />}
            onClick={() => setShowEdit(true)}>
            Editar aula
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
                  {aula.nombre[0]}
                </div>
                <div>
                  <div className="font-serif text-[20px] font-semibold leading-tight">
                    Aula {aula.nombre}
                  </div>
                  <div className="text-[12px] text-text-mute">
                    Ciclo {aula.ciclo?.nombre ?? '—'}
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                <Pill tone="neutral">{TURNO_LABEL[aula.turno] ?? aula.turno}</Pill>
                <Pill tone="primary">{AREA_LABEL[aula.area] ?? aula.area}</Pill>
              </div>
            </div>
          </Card>

          {/* Info */}
          <Card title="Información">
            <div className="px-4 pb-4 flex flex-col gap-2.5 text-[12.5px]">
              <InfoFila icon={<Calendar size={13} />} label="Período">
                {formatDate(aula.ciclo?.fechaInicio ?? '')} → {formatDate(aula.ciclo?.fechaFin ?? '')}
              </InfoFila>
              <InfoFila icon={<MapPin size={13} />} label="Turno">
                {TURNO_LABEL[aula.turno] ?? aula.turno}
              </InfoFila>
              <InfoFila icon={<Users size={13} />} label="Área">
                {AREA_LABEL[aula.area] ?? aula.area}
              </InfoFila>
            </div>
          </Card>

          {/* KPIs */}
          <Card>
            <div className="p-4 grid grid-cols-2 gap-3">
              <KPI
                label="Alumnos"
                value={aula._count?.alumnos ?? 0}
                sub={`de ${aula.cupoMaximo} cupos`}
                accent={col}
              />
              <KPI
                label="Cupo libre"
                value={aula.cupoMaximo - (aula._count?.alumnos ?? 0)}
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
                {t} {t === 'Alumnos' && aula._count && (
                  <span className="ml-1 text-[11px] opacity-70">({aula._count.alumnos})</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Alumnos ── */}
          {tab === 'Alumnos' && (
            <Card
              title={`Alumnos${aula._count ? ` (${aula._count.alumnos})` : ''}`}
              action={
                aula.alumnos.length > 0 ? (
                  <Btn
                    size="sm"
                    icon={<Download size={14} />}
                    disabled={carnetLoading}
                    onClick={generarCarnetsAula}
                    title="Genera una hoja A4 apaisada con 9 carnets por página"
                  >
                    {carnetLoading ? 'Generando…' : 'Carnets hoja A4'}
                  </Btn>
                ) : undefined
              }
            >
              {aula.alumnos.length === 0 ? (
                <div className="py-10 text-center text-text-mute text-[13px]">
                  No hay alumnos en esta aula
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
                    {aula.alumnos.map((a) => (
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
                          {['Hora', 'Curso', 'Docente', ''].map((h) => (
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
