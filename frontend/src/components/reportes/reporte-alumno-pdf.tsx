/**
 * reporte-alumno-pdf.tsx
 * Informe de asistencia individual de un alumno.
 * Importar SIEMPRE de forma dinámica:
 *   const { ReporteAlumnoPDF } = await import('@/components/reportes/reporte-alumno-pdf')
 */

import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

/* ─── Paleta ──────────────────────────────────────────────────── */
const C = {
  primary:   '#1e3a5f',
  secondary: '#4a6fa5',
  success:   '#166534',
  successBg: '#dcfce7',
  warning:   '#92400e',
  warningBg: '#fef3c7',
  danger:    '#991b1b',
  dangerBg:  '#fee2e2',
  neutral:   '#374151',
  neutralBg: '#f3f4f6',
  text:      '#111827',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  bg:        '#f9fafb',
  white:     '#ffffff',
}

/* ─── Estilos ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily:        'Helvetica',
    fontSize:          9,
    color:             C.text,
    paddingTop:        36,
    paddingHorizontal: 40,
    paddingBottom:     52,
    backgroundColor:   C.white,
  },

  /* ── Encabezado institucional ── */
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    marginBottom:      18,
    paddingBottom:     12,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logo:          { width: 44, height: 44, marginRight: 12, borderRadius: 4 },
  logoPlaceholder: {
    width: 44, height: 44, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText:      { color: C.white, fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  headerCenter:  { flex: 1, marginLeft: 10 },
  headerInst:    { fontSize: 15, fontWeight: 'bold', color: C.primary },
  headerSub:     { fontSize: 8, color: C.muted, marginTop: 2 },
  headerRight:   { alignItems: 'flex-end' },
  headerDate:    { fontSize: 8, color: C.muted },
  headerBadge:   { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.secondary, borderRadius: 10 },
  headerBadgeText: { fontSize: 7, color: C.white, fontWeight: 'bold' },

  /* ── Título ── */
  reportTitle: {
    fontSize: 13, fontWeight: 'bold', color: C.primary, marginBottom: 2,
  },
  reportMeta: {
    fontSize: 8, color: C.muted, marginBottom: 14,
  },

  /* ── Ficha del alumno ── */
  profileCard: {
    backgroundColor:  C.bg,
    borderRadius:     5,
    padding:          12,
    marginBottom:     14,
    borderLeftWidth:  3,
    borderLeftColor:  C.primary,
    flexDirection:    'row',
    gap:              16,
    alignItems:       'flex-start',
  },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: C.secondary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  avatarText:   { color: C.white, fontSize: 18, fontWeight: 'bold' },
  profileMain:  { flex: 1 },
  profileName:  { fontSize: 13, fontWeight: 'bold', color: C.primary, marginBottom: 2 },
  profileCode:  { fontFamily: 'Courier', fontSize: 9, color: C.muted, marginBottom: 8 },
  profileGrid:  { flexDirection: 'row', gap: 12 },
  profileCol:   { flex: 1 },
  fieldLabel:   { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2, marginTop: 5 },
  fieldValue:   { fontSize: 9, fontWeight: 'bold', color: C.text },
  fieldMono:    { fontFamily: 'Courier', fontSize: 9, color: C.primary },

  /* ── KPI cards ── */
  kpiGrid: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  14,
  },
  kpiCard: {
    flex:            1,
    backgroundColor: C.bg,
    borderRadius:    5,
    padding:         10,
    borderLeftWidth: 3,
  },
  kpiValue: { fontSize: 16, fontWeight: 'bold' },
  kpiLabel: {
    fontSize: 7, color: C.muted, marginTop: 3,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },

  /* ── Barra de progreso ── */
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  barLabel:    { fontSize: 8, color: C.muted, width: 100 },
  barTrack:    { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 10, overflow: 'hidden' },
  barFill:     { height: 6, borderRadius: 10 },
  barPct:      { fontSize: 9, fontWeight: 'bold', fontFamily: 'Courier', width: 34, textAlign: 'right' },

  /* ── Sección ── */
  sectionTitle: {
    fontSize: 10, fontWeight: 'bold', color: C.primary,
    marginBottom: 6, marginTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },

  /* ── Tabla ── */
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.primary,
    borderRadius: 3,
  },
  tableHeadCell: {
    color: C.white, fontSize: 7, fontWeight: 'bold',
    paddingVertical: 5, paddingHorizontal: 7,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    minHeight: 20,
    alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: C.bg },
  tableCell: {
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 7,
    color: C.text,
  },
  tableCellMono: { fontFamily: 'Courier', fontSize: 8 },
  tableCellMuted: { color: C.muted },

  /* ── Pills ── */
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' },
  pillSuccess: { backgroundColor: C.successBg },
  pillWarning: { backgroundColor: C.warningBg },
  pillNeutral: { backgroundColor: C.neutralBg },
  pillText:    { fontSize: 7, fontWeight: 'bold' },

  /* ── Divisor ── */
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

  /* ── Pie de página ── */
  footer: {
    position: 'absolute', bottom: 20, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.muted },
})

/* ─── Tipos ───────────────────────────────────────────────────── */
export interface AsistenciaRow {
  id:             string
  fecha:          string
  horaIngreso?:   string | null
  esTardanza:     boolean
  esManual:       boolean
  esAusente?:     boolean
  motivoManual?:  string | null
  justificacionRazon?: string | null
}

export interface ReporteAlumnoPDFProps {
  alumno: {
    nombres?:          string | null
    nombre?:           string | null
    apellidos?:        string | null
    dni?:              string | null
    codigo_barra?:     string | null
    codigoBarras?:     string | null
    estado?:           string | null
    asistencia_pct?:   number | null
    telefono?:         string | null
    fecha_nacimiento?: string | null
    aula?:             { nombre: string; ciclo?: { nombre: string } | null } | null
    carrera?:          { nombre: string } | null
    usuario?:          { email?: string } | null
  }
  registros:    AsistenciaRow[]
  cicloLabel?:  string
  logoUrl?:     string
  logoUnasamUrl?: string
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function fmtHora(iso?: string | null) {
  if (!iso) return '—'
  try {
    if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5)
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function fmtDate(s?: string | null) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return s
  }
}

function pctColor(pct: number) {
  return pct >= 90 ? C.success : pct >= 75 ? C.warning : C.danger
}
function estadoLabel(pct?: number | null, estado?: string | null) {
  return estado ?? (pct == null ? 'Activo' : pct >= 90 ? 'Activo' : pct >= 75 ? 'Observado' : 'En riesgo')
}

/* ─── Componente PDF ──────────────────────────────────────────── */
export function ReporteAlumnoPDF({
  alumno,
  registros,
  cicloLabel,
  logoUrl,
  logoUnasamUrl,
}: ReporteAlumnoPDFProps) {
  const nombre    = alumno.nombres ?? alumno.nombre ?? ''
  const apellidos = alumno.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  const codigo    = alumno.codigo_barra ?? alumno.codigoBarras ?? '——'
  const ciclo     = alumno.aula?.ciclo?.nombre ?? cicloLabel ?? '—'
  const pct       = alumno.asistencia_pct ?? 0
  const color     = pctColor(pct)

  // Stats
  const total       = registros.length
  const tardanzas   = registros.filter((r) => r.esTardanza).length
  const puntuales   = registros.filter((r) => !r.esTardanza && !r.esAusente).length
  const ausentes    = registros.filter((r) => r.esAusente).length

  const fechaGen = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const kpis = [
    { label: 'Asistencia del ciclo', value: `${pct}%`,      color },
    { label: 'Asistencias puntuales', value: String(puntuales), color: C.success },
    { label: 'Tardanzas',             value: String(tardanzas),  color: C.warning },
    { label: 'Total registros',       value: String(total),      color: C.primary },
  ]

  return (
    <Document
      title={`Informe — ${apellidos}, ${nombre}`}
      author="Sistema de Gestión Académica"
      subject="Informe de Asistencia Individual"
    >
      <Page size="A4" style={s.page}>

        {/* ── Encabezado institucional ── */}
        <View style={s.header}>
          {logoUnasamUrl ? (
            <Image src={logoUnasamUrl} style={s.logo} />
          ) : (
            <View style={[s.logoPlaceholder, { backgroundColor: '#7B1D1D', marginRight: 12 }]}>
              <Text style={s.logoText}>UNASAM</Text>
            </View>
          )}
          <View style={{ width: 1, height: 44, backgroundColor: C.border, marginHorizontal: 8, alignSelf: 'center' }} />
          {logoUrl ? (
            <Image src={logoUrl} style={s.logo} />
          ) : (
            <View style={[s.logoPlaceholder, { backgroundColor: C.primary }]}>
              <Text style={s.logoText}>CPre</Text>
            </View>
          )}
          <View style={[s.headerCenter]}>
            <Text style={s.headerInst}>Centro Preuniversitario</Text>
            <Text style={s.headerSub}>Universidad Nacional de San Martín</Text>
            <Text style={[s.headerSub, { marginTop: 1 }]}>Sistema de Gestión Académica</Text>
            <Text style={[s.headerSub, { marginTop: 1 }]}>Ciclo: {ciclo}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>Generado: {fechaGen}</Text>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>INFORME INDIVIDUAL</Text>
            </View>
          </View>
        </View>

        {/* ── Título ── */}
        <Text style={s.reportTitle}>Informe de Asistencia Individual</Text>
        <Text style={s.reportMeta}>
          Ciclo {ciclo}{alumno.aula ? ` · Aula ${alumno.aula.nombre}` : ''}
          {alumno.carrera ? ` · ${alumno.carrera.nombre}` : ''}
        </Text>

        {/* ── Ficha del alumno ── */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(fullName)}</Text>
          </View>
          <View style={s.profileMain}>
            <Text style={s.profileName}>{apellidos}, {nombre}</Text>
            <Text style={s.profileCode}>
              Código: {codigo}{alumno.dni ? `  ·  DNI: ${alumno.dni}` : ''}
            </Text>
            <View style={s.profileGrid}>
              <View style={s.profileCol}>
                <Text style={s.fieldLabel}>Aula / Sección</Text>
                <Text style={s.fieldValue}>{alumno.aula?.nombre ?? '—'}</Text>
                <Text style={s.fieldLabel}>Carrera profesional</Text>
                <Text style={s.fieldValue}>{alumno.carrera?.nombre ?? '—'}</Text>
              </View>
              <View style={s.profileCol}>
                <Text style={s.fieldLabel}>Email institucional</Text>
                <Text style={s.fieldValue}>{alumno.usuario?.email ?? '—'}</Text>
                <Text style={s.fieldLabel}>Fecha de nacimiento</Text>
                <Text style={s.fieldValue}>{fmtDate(alumno.fecha_nacimiento)}</Text>
              </View>
              <View style={s.profileCol}>
                <Text style={s.fieldLabel}>Teléfono</Text>
                <Text style={s.fieldValue}>{alumno.telefono ?? '—'}</Text>
                <Text style={s.fieldLabel}>Estado académico</Text>
                <View style={[
                  s.pill,
                  pct >= 90 ? s.pillSuccess : pct >= 75 ? s.pillWarning : { backgroundColor: C.dangerBg },
                  { marginTop: 3 },
                ]}>
                  <Text style={[s.pillText, { color }]}>
                    {estadoLabel(pct, alumno.estado)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── KPIs ── */}
        <View style={s.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={[s.kpiCard, { borderLeftColor: k.color }]}>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Barra de asistencia ── */}
        <View style={s.barRow}>
          <Text style={s.barLabel}>Asistencia del ciclo</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
          </View>
          <Text style={[s.barPct, { color }]}>{pct}%</Text>
        </View>

        {/* ── Historial de asistencia ── */}
        <Text style={s.sectionTitle}>
          Historial de Asistencia ({total} registro{total !== 1 ? 's' : ''})
        </Text>

        {/* Cabecera de tabla */}
        <View style={s.tableHead}>
          <Text style={[s.tableHeadCell, { flex: 2.5 }]}>Fecha</Text>
          <Text style={[s.tableHeadCell, { flex: 1.2 }]}>Hora</Text>
          <Text style={[s.tableHeadCell, { flex: 1.5 }]}>Estado</Text>
          <Text style={[s.tableHeadCell, { flex: 1 }]}>Tipo</Text>
          <Text style={[s.tableHeadCell, { flex: 2.5 }]}>Observación</Text>
        </View>

        {/* Filas */}
        {registros.length > 0 ? (
          registros.map((r, i) => (
            <View key={r.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]} wrap={false}>
              <Text style={[s.tableCell, s.tableCellMono, { flex: 2.5 }]}>
                {fmtFecha(r.fecha)}
              </Text>
              <Text style={[s.tableCell, s.tableCellMono, { flex: 1.2 }]}>
                {fmtHora(r.horaIngreso)}
              </Text>
              <View style={[s.tableCell, { flex: 1.5 }]}>
                {r.esAusente ? (
                  <View style={[s.pill, { backgroundColor: C.dangerBg }]}>
                    <Text style={[s.pillText, { color: C.danger }]}>Ausente</Text>
                  </View>
                ) : r.esTardanza ? (
                  <View style={[s.pill, s.pillWarning]}>
                    <Text style={[s.pillText, { color: C.warning }]}>Tardanza</Text>
                  </View>
                ) : (
                  <View style={[s.pill, s.pillSuccess]}>
                    <Text style={[s.pillText, { color: C.success }]}>Puntual</Text>
                  </View>
                )}
              </View>
              <View style={[s.tableCell, { flex: 1 }]}>
                {r.esManual ? (
                  <View style={[s.pill, s.pillNeutral]}>
                    <Text style={[s.pillText, { color: C.neutral }]}>Manual</Text>
                  </View>
                ) : (
                  <Text style={[s.tableCellMuted, { fontSize: 8 }]}>Auto</Text>
                )}
              </View>
              <Text style={[s.tableCell, s.tableCellMuted, { flex: 2.5 }]}>
                {r.justificacionRazon ?? r.motivoManual ?? '—'}
              </Text>
            </View>
          ))
        ) : (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: C.muted }}>Sin registros de asistencia.</Text>
          </View>
        )}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Centro Preuniversitario · UNASAM</Text>
          <Text style={s.footerText}>{apellidos}, {nombre} · Código {codigo}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
