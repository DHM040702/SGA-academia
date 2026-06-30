'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useActiveCiclo } from '@/hooks/use-ciclos'
import { cicloWeekInfo } from '@/contexts/ciclo-context'
import { useAsistencia } from '@/hooks/use-asistencia'
import { useHorarios, type Horario } from '@/hooks/use-horarios'
import { useComunicados, type Comunicado } from '@/hooks/use-comunicados'
import { useBiblioteca, type RecursoBiblioteca } from '@/hooks/use-biblioteca'
import { KPI } from '@/components/ui/kpi'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Avatar } from '@/components/ui/avatar'
import { Barcode } from '@/components/ui/barcode'
import { Download, ChevR, FileText, Play, Link as LinkIcon } from '@/components/icons'
import Link from 'next/link'

async function descargarCarnetPortal(alumno: {
  nombre: string; apellidos: string; codigoBarras?: string | null; aulaId?: string | null
}) {
  const [{ pdf }, { CarnetPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/reportes/carnet-pdf'),
  ])
  const logoUrl       = `${window.location.origin}/logo.png`
  const logoUnasamUrl = `${window.location.origin}/logo-unasam.png`
  const element = CarnetPDF({
    alumno: { nombre: alumno.nombre, apellidos: alumno.apellidos, codigoBarras: alumno.codigoBarras },
    logoUrl,
    logoUnasamUrl,
  })
  const blob = await pdf(element).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `carnet-${alumno.codigoBarras ?? alumno.apellidos}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function descargarReporteCicloApoderado(
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
    titulo:    'Reporte de Asistencia del Ciclo',
    subtitulo: `Seguimiento — ${nombre}`,
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
  a.download = `reporte-ciclo.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── helpers ─────────────────────────────────────────────────── */
const TODAY_DAY = new Date().getDay() || 7   // JS: 0=Sun → remap to 7
const TODAY_STR = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

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
  // Hora de CLASE (@db.Time): extrae HH:MM SIN convertir zona (UTC puro).
  // "1970-01-01T14:00:00.000Z" → "14:00"  |  "14:00:00" → "14:00"  |  "14:00" → "14:00"
  if (t.includes('T')) return t.slice(11, 16)
  return t.slice(0, 5)
}

// Hora de un INSTANTE real (ej. hora de ingreso de asistencia, timestamptz):
// aquí SÍ se convierte a la zona local.
function fmtHoraReal(t?: string | null) {
  if (!t) return '—'
  const d = new Date(t)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

/** Saludo según la hora del día. */
function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function tipoIcon(tipo: string) {
  if (tipo === 'pdf') return <FileText size={28} />
  if (tipo === 'video') return <Play size={28} />
  return <LinkIcon size={28} />
}

const TIPO_COLOR: Record<string, string> = {
  pdf: 'var(--color-danger)',
  video: 'var(--color-primary)',
  enlace: 'var(--color-info)',
  iframe: 'var(--color-success)',
}

/* ─── page ─────────────────────────────────────────────────────── */
export default function PortalInicioPage() {
  const { user } = useAuth()
  const cicloActivo = useActiveCiclo()
  if (!user) return null

  const isApoderado = user.rol === 'apoderado'
  return isApoderado ? <ApoderadoInicio user={user} /> : <AlumnoInicio user={user} />
}

/* ─── alumno view ────────────────────────────────────────────────── */
function AlumnoInicio({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const alumno = user?.alumno
  const nombre = alumno?.nombre ?? user!.email.split('@')[0]
  const apellidos = alumno?.apellidos ?? ''
  const fullName = `${nombre} ${apellidos}`.trim()
  const firstName = nombre.split(' ')[0]
  const aulaId: string | undefined = (alumno as any)?.aulaId ?? undefined
  const alumnoId: string | undefined = alumno?.id
  const codigoBarras: string = alumno?.codigoBarras ?? '000000'
  // Recursos solo de SU área (+ los generales). Sin área → solo generales.
  const areaAlumno: 'ciencias' | 'letras' | 'medicas' | undefined = (alumno as any)?.aula?.area ?? undefined

  const cicloActivo = useActiveCiclo()
  const { data: horariosRes } = useHorarios(aulaId ? { aula_id: aulaId } : {})
  const { data: asistencias } = useAsistencia(alumnoId ? { alumno_id: alumnoId, limit: 15 } : {})
  const { data: comunicados } = useComunicados({ limit: 3 })
  const { data: recursos } = useBiblioteca(
    areaAlumno ? { limit: 4, area: areaAlumno } : { limit: 4, solo_generales: true },
  )

  // Solo los horarios de SU aula. Si no tiene aula asignada, no mostramos los de
  // todas las aulas (sería dato incorrecto): queda vacío con aviso.
  const allHorarios: Horario[] = aulaId ? ((horariosRes as any)?.data ?? []) : []
  const todayHorarios = allHorarios
    .filter((h) => h.diaSemana === TODAY_DAY)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  // Semana del ciclo (dinámica) y nombre real del aula
  const cicloWeek = cicloActivo ? cicloWeekInfo(cicloActivo.fechaInicio, cicloActivo.fechaFin) : null
  const aulaNombre = allHorarios[0]?.aula?.nombre ?? (aulaId ? 'Aula asignada' : 'Sin aula')

  const records = asistencias?.data ?? []
  const total = records.length
  const puntuales = records.filter((r) => !r.esTardanza).length
  const tardanzas = records.filter((r) => r.esTardanza).length
  const pct = total > 0 ? Math.round((puntuales / total) * 100) : 0
  const puntualidadPct = total > 0 ? Math.round(((total - tardanzas) / total) * 100) : 0

  const avisos: Comunicado[] = comunicados?.data ?? []
  const recursosList: RecursoBiblioteca[] = recursos?.data ?? []

  // build 15-bar attendance chart (last 15 sessions)
  const last15 = records.slice(0, 15).reverse()

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-7 pb-8">
      {/* Hero */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-5">
        <div>
          <div className="text-[11.5px] text-text-mute mb-1 capitalize">
            {TODAY_STR}{cicloWeek ? ` · semana ${cicloWeek.week} de ${cicloWeek.total}` : ''}
          </div>
          <h1 className="m-0 font-serif font-semibold text-[24px] md:text-[30px] tracking-[-0.02em] leading-[1.1]">
            {saludo()}, {firstName}.
          </h1>
          {todayHorarios.length > 0 ? (
            <p className="mt-1.5 text-[13.5px] text-text-mute">
              Hoy tienes <strong className="text-text">{todayHorarios.length} clases</strong> · primera a las{' '}
              <strong className="text-primary">{fmtTime(todayHorarios[0]?.horaInicio)}</strong>.
            </p>
          ) : (
            <p className="mt-1.5 text-[13.5px] text-text-mute">No tienes clases hoy.</p>
          )}
        </div>
      </div>

      {!aulaId && (
        <div className="mb-5 flex items-start gap-3 p-3.5 rounded-3 border border-warning bg-warning-light/40 text-[12.5px]">
          <span className="font-semibold text-warning">Sin aula asignada.</span>
          <span className="text-text-mute">Aún no estás matriculado en un aula del ciclo activo, por eso no se muestra tu horario. Comunícate con administración.</span>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* KPIs row */}
        <KPI label="Asistencia ciclo" value={`${pct}%`} sub={`${puntuales} / ${total} sesiones`} accent="var(--color-success)" />
        <KPI label="Puntualidad" value={`${puntualidadPct}%`} sub={`${tardanzas} tardanzas registradas`} accent="var(--color-primary)" />
        <KPI label="Total registros" value={total} sub="del ciclo actual" accent="var(--color-warning)" />

        {/* Left 2 columns */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Today's classes */}
          <Card title="Hoy" subtitle={TODAY_STR}>
            {todayHorarios.length === 0 ? (
              <p className="px-[18px] py-4 text-[13px] text-text-mute">Sin clases programadas para hoy.</p>
            ) : (
              <div className="px-[18px] pb-4">
                {todayHorarios.map((h, i) => {
                  const col = colorFor(h.curso?.nombre ?? '')
                  const inicio = fmtTime(h.horaInicio)
                  return (
                    <div
                      key={h.id}
                      className="flex gap-3.5 py-3 items-center"
                      style={{ borderTop: i > 0 ? '1px solid var(--color-border-s)' : 'none' }}
                    >
                      <div className="w-[56px] leading-tight">
                        <div className="font-mono text-[13px] font-bold text-primary">{inicio}</div>
                        <div className="font-mono text-[10.5px] text-text-mute">
                          {fmtTime(h.horaInicio)}–{fmtTime(h.horaFin)}
                        </div>
                      </div>
                      <div className="w-1 h-11 rounded-full shrink-0" style={{ background: col }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-serif text-[17px] font-semibold tracking-tight truncate">
                          {h.curso?.nombre ?? '—'}
                        </div>
                        <div className="text-[12.5px] text-text-mute mt-0.5">
                          {h.docente ? `${h.docente.nombre} ${h.docente.apellidos}` : '—'}
                          {h.aula?.nombre ? ` · ${h.aula.nombre}` : ''}
                        </div>
                      </div>
                      <Btn variant="ghost" size="sm" icon={<ChevR size={14} />} />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Attendance mini chart */}
          <Card
            title="Mi asistencia"
            subtitle="Últimas 15 sesiones"
            action={
              <Link href="/portal/asistencia">
                <Btn variant="ghost" size="sm">Ver detalle</Btn>
              </Link>
            }
          >
            <div className="px-[18px] pb-4">
              <div className="flex items-center gap-6 mb-3.5">
                <div>
                  <span className="font-serif text-[42px] font-semibold leading-none tracking-[-0.02em]"
                    style={{ color: pct >= 90 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {pct}<span className="text-[20px]">%</span>
                  </span>
                  <div className="text-[12px] text-text-mute mt-1">
                    {puntuales} puntuales · {tardanzas} tardanzas
                  </div>
                </div>
                <div className="flex-1 flex gap-1 items-end h-[36px]">
                  {last15.length > 0 ? last15.map((r, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-[3px]"
                        style={{
                          height: 30,
                          background: r.esTardanza
                            ? 'var(--color-warning)'
                            : 'var(--color-success)',
                          opacity: i === last15.length - 1 ? 1 : 0.8,
                        }}
                      />
                      <span className="text-[9px] text-text-mute font-mono">
                        {WEEK_DAYS[(new Date(r.fecha).getDay() + 6) % 7]}
                      </span>
                    </div>
                  )) : (
                    <div className="text-[12px] text-text-mute">Sin registros</div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 pt-3 border-t border-border-s text-[11.5px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-success inline-block" />
                  Puntual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-warning inline-block" />
                  Tardanza
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Carnet */}
          <Card>
            <div
              className="rounded-t-3 px-[18px] pt-4 pb-[14px] relative overflow-hidden"
              style={{ backgroundColor: '#2d426d', background: 'linear-gradient(160deg, var(--color-primary) 0%, oklch(0.28 0.10 255) 100%)', color: '#fff' }}
            >
              <svg
                width="200" height="120" viewBox="0 0 200 120"
                className="absolute right-[-40px] top-[-20px] opacity-10 pointer-events-none"
              >
                <circle cx="100" cy="60" r="50" fill="none" stroke="#fff" strokeWidth="1" />
                <circle cx="100" cy="60" r="32" fill="none" stroke="#fff" strokeWidth="1" />
              </svg>
              <div className="flex items-center gap-2.5 relative">
                <Avatar name={fullName} size={44} />
                <div>
                  <div className="text-[9px] tracking-[0.12em] uppercase opacity-80">Mi carnet{cicloActivo ? ` · ${cicloActivo.nombre}` : ''}</div>
                  <div className="font-serif text-[15px] font-semibold mt-0.5 leading-tight">{fullName}</div>
                  <div className="text-[11px] opacity-85 mt-0.5">
                    {aulaNombre} · DNI {user?.dni ?? '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center py-3 bg-white mx-0 rounded-b-3">
              <Barcode value={codigoBarras} w={200} h={52} />
            </div>
          </Card>

          {/* Avisos */}
          <Card
            title="Avisos"
            subtitle={avisos.length > 0 ? `${avisos.length} recientes` : 'Sin avisos'}
            action={
              <Link href="/portal/comunicados">
                <Btn variant="ghost" size="sm">Ver todos</Btn>
              </Link>
            }
          >
            <div className="px-[14px] pb-3">
              {avisos.length === 0 && (
                <p className="text-[13px] text-text-mute py-3 text-center">Sin avisos recientes.</p>
              )}
              {avisos.map((c, i) => (
                <div
                  key={c.id}
                  className="flex gap-2 py-2.5 items-start"
                  style={{ borderTop: i > 0 ? '1px solid var(--color-border-s)' : 'none' }}
                >
                  <div className="pt-[3px]">
                    <Dot tone="primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold truncate">{c.titulo}</div>
                    <div className="text-[11px] text-text-mute mt-0.5">
                      {c.publicadoPor?.email ?? '—'} · {timeAgo(c.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent resources */}
        <Card
          title="Continuar estudiando"
          subtitle="Recursos recientes"
          className="md:col-span-3"
        >
          <div className="px-[18px] pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {recursosList.length === 0 && (
              <p className="col-span-4 text-[13px] text-text-mute py-2 text-center">Sin recursos disponibles.</p>
            )}
            {recursosList.map((r) => (
              <div
                key={r.id}
                className="border border-border rounded-3 overflow-hidden cursor-pointer bg-surface hover:shadow-2 transition-shadow"
              >
                <div
                  className="h-[88px] bg-surface2 flex items-center justify-center relative"
                  style={{ color: TIPO_COLOR[r.tipo] }}
                >
                  <span className="opacity-30">
                    {tipoIcon(r.tipo)}
                  </span>
                  <span
                    className="absolute font-serif text-[28px] font-bold uppercase opacity-20"
                    style={{ color: TIPO_COLOR[r.tipo] }}
                  >
                    {r.tipo}
                  </span>
                </div>
                <div className="p-3">
                  <div className="text-[12.5px] font-semibold leading-snug line-clamp-2">{r.titulo}</div>
                  <div className="text-[11px] text-text-mute font-mono mt-1">
                    {r.curso?.nombre ?? r.nivel ?? '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ─── apoderado view ──────────────────────────────────────────────── */
function ApoderadoInicio({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const apoderado = user?.apoderado
  const nombre = apoderado?.nombre ?? user!.email.split('@')[0]
  const firstName = nombre.split(' ')[0]
  const cicloActivo = useActiveCiclo()

  // Hijos vinculados (vienen en /auth/me). Se sigue al seleccionado.
  const hijos = apoderado?.alumnos ?? []
  const [hijoIdx, setHijoIdx] = useState(0)
  const hijo = hijos[hijoIdx]?.alumno
  const hijoId = hijo?.id
  const hijoNombre = hijo ? `${hijo.nombre} ${hijo.apellidos}` : ''

  // Asistencia DEL HIJO (antes se pedía sin alumno_id → datos ajenos/vacíos).
  const { data: asistencias } = useAsistencia(hijoId ? { alumno_id: hijoId, limit: 30 } : {})
  const { data: comunicados } = useComunicados({ limit: 3 })

  const records = hijoId ? (asistencias?.data ?? []) : []
  const total = records.length
  const puntuales = records.filter((r) => !r.esTardanza).length
  const tardanzas = records.filter((r) => r.esTardanza).length
  const pct = total > 0 ? Math.round((puntuales / total) * 100) : 0
  const avisos: Comunicado[] = comunicados?.data ?? []

  // Find today's record
  const today = new Date().toISOString().split('T')[0]
  const todayRecord = records.find((r) => r.fecha?.startsWith(today))

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-7 pb-8">
      {/* Hero */}
      <div className="mb-5">
        <div className="text-[11.5px] text-text-mute mb-1 capitalize">{TODAY_STR}{cicloActivo ? ` · ciclo ${cicloActivo.nombre}` : ''}</div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="m-0 font-serif font-semibold text-[24px] md:text-[30px] tracking-[-0.02em] leading-[1.1]">
              {saludo()}, {firstName}.
            </h1>
            {hijo ? (
              <>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[13.5px] text-text-mute">
                  <span>Seguimiento de <strong className="text-text">{hijoNombre}</strong>{hijo.aula?.nombre ? ` · ${hijo.aula.nombre}` : ''}.</span>
                  {hijos.length > 1 && (
                    <select
                      value={hijoIdx}
                      onChange={(e) => setHijoIdx(Number(e.target.value))}
                      className="text-[12.5px] px-2 py-1 border border-border rounded-2 bg-surface focus:outline-none focus:border-primary"
                    >
                      {hijos.map((h, i) => (
                        <option key={i} value={i}>{h.alumno.nombre} {h.alumno.apellidos}</option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-text-mute">
                  {todayRecord
                    ? <>Ingresó hoy a las <strong className="text-success">{fmtHoraReal(todayRecord.horaIngreso)}</strong>.</>
                    : 'Aún no hay registro de asistencia hoy.'}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[13.5px] text-warning font-medium">
                No tienes hijos vinculados a tu cuenta. Comunícate con administración.
              </p>
            )}
          </div>
          {hijo && (
            <Btn
              variant="secondary"
              icon={<Download size={14} />}
              size="sm"
              onClick={() => descargarReporteCicloApoderado(
                records, hijoNombre,
                total, puntuales, tardanzas,
              )}
            >Reporte del ciclo</Btn>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <KPI label="Asistencia ciclo" value={`${pct}%`} sub={`${puntuales} / ${total} sesiones`} accent="var(--color-success)" />
          <KPI label="Puntualidad" value={`${total - tardanzas > 0 ? Math.round(((total - tardanzas) / total) * 100) : 0}%`} sub={`${tardanzas} tardanzas`} accent="var(--color-primary)" />
          <KPI label="Ausencias" value={0} sub="0 justificadas" accent="var(--color-info)" />
          <KPI label="Avisos sin leer" value={avisos.length} sub="avisos recientes" accent="var(--color-warning)" />
        </div>

        {/* Attendance + avisos */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-[1.5fr_minmax(0,1fr)]">
          <Card
            title="Asistencia reciente"
            subtitle="Últimos registros"
            action={
              <Link href="/portal/asistencia">
                <Btn variant="ghost" size="sm">Calendario completo</Btn>
              </Link>
            }
          >
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {['Fecha', 'Ingreso', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-[18px] py-2 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-[18px] py-6 text-center text-text-mute text-[13px]">
                      Sin registros de asistencia
                    </td>
                  </tr>
                )}
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-border-s">
                    <td className="px-[18px] py-2.5 font-mono text-[12px] text-text-mute">
                      {new Date(r.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-[18px] py-2.5 font-mono text-[12px]">
                      {r.horaIngreso ? fmtHoraReal(r.horaIngreso) : '—'}
                    </td>
                    <td className="px-[18px] py-2.5">
                      <Pill tone={r.esTardanza ? 'warning' : 'success'}>
                        <Dot tone={r.esTardanza ? 'warning' : 'success'} size={6} />
                        {r.esTardanza ? 'Tardanza' : 'Puntual'}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex flex-col gap-4">
            {/* Avisos */}
            <Card
              title="Avisos para apoderados"
              action={avisos.length > 0 ? <Pill tone="danger">{avisos.length} nuevos</Pill> : undefined}
            >
              <div className="px-4 pb-3">
                {avisos.length === 0 && (
                  <p className="text-[13px] text-text-mute py-3 text-center">Sin avisos recientes.</p>
                )}
                {avisos.map((c, i) => (
                  <div
                    key={c.id}
                    className="py-2.5"
                    style={{ borderTop: i > 0 ? '1px solid var(--color-border-s)' : 'none' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Dot tone="primary" />
                      <div className="text-[12.5px] font-semibold flex-1 truncate">{c.titulo}</div>
                      <span className="text-[10.5px] text-text-soft">{timeAgo(c.createdAt)}</span>
                    </div>
                    <div className="text-[11.5px] text-text-mute ml-4 line-clamp-2">{c.cuerpo}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick contact */}
            <Card title="Contacto rápido">
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2.5 py-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                  >
                    <span className="text-[12px] font-semibold">DP</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold">Dirección académica</div>
                    <div className="text-[11px] text-text-mute">L–V 08:00–17:00</div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2.5 py-2"
                  style={{ borderTop: '1px solid var(--color-border-s)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-surface3)', color: 'var(--color-text-mute)' }}
                  >
                    <span className="text-[12px] font-semibold">SC</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold">Secretaría</div>
                    <div className="text-[11px] text-text-mute">(043) 421-887</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
