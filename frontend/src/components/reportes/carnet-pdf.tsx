/**
 * carnet-pdf.tsx
 * Carnet estudiantil en PDF.
 * Importar de forma dinámica:
 *   const { CarnetPDF } = await import('@/components/reportes/carnet-pdf')
 */

import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const C = {
  primary:   '#1e3a5f',
  secondary: '#4a6fa5',
  success:   '#166534',
  successBg: '#dcfce7',
  warning:   '#92400e',
  warningBg: '#fef3c7',
  danger:    '#991b1b',
  dangerBg:  '#fee2e2',
  text:      '#111827',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  bg:        '#f9fafb',
  white:     '#ffffff',
}

const s = StyleSheet.create({
  page: {
    fontFamily:        'Helvetica',
    fontSize:          10,
    color:             C.text,
    paddingTop:        36,
    paddingHorizontal: 40,
    paddingBottom:     48,
    backgroundColor:   C.bg,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    marginBottom:      24,
    paddingBottom:     12,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logo:          { width: 44, height: 44, marginRight: 12, borderRadius: 4 },
  logoPlaceholder: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 4,
  },
  logoText:      { color: C.white, fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  headerCenter:  { flex: 1, marginLeft: 10 },
  headerInst:    { fontSize: 15, fontWeight: 'bold', color: C.primary },
  headerSub:     { fontSize: 8, color: C.muted, marginTop: 2 },
  headerRight:   { alignItems: 'flex-end' },
  headerDate:    { fontSize: 8, color: C.muted },
  headerBadge:   { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.secondary, borderRadius: 10 },
  headerBadgeText: { fontSize: 7, color: C.white, fontWeight: 'bold' },

  /* Card carnet */
  carnetCard: {
    borderRadius:    8,
    overflow:        'hidden',
    border:          `1px solid ${C.border}`,
    width:           340,
    alignSelf:       'center',
    marginTop:       12,
  },
  carnetHeader: {
    backgroundColor: C.primary,
    padding:         20,
    flexDirection:   'row',
    gap:             16,
    alignItems:      'center',
  },
  avatar: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: C.secondary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  avatarText:    { color: C.white, fontSize: 22, fontWeight: 'bold' },
  carnetName:    { color: C.white, fontSize: 14, fontWeight: 'bold', marginBottom: 3 },
  carnetSubtext: { color: 'rgba(255,255,255,0.75)', fontSize: 8 },
  carnetBody:    { backgroundColor: C.white, padding: 16 },
  fieldRow:      { flexDirection: 'row', marginBottom: 10 },
  fieldBlock:    { flex: 1 },
  fieldLabel:    { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  fieldValue:    { fontSize: 11, fontWeight: 'bold', color: C.text },
  fieldMono:     { fontFamily: 'Courier', fontSize: 13, fontWeight: 'bold', color: C.primary },
  divider:       { height: 1, backgroundColor: C.border, marginVertical: 10 },

  /* Barcode area */
  barcodeArea: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  barcodeLine:  { width: '100%', height: 48, backgroundColor: C.bg, borderRadius: 4 },
  barcodeText:  { fontFamily: 'Courier', fontSize: 14, fontWeight: 'bold', letterSpacing: 2, color: C.primary },
  barcodeLabel: { fontSize: 7, color: C.muted },

  /* State pill */
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pillSuccess: { backgroundColor: C.successBg },
  pillWarning: { backgroundColor: C.warningBg },
  pillDanger:  { backgroundColor: C.dangerBg  },
  pillText:    { fontSize: 8, fontWeight: 'bold' },

  /* Footer */
  footer: {
    position: 'absolute', bottom: 20, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.muted },

  /* Notice */
  notice: {
    marginTop: 20, padding: 12,
    backgroundColor: C.white,
    borderRadius: 6, borderWidth: 1, borderColor: C.border,
    width: 340, alignSelf: 'center',
  },
  noticeText: { fontSize: 7, color: C.muted, lineHeight: 1.5, textAlign: 'center' },
})

/* ─── Types ───────────────────────────────────────────────────── */
export interface CarnetPDFProps {
  alumno: {
    nombres?:   string | null
    nombre?:    string | null
    apellidos?: string | null
    dni?:       string | null
    codigo_barra?: string | null
    codigoBarras?: string | null
    estado?:    string | null
    asistencia_pct?: number | null
    aula?:      { nombre: string } | null
    ciclo?:     { nombre: string } | null
    carrera?:   { nombre: string } | null
  }
  cicloLabel?: string   // e.g. "2026-I"
  logoUrl?:       string
  logoUnasamUrl?: string
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function initials(n: string) {
  return n.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function estadoPill(pct?: number | null, estado?: string | null) {
  const label = estado ?? (pct == null ? 'Activo' : pct >= 90 ? 'Activo' : pct >= 75 ? 'Observado' : 'En riesgo')
  const style = pct == null || pct >= 90 ? s.pillSuccess : pct >= 75 ? s.pillWarning : s.pillDanger
  const color = pct == null || pct >= 90 ? C.success : pct >= 75 ? C.warning : C.danger
  return { label, style, color }
}

/* ─── Documento ───────────────────────────────────────────────── */
export function CarnetPDF({ alumno, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetPDFProps) {
  const nombre    = alumno.nombres ?? alumno.nombre ?? ''
  const apellidos = alumno.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  const codigo    = alumno.codigo_barra ?? alumno.codigoBarras ?? '——'
  const dni       = alumno.dni ?? '——'
  const aula      = alumno.aula?.nombre ?? '—'
  const carrera   = alumno.carrera?.nombre ?? '—'
  const pct       = alumno.asistencia_pct
  const { label: estadoLabel, style: estadoStyle, color: estadoColor } = estadoPill(pct, alumno.estado)
  const fechaGen  = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document
      title={`Carnet — ${fullName}`}
      author="Sistema de Gestión Académica"
      subject="Carnet estudiantil"
    >
      <Page size="A4" style={s.page}>

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
            <View style={[s.logoPlaceholder, { backgroundColor: C.primary }]}>
              <Text style={s.logoText}>{'CPre'}</Text>
            </View>
          )}
          <View style={s.headerCenter}>
            <Text style={s.headerInst}>Centro Preuniversitario</Text>
            <Text style={s.headerSub}>Universidad Nacional de San Martín</Text>
            <Text style={[s.headerSub, { marginTop: 1 }]}>Sistema de Gestión Académica</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>Emitido: {fechaGen}</Text>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>CARNET OFICIAL</Text>
            </View>
          </View>
        </View>

        {/* ── Tarjeta carnet ── */}
        <View style={s.carnetCard}>

          {/* Cabecera azul */}
          <View style={s.carnetHeader}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials(fullName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.carnetSubtext, { marginBottom: 4 }]}>
                Centro Preuniversitario · Ciclo {cicloLabel}
              </Text>
              <Text style={s.carnetName}>{apellidos}, {nombre}</Text>
              <Text style={s.carnetSubtext}>Código: {codigo} · DNI: {dni}</Text>
            </View>
          </View>

          {/* Cuerpo blanco */}
          <View style={s.carnetBody}>
            <View style={s.fieldRow}>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Código de barras</Text>
                <Text style={s.fieldMono}>{codigo}</Text>
              </View>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>DNI</Text>
                <Text style={[s.fieldValue, { fontFamily: 'Courier' }]}>{dni}</Text>
              </View>
            </View>

            <View style={[s.divider]} />

            <View style={s.fieldRow}>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Aula / Sección</Text>
                <Text style={s.fieldValue}>{aula}</Text>
              </View>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Ciclo</Text>
                <Text style={s.fieldValue}>{cicloLabel}</Text>
              </View>
            </View>

            <View style={s.fieldRow}>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Carrera</Text>
                <Text style={s.fieldValue}>{carrera}</Text>
              </View>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Estado</Text>
                <View style={[s.pill, estadoStyle, { alignSelf: 'flex-start', marginTop: 2 }]}>
                  <Text style={[s.pillText, { color: estadoColor }]}>{estadoLabel}</Text>
                </View>
              </View>
            </View>

            {pct != null && (
              <>
                <View style={s.divider} />
                <View style={s.fieldRow}>
                  <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>Asistencia del ciclo</Text>
                    <Text style={[s.fieldValue, { color: pct >= 90 ? C.success : pct >= 75 ? C.warning : C.danger }]}>
                      {pct}%
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Código de barras (visual) */}
          <View style={s.barcodeArea}>
            <Text style={s.barcodeText}>{codigo}</Text>
            <View style={{
              flexDirection: 'row', gap: 2, width: 200, height: 42,
              alignItems: 'flex-end', justifyContent: 'center',
            }}>
              {codigo.split('').map((c, i) => {
                const h = 20 + ((c.charCodeAt(0) * 13 + i * 7) % 22)
                return (
                  <View key={i} style={{
                    width: i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 3,
                    height: h,
                    backgroundColor: C.text,
                  }} />
                )
              })}
            </View>
            <Text style={s.barcodeLabel}>Presentar este código en el ingreso al Centro Preuniversitario</Text>
          </View>
        </View>

        {/* ── Aviso legal ── */}
        <View style={s.notice}>
          <Text style={s.noticeText}>
            Este documento es de carácter oficial y de uso personal e intransferible.{'\n'}
            Cualquier alteración invalida este documento. Centro Preuniversitario — UNASAM · Ciclo {cicloLabel}
          </Text>
        </View>

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
