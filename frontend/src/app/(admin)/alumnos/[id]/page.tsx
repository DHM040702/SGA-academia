'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAlumno } from '@/hooks/use-alumnos'
import { useCicloCtx } from '@/contexts/ciclo-context'
import { useAsistencia } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Barcode } from '@/components/ui/barcode'
import { PageHeader } from '@/components/layout/page-header'
import { Download, Edit, Mail, Phone, Calendar, MapPin, Book } from '@/components/icons'
import { useState } from 'react'
import api from '@/lib/api'

const TABS = ['Resumen', 'Cursos', 'Asistencia', 'Apoderados', 'Comunicados'] as const
type Tab = (typeof TABS)[number]

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function fmtHora(iso: string | null | undefined) {
  if (!iso) return '—'
  if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5)
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function estadoTone(pct: number) {
  if (pct >= 90) return 'success' as const
  if (pct >= 75) return 'warning' as const
  return 'danger' as const
}

async function descargarCarnet(alumno: any) {
  const [{ pdf }, { CarnetPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/reportes/carnet-pdf'),
  ])
  const logoUrl       = `${window.location.origin}/logo.png`
  const logoUnasamUrl = `${window.location.origin}/logo-unasam.png`
  const element = CarnetPDF({ alumno, logoUrl, logoUnasamUrl })
  const blob = await pdf(element).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `carnet-${alumno.codigo_barra ?? alumno.apellidos ?? 'alumno'}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function descargarReporte(alumno: any, setLoading: (v: boolean) => void) {
  setLoading(true)
  try {
    // Obtener todos los registros de asistencia del alumno (sin límite de 30)
    const resp = await api.get('/asistencia', {
      params: { alumno_id: alumno.id, limit: 500, page: 1 },
    })
    const registros = resp.data?.data ?? []

    const [{ pdf }, { ReporteAlumnoPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/reportes/reporte-alumno-pdf'),
    ])
    const logoUrl       = `${window.location.origin}/logo.png`
    const logoUnasamUrl = `${window.location.origin}/logo-unasam.png`
    const element = ReporteAlumnoPDF({ alumno, registros, logoUrl, logoUnasamUrl })
    const blob = await pdf(element).toBlob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `reporte-${alumno.apellidos ?? 'alumno'}-${alumno.codigo_barra ?? ''}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error al generar reporte:', err)
    alert('No se pudo generar el reporte. Intenta nuevamente.')
  } finally {
    setLoading(false)
  }
}

export default function AlumnoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { selectedCiclo } = useCicloCtx()
  const [tab, setTab] = useState<Tab>('Resumen')
  const [reporteLoading, setReporteLoading] = useState(false)

  const { data: alumno, isLoading } = useAlumno(id)
  const { data: asistencias } = useAsistencia({ alumno_id: id, limit: 30 })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-mute text-sm">
        Cargando…
      </div>
    )
  }

  if (!alumno) {
    return (
      <div className="p-7 text-center">
        <p className="text-danger mb-4">Alumno no encontrado</p>
        <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
      </div>
    )
  }

  const pct = alumno.asistencia_pct ?? 0
  const tone = estadoTone(pct)

  const codigoBarras = alumno.codigo_barra
  const nombre = alumno.nombres
  const apellidos = alumno.apellidos

  return (
    <>
      <PageHeader
        title={`${apellidos}, ${nombre}`}
        crumbs={[
          { label: 'Alumnos', href: '/alumnos' },
          { label: codigoBarras },
        ]}
        action={
          <>
            <Btn
              variant="secondary"
              icon={<Download size={14} />}
              size="sm"
              onClick={() => descargarReporte(alumno, setReporteLoading)}
              disabled={reporteLoading}
            >
              {reporteLoading ? 'Generando…' : 'Reporte PDF'}
            </Btn>
            <Btn variant="secondary" icon={<Download size={14} />} size="sm"
              onClick={() => descargarCarnet(alumno)}>
              Carnet PDF
            </Btn>
            <Btn variant="secondary" icon={<Edit size={14} />} size="sm"
              onClick={() => router.push(`/alumnos/${id}/editar`)}>
              Editar
            </Btn>
          </>
        }
      />

      <div className="p-7 grid gap-[18px]" style={{ gridTemplateColumns: '300px 1fr' }}>
        {/* ── Left column ── */}
        <div className="flex flex-col gap-3.5">
          {/* Profile card */}
          <Card>
            <div className="flex flex-col items-center text-center px-5 pt-5 pb-4">
              <Avatar name={`${nombre} ${apellidos}`} size={80} />
              <h3 className="font-serif text-[19px] font-semibold mt-3.5 mb-1 tracking-tight">
                {nombre} {apellidos}
              </h3>
              <div className="font-mono text-[12px] text-text-mute">
                {codigoBarras} · DNI {alumno.dni}
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
                <Pill tone={tone}>
                  <Dot tone={tone} size={6} />
                  {alumno.estado ?? (pct >= 90 ? 'Activo' : pct >= 75 ? 'Observado' : 'Riesgo')}
                </Pill>
                {alumno.aula && (
                  <Pill tone="neutral">{alumno.aula.nombre}</Pill>
                )}
                {alumno.aula?.ciclo && (
                  <Pill tone="primary">Ciclo {alumno.aula.ciclo.nombre}</Pill>
                )}
              </div>
            </div>
            <div className="mx-5 mb-5 pt-4 border-t border-border-s flex flex-col gap-2.5 text-[12.5px]">
              <InfoRow icon={<Mail size={14} />} value={alumno.usuario?.email ?? '—'} />
              <InfoRow icon={<Phone size={14} />} value={alumno.telefono ?? '—'} />
              <InfoRow icon={<Calendar size={14} />} value={`Nac. ${formatDate(alumno.fecha_nacimiento)}`} />
              <InfoRow icon={<Book size={14} />} value={alumno.carrera?.nombre ?? 'Sin carrera asignada'} />
              <InfoRow icon={<MapPin size={14} />} value={`Matriculado ${formatDate(alumno.created_at)}`} />
            </div>
          </Card>

          {/* Carnet */}
          <Card>
            <div className="px-3.5 pt-3.5 pb-1 flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-text">Carnet</span>
              <span className="text-[11px] text-text-mute">6 dígitos · vigente</span>
            </div>
            <div
              className="mx-3.5 mb-0 mt-1 rounded-2 px-3.5 pt-3.5 pb-3 relative overflow-hidden"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <div className="text-[9px] tracking-[0.2em] opacity-80 uppercase">
                Centro Preuniversitario{selectedCiclo ? ` · ${selectedCiclo.nombre}` : ''}
              </div>
              <div className="font-serif text-[14px] font-semibold mt-1 leading-tight">
                {nombre} {apellidos}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">
                {alumno.aula?.nombre ?? '—'} · DNI {alumno.dni}
              </div>
            </div>
            <div className="flex justify-center py-3 bg-white mx-3.5 mb-3.5 mt-2 rounded-2">
              <Barcode value={codigoBarras ?? '000000'} w={220} h={56} />
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-3.5">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3.5 py-2.5 text-[13px] border-none -mb-px transition-colors cursor-pointer"
                style={{
                  background: 'transparent',
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-text-mute)',
                  borderBottom: `2px solid ${tab === t ? 'var(--color-primary)' : 'transparent'}`,
                  fontWeight: tab === t ? 600 : 500,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Resumen' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <KPI label="Asistencia ciclo" value={`${pct}%`} sub="del ciclo actual" accent="var(--color-success)" />
                <KPI label="Tardanzas" value={asistencias?.data?.filter((a) => a.esTardanza).length ?? '—'} sub="en el ciclo" accent="var(--color-warning)" />
                <KPI label="Registros" value={asistencias?.total ?? '—'} sub="total registros" accent="var(--color-primary)" />
              </div>

              <Card title="Últimos registros" subtitle="30 días recientes">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      {['Fecha', 'Hora', 'Estado', 'Manual'].map((h) => (
                        <th key={h} className="text-left px-3.5 py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(asistencias?.data ?? []).map((r) => (
                      <tr key={r.id} className="border-t border-border-s">
                        <td className="px-3.5 py-2 text-text-mute font-mono text-[12px]">
                          {new Date(r.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-3.5 py-2 font-mono text-[12px]">
                          {r.horaIngreso
                            ? new Date(r.horaIngreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-3.5 py-2">
                          <Pill tone={r.esTardanza ? 'warning' : 'success'}>
                            <Dot tone={r.esTardanza ? 'warning' : 'success'} size={6} />
                            {r.esTardanza ? 'Tardanza' : 'Puntual'}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2 text-text-mute text-[11.5px]">
                          {r.esManual ? 'Sí' : '—'}
                        </td>
                      </tr>
                    ))}
                    {(!asistencias?.data || asistencias.data.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-3.5 py-6 text-center text-text-mute text-[13px]">
                          Sin registros de asistencia
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {tab === 'Cursos' && (() => {
            const horarios = alumno.aula?.horarios ?? []
            return (
              <Card
                title="Cursos asignados"
                subtitle={alumno.aula ? `Aula ${alumno.aula.nombre} · ${horarios.length} horario${horarios.length !== 1 ? 's' : ''}` : 'Sin aula asignada'}
              >
                {!alumno.aula ? (
                  <p className="text-[13px] text-text-mute py-8 text-center">
                    Este alumno no tiene aula asignada. Edítalo para asignarle una.
                  </p>
                ) : horarios.length === 0 ? (
                  <p className="text-[13px] text-text-mute py-8 text-center">
                    El aula <strong>{alumno.aula.nombre}</strong> aún no tiene cursos/horarios asignados.
                  </p>
                ) : (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-surface2/50">
                        {['Día', 'Horario', 'Curso', 'Docente', 'Estado'].map((h) => (
                          <th key={h} className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {horarios.map((h) => (
                        <tr key={h.id} className="border-t border-border-s hover:bg-surface2/40">
                          <td className="px-3.5 py-2.5 font-medium">
                            {DIAS[h.diaSemana] ?? `Día ${h.diaSemana}`}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[12px] text-text-mute">
                            {fmtHora(h.horaInicio)} – {fmtHora(h.horaFin)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="font-medium">{h.curso.nombre}</span>
                            <span className="ml-1.5 font-mono text-[11px] text-text-mute bg-surface2 px-1.5 py-0.5 rounded">
                              {h.curso.codigo}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-text-mute">
                            {h.docente.nombre} {h.docente.apellidos}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Pill tone={h.publicado ? 'success' : 'neutral'}>
                              {h.publicado ? 'Publicado' : 'Borrador'}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            )
          })()}

          {tab === 'Asistencia' && (
            <Card title="Historial de asistencia" subtitle="Todos los registros">
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
                  {(asistencias?.data ?? []).map((r) => (
                    <tr key={r.id} className="border-t border-border-s hover:bg-surface2/40">
                      <td className="px-3.5 py-2.5 text-text-mute font-mono text-[12px]">
                        {new Date(r.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px]">
                        {r.horaIngreso ? new Date(r.horaIngreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Pill tone={r.esTardanza ? 'warning' : 'success'}>
                          <Dot tone={r.esTardanza ? 'warning' : 'success'} size={6} />
                          {r.esTardanza ? 'Tardanza' : 'Puntual'}
                        </Pill>
                      </td>
                      <td className="px-3.5 py-2.5">
                        {r.esManual ? <Pill tone="neutral">Manual</Pill> : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-[12px] text-text-mute">
                        {r.motivoManual ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {(!asistencias?.data || asistencias.data.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-8 text-center text-text-mute text-[13px]">
                        Sin registros de asistencia
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'Apoderados' && (() => {
            const apoderados = (alumno as any).apoderados ?? []
            return (
              <Card title="Apoderados vinculados" subtitle={`${apoderados.length} apoderado${apoderados.length !== 1 ? 's' : ''}`}>
                {apoderados.length === 0 ? (
                  <p className="text-[13px] text-text-mute px-1 py-6 text-center">
                    No hay apoderados vinculados.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {apoderados.map((rel: any, i: number) => {
                      const ap = rel.apoderado
                      return (
                        <div key={ap.id} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-border-s' : ''}`}>
                          <Avatar name={`${ap.nombre} ${ap.apellidos}`} size={36} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold">{ap.nombre} {ap.apellidos}</div>
                            <div className="text-[11.5px] text-text-mute">
                              DNI {ap.dni} · {ap.usuario?.email ?? '—'}
                            </div>
                            {ap.telefono && (
                              <div className="text-[11.5px] text-text-mute">{ap.telefono}</div>
                            )}
                          </div>
                          {rel.parentesco && (
                            <Pill tone="neutral">{rel.parentesco}</Pill>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })()}

          {tab === 'Comunicados' && (
            <Card title="Comunicados recibidos">
              <p className="text-[13px] text-text-mute px-1 py-4 text-center">
                Sin comunicados recibidos.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-text">
      <span className="text-text-soft flex shrink-0">{icon}</span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
    </div>
  )
}
