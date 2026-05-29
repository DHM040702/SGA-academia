/**
 * reporte-pdf.tsx
 * Componente PDF para reportes de asistencia.
 * Importar SIEMPRE de forma dinámica desde el cliente:
 *   const { pdf } = await import('@react-pdf/renderer')
 */

import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

/* ─── Paleta ──────────────────────────────────────────────────── */
const C = {
  primary:   '#1e3a5f',
  secondary: '#4a6fa5',
  success:   '#166534',
  warning:   '#92400e',
  danger:    '#991b1b',
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

  /* Encabezado */
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    marginBottom:      18,
    paddingBottom:     12,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logo: {
    width:       44,
    height:      44,
    marginRight: 12,
    borderRadius: 4,
  },
  logoPlaceholder: {
    width:            44,
    height:           44,
    marginRight:      12,
    backgroundColor:  C.primary,
    borderRadius:     4,
    alignItems:       'center',
    justifyContent:   'center',
  },
  logoText: {
    color:      C.white,
    fontSize:   10,
    fontWeight: 'bold',
  },
  headerCenter: { flex: 1 },
  headerInst: {
    fontSize:   15,
    fontWeight: 'bold',
    color:      C.primary,
  },
  headerSub: {
    fontSize:  8,
    color:     C.muted,
    marginTop: 2,
  },
  headerRight: { alignItems: 'flex-end' },
  headerDate: {
    fontSize: 8,
    color:    C.muted,
  },
  headerBadge: {
    marginTop:       4,
    paddingHorizontal: 6,
    paddingVertical:  2,
    backgroundColor: C.secondary,
    borderRadius:    10,
  },
  headerBadgeText: {
    fontSize: 7,
    color:    C.white,
    fontWeight: 'bold',
  },

  /* Título del reporte */
  reportTitle: {
    fontSize:     13,
    fontWeight:   'bold',
    color:        C.primary,
    marginBottom: 2,
  },
  reportMeta: {
    fontSize:     8,
    color:        C.muted,
    marginBottom: 14,
  },

  /* KPI cards */
  kpiGrid: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  16,
  },
  kpiCard: {
    flex:            1,
    backgroundColor: C.bg,
    borderRadius:    5,
    padding:         10,
    borderLeftWidth: 3,
  },
  kpiValue: {
    fontSize:   16,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize:      7,
    color:         C.muted,
    marginTop:     3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* Sección */
  sectionTitle: {
    fontSize:         10,
    fontWeight:       'bold',
    color:            C.primary,
    marginBottom:     6,
    marginTop:        14,
    paddingBottom:    4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  /* Tablas */
  tableHead: {
    flexDirection:   'row',
    backgroundColor: C.primary,
    borderRadius:    3,
  },
  tableHeadCell: {
    color:         C.white,
    fontSize:      7,
    fontWeight:    'bold',
    paddingVertical: 5,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection:     'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.bg,
  },
  tableCell: {
    fontSize:          8,
    paddingVertical:   4,
    paddingHorizontal: 8,
    color:             C.text,
  },
  tableCellMuted: { color: C.muted },
  tableCellMono:  { fontFamily: 'Courier', fontSize: 8 },

  /* Pills de estado */
  pill: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      10,
    fontSize:          7,
    fontWeight:        'bold',
  },
  pillSuccess: { backgroundColor: '#dcfce7', color: C.success },
  pillWarning: { backgroundColor: '#fef3c7', color: C.warning },
  pillDanger:  { backgroundColor: '#fee2e2', color: C.danger  },

  /* Barra de progreso */
  barContainer: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  barTrack: {
    width:           60,
    height:          5,
    backgroundColor: C.border,
    borderRadius:    10,
    overflow:        'hidden',
  },
  barFill: {
    height:       5,
    borderRadius: 10,
  },
  barLabel: {
    fontSize:   8,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    minWidth:   28,
  },

  /* Pie de página */
  footer: {
    position:          'absolute',
    bottom:            20,
    left:              40,
    right:             40,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    borderTopWidth:    1,
    borderTopColor:    C.border,
    paddingTop:        6,
  },
  footerText: {
    fontSize: 7,
    color:    C.muted,
  },

  /* Divisor */
  divider: {
    height:          1,
    backgroundColor: C.border,
    marginVertical:  10,
  },
})

/* ─── Sub-componentes ─────────────────────────────────────────── */
function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={s.barContainer}>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.barLabel, { color }]}>{pct}%</Text>
    </View>
  )
}

function StatePill({ pct }: { pct: number }) {
  if (pct >= 85) return <View style={[s.pill, s.pillSuccess]}><Text>Óptimo</Text></View>
  if (pct >= 70) return <View style={[s.pill, s.pillWarning]}><Text>Regular</Text></View>
  return <View style={[s.pill, s.pillDanger]}><Text>En riesgo</Text></View>
}

/* ─── Tipos ───────────────────────────────────────────────────── */
export interface ReportePDFProps {
  kpis: {
    asistencia_media: number
    tardanzas_pct: number
    puntualidad_docentes: number
    sesiones_registradas: number
  }
  por_seccion: {
    aulaId: string; nombre: string; total_alumnos: number
    pct_asistencia: number; pct_tardanza: number
  }[]
  por_docente: {
    docente_id: string; nombre: string
    asistencia_pct: number; puntualidad: number; total_sesiones: number
  }[]
  tendencia_30d: { fecha: string; pct: number }[]
  /* metadata */
  periodo:        string
  cicloNombre?:   string
  desde?:         string
  hasta?:         string
  logoUrl?:       string   // logo del Centro Preuniversitario
  logoUnasamUrl?: string   // logo de la UNASAM
}

/* ─── Documento principal ─────────────────────────────────────── */
// Exportar también como createElement-compatible para poder pasarlo a pdf()
export function ReporteAsistenciaPDF({
  kpis, por_seccion, por_docente, periodo,
  cicloNombre, desde, hasta, logoUrl, logoUnasamUrl,
}: ReportePDFProps) {
  const fechaGeneracion = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const periodoDesc = desde && hasta
    ? `${desde} al ${hasta}`
    : periodo

  const kpiCards = [
    { label: 'Asistencia media',      value: `${kpis.asistencia_media}%`,      color: C.secondary },
    { label: 'Tardanzas',             value: `${kpis.tardanzas_pct}%`,          color: C.warning   },
    { label: 'Puntualidad docentes',  value: `${kpis.puntualidad_docentes}%`,   color: C.success   },
    { label: 'Sesiones registradas',  value: `${kpis.sesiones_registradas}`,    color: C.primary   },
  ]

  return (
    <Document
      title="Reporte de Asistencia — Centro Preuniversitario"
      author="Sistema de Gestión Académica"
      subject={`Reporte: ${periodo}`}
    >
      <Page size="A4" style={s.page}>

        {/* ── Encabezado ── */}
        <View style={s.header}>

          {/* Logo UNASAM */}
          {logoUnasamUrl ? (
            <Image src={logoUnasamUrl} style={s.logo} />
          ) : (
            <View style={[s.logoPlaceholder, { backgroundColor: '#7B1D1D' }]}>
              <Text style={s.logoText}>UNASAM</Text>
            </View>
          )}

          {/* Separador vertical */}
          <View style={{
            width: 1, height: 44, backgroundColor: C.border,
            marginHorizontal: 10, alignSelf: 'center',
          }} />

          {/* Logo Centro Preuniversitario */}
          {logoUrl ? (
            <Image src={logoUrl} style={s.logo} />
          ) : (
            <View style={s.logoPlaceholder}>
              <Text style={s.logoText}>CPre</Text>
            </View>
          )}

          {/* Nombre institución */}
          <View style={[s.headerCenter, { marginLeft: 10 }]}>
            <Text style={s.headerInst}>Centro Preuniversitario</Text>
            <Text style={s.headerSub}>Universidad Nacional de San Martín</Text>
            <Text style={[s.headerSub, { marginTop: 1 }]}>Sistema de Gestión Académica</Text>
            {cicloNombre && (
              <Text style={[s.headerSub, { marginTop: 1 }]}>Ciclo: {cicloNombre}</Text>
            )}
          </View>

          {/* Fecha y tipo */}
          <View style={s.headerRight}>
            <Text style={s.headerDate}>Generado: {fechaGeneracion}</Text>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>REPORTE GENERADO POR EL SISTEMA</Text>
            </View>
          </View>
        </View>

        {/* ── Título ── */}
        <Text style={s.reportTitle}>Reporte de Asistencia General</Text>
        <Text style={s.reportMeta}>Período: {periodoDesc}</Text>

        {/* ── KPIs ── */}
        <View style={s.kpiGrid}>
          {kpiCards.map((k) => (
            <View key={k.label} style={[s.kpiCard, { borderLeftColor: k.color }]}>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Tabla por sección ── */}
        {por_seccion.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Asistencia por Sección</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Sección</Text>
              <Text style={[s.tableHeadCell, { flex: 1 }]}>Alumnos</Text>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>% Asistencia</Text>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>% Tardanza</Text>
              <Text style={[s.tableHeadCell, { flex: 1.5 }]}>Estado</Text>
            </View>
            {por_seccion.map((sec, i) => (
              <View key={sec.aulaId} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, { flex: 2, fontWeight: 'bold' }]}>{sec.nombre}</Text>
                <Text style={[s.tableCell, s.tableCellMono, { flex: 1 }]}>{sec.total_alumnos}</Text>
                <View style={[s.tableCell, { flex: 2 }]}>
                  <PctBar
                    pct={sec.pct_asistencia}
                    color={sec.pct_asistencia >= 85 ? C.success : sec.pct_asistencia >= 70 ? C.warning : C.danger}
                  />
                </View>
                <View style={[s.tableCell, { flex: 2 }]}>
                  <PctBar pct={sec.pct_tardanza} color={C.warning} />
                </View>
                <View style={[s.tableCell, { flex: 1.5 }]}>
                  <StatePill pct={sec.pct_asistencia} />
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Tabla por docente ── */}
        {por_docente.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Puntualidad de Docentes</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Docente</Text>
              <Text style={[s.tableHeadCell, { flex: 1 }]}>Sesiones</Text>
              <Text style={[s.tableHeadCell, { flex: 2.5 }]}>Puntualidad</Text>
              <Text style={[s.tableHeadCell, { flex: 1.5 }]}>Estado</Text>
            </View>
            {[...por_docente]
              .sort((a, b) => b.puntualidad - a.puntualidad)
              .map((doc, i) => (
                <View key={doc.docente_id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                  <Text style={[s.tableCell, { flex: 3 }]}>{doc.nombre}</Text>
                  <Text style={[s.tableCell, s.tableCellMono, { flex: 1 }]}>{doc.total_sesiones}</Text>
                  <View style={[s.tableCell, { flex: 2.5 }]}>
                    <PctBar
                      pct={doc.puntualidad}
                      color={doc.puntualidad >= 90 ? C.success : doc.puntualidad >= 75 ? C.warning : C.danger}
                    />
                  </View>
                  <View style={[s.tableCell, { flex: 1.5 }]}>
                    <StatePill pct={doc.puntualidad} />
                  </View>
                </View>
              ))}
          </>
        )}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Centro Preuniversitario · UNASAM
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
          <Text style={s.footerText}>Documento confidencial</Text>
        </View>

      </Page>
    </Document>
  )
}
