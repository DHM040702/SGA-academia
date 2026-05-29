/**
 * asistencia-lista-pdf.tsx
 * PDF de lista de asistencia (admin diario + portal personal).
 * Importar SIEMPRE de forma dinámica:
 *   const { pdf } = await import('@react-pdf/renderer')
 *   const { AsistenciaListaPDF } = await import('@/components/reportes/asistencia-lista-pdf')
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
    paddingBottom:     48,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    marginBottom:      18,
    paddingBottom:     12,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logo: { width: 44, height: 44, marginRight: 12, borderRadius: 4 },
  logoPlaceholder: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 4,
  },
  logoText:   { color: C.white, fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  headerCenter: { flex: 1, marginLeft: 10 },
  headerInst:   { fontSize: 15, fontWeight: 'bold', color: C.primary },
  headerSub:    { fontSize: 8, color: C.muted, marginTop: 2 },
  headerRight:  { alignItems: 'flex-end' },
  headerDate:   { fontSize: 8, color: C.muted },
  headerBadge:  { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.secondary, borderRadius: 10 },
  headerBadgeText: { fontSize: 7, color: C.white, fontWeight: 'bold' },

  reportTitle: { fontSize: 13, fontWeight: 'bold', color: C.primary, marginBottom: 2 },
  reportMeta:  { fontSize: 8, color: C.muted, marginBottom: 14 },

  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: C.bg, borderRadius: 5, padding: 10, borderLeftWidth: 3 },
  kpiValue: { fontSize: 16, fontWeight: 'bold' },
  kpiLabel: { fontSize: 7, color: C.muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },

  tableHead: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 3 },
  tableHeadCell: {
    color: C.white, fontSize: 7, fontWeight: 'bold',
    paddingVertical: 5, paddingHorizontal: 7,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: C.bg },
  tableCell: { fontSize: 8, paddingVertical: 4, paddingHorizontal: 7, color: C.text },
  tableCellMuted: { color: C.muted },
  tableCellMono:  { fontFamily: 'Courier', fontSize: 8 },

  pill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10, fontSize: 7, fontWeight: 'bold' },
  pillSuccess: { backgroundColor: C.successBg, color: C.success },
  pillWarning: { backgroundColor: C.warningBg, color: C.warning },
  pillNeutral: { backgroundColor: C.neutralBg, color: C.neutral },

  footer: {
    position: 'absolute', bottom: 20, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.muted },
})

/* ─── Types ───────────────────────────────────────────────────── */
export interface AsistenciaRecord {
  id: string
  fecha: string
  horaIngreso?: string | null
  esTardanza:   boolean
  esManual:     boolean
  tipoPersona?: string | null
  alumno?:      { nombre?: string; nombres?: string; apellidos?: string; aula?: { nombre: string } | null } | null
  docente?:     { nombre?: string; apellidos?: string } | null
  motivoManual?: string | null
}

export interface AsistenciaListaPDFProps {
  titulo:      string
  subtitulo?:  string
  records:     AsistenciaRecord[]
  /** Modo admin: muestra Nombre, Tipo, Aula, Estado, Origen
   *  Modo personal: muestra Fecha, Hora, Estado, Tipo, Obs */
  modo:        'admin' | 'personal'
  kpis?: { label: string; value: string | number; color: string }[]
  logoUrl?:       string
  logoUnasamUrl?: string
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmtHora(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'))
      .toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function personaNombre(r: AsistenciaRecord) {
  const p = r.tipoPersona === 'docente' ? r.docente : r.alumno
  if (!p) return '—'
  const nom = (p as any).nombre ?? (p as any).nombres ?? ''
  return `${nom} ${p.apellidos ?? ''}`.trim() || '—'
}

/* ─── Documento ───────────────────────────────────────────────── */
export function AsistenciaListaPDF({
  titulo, subtitulo, records, modo, kpis,
  logoUrl, logoUnasamUrl,
}: AsistenciaListaPDFProps) {
  const fechaGeneracion = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) + ' ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

  return (
    <Document
      title={titulo + ' — Centro Preuniversitario'}
      author="Sistema de Gestión Académica"
    >
      <Page size="A4" orientation={modo === 'admin' ? 'landscape' : 'portrait'} style={s.page}>

        {/* ── Encabezado institucional ── */}
        <View style={s.header}>
          {logoUnasamUrl ? (
            <Image src={logoUnasamUrl} style={s.logo} />
          ) : (
            <View style={[s.logoPlaceholder, { backgroundColor: '#7B1D1D', marginRight: 12 }]}>
              <Text style={s.logoText}>{'UNASAM'}</Text>
            </View>
          )}
          <View style={{ width: 1, height: 44, backgroundColor: C.border, marginHorizontal: 8, alignSelf: 'center' }} />
          {logoUrl ? (
            <Image src={logoUrl} style={s.logo} />
          ) : (
            <View style={[s.logoPlaceholder, { backgroundColor: C.primary, marginRight: 0 }]}>
              <Text style={s.logoText}>{'CPre'}</Text>
            </View>
          )}
          <View style={s.headerCenter}>
            <Text style={s.headerInst}>Centro Preuniversitario</Text>
            <Text style={s.headerSub}>Universidad Nacional de San Martín</Text>
            <Text style={[s.headerSub, { marginTop: 1 }]}>Sistema de Gestión Académica</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>Generado: {fechaGeneracion}</Text>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>DOCUMENTO GENERADO POR SISTEMA</Text>
            </View>
          </View>
        </View>

        {/* ── Título ── */}
        <Text style={s.reportTitle}>{titulo}</Text>
        {subtitulo && <Text style={s.reportMeta}>{subtitulo} · {records.length} registros</Text>}

        {/* ── KPIs ── */}
        {kpis && kpis.length > 0 && (
          <View style={s.kpiGrid}>
            {kpis.map((k) => (
              <View key={k.label} style={[s.kpiCard, { borderLeftColor: k.color }]}>
                <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
                <Text style={s.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Tabla ADMIN ── */}
        {modo === 'admin' && (
          <>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { width: 52 }]}>Hora</Text>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Nombre</Text>
              <Text style={[s.tableHeadCell, { width: 60 }]}>Tipo</Text>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Aula</Text>
              <Text style={[s.tableHeadCell, { width: 70 }]}>Estado</Text>
              <Text style={[s.tableHeadCell, { width: 55 }]}>Origen</Text>
            </View>
            {records.map((r, i) => (
              <View key={r.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.tableCellMono, { width: 52 }]}>{fmtHora(r.horaIngreso)}</Text>
                <Text style={[s.tableCell, { flex: 3 }]}>{personaNombre(r)}</Text>
                <View style={[s.tableCell, { width: 60 }]}>
                  <View style={[s.pill, r.tipoPersona === 'docente' ? { backgroundColor: '#e0e7ff', color: '#3730a3' } : { backgroundColor: '#dbeafe', color: '#1e40af' }]}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{r.tipoPersona === 'docente' ? 'Docente' : 'Alumno'}</Text>
                  </View>
                </View>
                <Text style={[s.tableCell, s.tableCellMuted, { flex: 2 }]}>
                  {r.alumno?.aula?.nombre ?? '—'}
                </Text>
                <View style={[s.tableCell, { width: 70 }]}>
                  <View style={[s.pill, r.esTardanza ? s.pillWarning : s.pillSuccess]}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{r.esTardanza ? 'Tardanza' : 'Puntual'}</Text>
                  </View>
                </View>
                <Text style={[s.tableCell, s.tableCellMuted, { width: 55 }]}>
                  {r.esManual ? 'Manual' : 'Escáner'}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Tabla PERSONAL ── */}
        {modo === 'personal' && (
          <>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 2.5 }]}>Fecha</Text>
              <Text style={[s.tableHeadCell, { width: 60 }]}>Hora ingreso</Text>
              <Text style={[s.tableHeadCell, { width: 70 }]}>Estado</Text>
              <Text style={[s.tableHeadCell, { width: 60 }]}>Tipo</Text>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Observación</Text>
            </View>
            {records.map((r, i) => (
              <View key={r.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.tableCellMono, { flex: 2.5 }]}>{fmtFecha(r.fecha)}</Text>
                <Text style={[s.tableCell, s.tableCellMono, { width: 60 }]}>{fmtHora(r.horaIngreso)}</Text>
                <View style={[s.tableCell, { width: 70 }]}>
                  <View style={[s.pill, r.esTardanza ? s.pillWarning : s.pillSuccess]}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{r.esTardanza ? 'Tardanza' : 'Puntual'}</Text>
                  </View>
                </View>
                <View style={[s.tableCell, { width: 60 }]}>
                  {r.esManual ? (
                    <View style={[s.pill, s.pillNeutral]}>
                      <Text style={{ fontSize: 7, fontWeight: 'bold' }}>Manual</Text>
                    </View>
                  ) : <Text style={s.tableCellMuted}>—</Text>}
                </View>
                <Text style={[s.tableCell, s.tableCellMuted, { flex: 2 }]}>
                  {r.motivoManual ?? '—'}
                </Text>
              </View>
            ))}
          </>
        )}

        {records.length === 0 && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 10 }}>Sin registros de asistencia</Text>
          </View>
        )}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Centro Preuniversitario · Sistema de Gestión Académica</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
