/**
 * carnet-pdf.tsx
 * Carnet estudiantil — tamaño físico 9.3 cm × 5.6 cm (landscape).
 *
 * 1 cm = 28.3465 pt  →  9.3 cm = 263.62 pt  |  5.6 cm = 158.74 pt
 *
 * Importar SIEMPRE de forma dinámica:
 *   const { CarnetPDF }      = await import('@/components/reportes/carnet-pdf')
 *   const { CarnetBatchPDF } = await import('@/components/reportes/carnet-pdf')
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

/* ─── Dimensiones en puntos (pt) ─────────────────────────────── */
const CARD_W = 263.62   // 9.3 cm × 28.3465 pt/cm
const CARD_H = 158.74   // 5.6 cm × 28.3465 pt/cm

/* ─── Hoja A4 apaisada — 3 × 3 = 9 carnets por página ────────── */
const SHEET_COLS     = 3
const SHEET_ROWS     = 3
const A4_LAND_W      = 841.89   // A4 landscape ancho (pt)
const A4_LAND_H      = 595.28   // A4 landscape alto  (pt)
// Los 9 carnets encajan EXACTAMENTE: 3 × 263.62 = 790.86 pt < 841.89 pt
//                                    3 × 158.74 = 476.22 pt < 595.28 pt
const SHEET_H_MARGIN = (A4_LAND_W - SHEET_COLS * CARD_W) / 2   // ≈ 25.5 pt ≈ 0.9 cm
const SHEET_V_MARGIN = (A4_LAND_H - SHEET_ROWS * CARD_H) / 2   // ≈ 59.5 pt ≈ 2.1 cm

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
  text:      '#111827',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  barcodeBg: '#f0f4f8',
  white:     '#ffffff',
}

/* ─── Estilos ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    backgroundColor: C.white,
    flexDirection:   'column',
  },

  /* ── Cabecera azul (26 pt) ── */
  header: {
    backgroundColor:  C.primary,
    height:           26,
    paddingHorizontal: 10,
    paddingVertical:  5,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
  },
  headerInst: { color: C.white, fontSize: 7, fontWeight: 'bold' },
  headerSub:  { color: 'rgba(255,255,255,0.72)', fontSize: 5.5, marginTop: 1.5 },
  headerBadge: {
    backgroundColor:  'rgba(255,255,255,0.15)',
    borderRadius:     8,
    paddingHorizontal: 6,
    paddingVertical:  3,
  },
  headerBadgeText: {
    color:       C.white,
    fontSize:    6,
    fontWeight:  'bold',
    letterSpacing: 0.5,
  },

  /* ── Cuerpo (flex 1, ≈ 92 pt) ── */
  body: {
    flex:             1,
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 10,
    paddingVertical:  8,
    gap:              8,
  },

  /* Avatar circular */
  avatar: {
    width:            46,
    height:           46,
    borderRadius:     23,
    backgroundColor:  C.secondary,
    alignItems:       'center',
    justifyContent:   'center',
    flexShrink:       0,
  },
  avatarText: { color: C.white, fontSize: 15, fontWeight: 'bold' },

  /* Divisor vertical */
  vline: {
    width:            1,
    alignSelf:        'stretch',
    backgroundColor:  C.border,
    marginHorizontal: 2,
    flexShrink:       0,
  },

  /* Bloque de datos */
  info: { flex: 1, justifyContent: 'center' },

  name:       { fontSize: 9,   fontWeight: 'bold', color: C.primary,  marginBottom: 2.5 },
  codeDni:    { fontSize: 7,   fontFamily: 'Courier', color: C.text,   marginBottom: 2 },
  aulaLine:   { fontSize: 6.5, color: C.text,                          marginBottom: 1.5 },
  carreraLine:{ fontSize: 6.5, color: C.muted,                         marginBottom: 3 },

  /* Pill estado */
  pillRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pill:       { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 8, alignSelf: 'flex-start' },
  pillText:   { fontSize: 6, fontWeight: 'bold' },
  pillSuccess:{ backgroundColor: C.successBg },
  pillWarning:{ backgroundColor: C.warningBg },
  pillDanger: { backgroundColor: C.dangerBg  },

  /* ── Franja código de barras (40 pt) ── */
  barcodeStrip: {
    backgroundColor: C.barcodeBg,
    borderTopWidth:  1,
    borderTopColor:  C.border,
    height:          40,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 3,
  },
  barcodeCode: {
    fontFamily:   'Courier',
    fontSize:     9,
    fontWeight:   'bold',
    color:        C.primary,
    letterSpacing: 2,
    marginBottom:  2,
  },
  barcodeVisual: {
    flexDirection: 'row',
    gap:           1.5,
    height:        12,
    alignItems:    'flex-end',
    marginBottom:  2,
  },
  barcodeLabel: { fontSize: 5.5, color: C.muted },
})

/* ─── Helpers ─────────────────────────────────────────────────── */
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function estadoPill(pct?: number | null, estado?: string | null) {
  const label = estado ?? (pct == null ? 'Activo' : pct >= 90 ? 'Activo' : pct >= 75 ? 'Observado' : 'En riesgo')
  const style = (pct == null || pct >= 90) ? s.pillSuccess : pct >= 75 ? s.pillWarning : s.pillDanger
  const color = (pct == null || pct >= 90) ? C.success     : pct >= 75 ? C.warning     : C.danger
  return { label, style, color }
}

/* ─── Tipos ───────────────────────────────────────────────────── */
export interface AlumnoCarnet {
  nombres?:        string | null
  nombre?:         string | null
  apellidos?:      string | null
  dni?:            string | null
  codigo_barra?:   string | null
  codigoBarras?:   string | null
  estado?:         string | null
  asistencia_pct?: number | null
  aula?:           { nombre: string; ciclo?: { nombre: string } | null } | null
  carrera?:        { nombre: string } | null
}

export interface CarnetPDFProps {
  alumno:          AlumnoCarnet
  cicloLabel?:     string
  logoUrl?:        string      // mantenido por compatibilidad (no se usa a este tamaño)
  logoUnasamUrl?:  string
}

export interface CarnetBatchPDFProps {
  alumnos:         AlumnoCarnet[]
  cicloLabel?:     string
  logoUrl?:        string
  logoUnasamUrl?:  string
}

/* ─── Contenido del carnet (sin Page — reutilizable en hoja A4) ── */
function CarnetCardContent({ alumno, cicloLabel }: { alumno: AlumnoCarnet; cicloLabel: string }) {
  const nombre    = alumno.nombres ?? alumno.nombre ?? ''
  const apellidos = alumno.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  const codigo    = alumno.codigo_barra ?? alumno.codigoBarras ?? '——'
  const ciclo     = alumno.aula?.ciclo?.nombre ?? cicloLabel
  const pct       = alumno.asistencia_pct
  const { label: estadoLabel, style: estadoStyle, color: estadoColor } = estadoPill(pct, alumno.estado)

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: C.white }}>

      {/* ── Cabecera ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerInst}>Centro Preuniversitario · UNASAM</Text>
          <Text style={s.headerSub}>Sistema de Gestión Académica · Ciclo {ciclo}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>CARNET OFICIAL</Text>
        </View>
      </View>

      {/* ── Cuerpo ── */}
      <View style={s.body}>

        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(fullName)}</Text>
        </View>

        {/* Divisor vertical */}
        <View style={s.vline} />

        {/* Datos del alumno */}
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>
            {apellidos ? `${apellidos}, ${nombre}` : nombre}
          </Text>

          <Text style={s.codeDni}>
            Cód: {codigo}{alumno.dni ? `   DNI: ${alumno.dni}` : ''}
          </Text>

          {alumno.aula && (
            <Text style={s.aulaLine} numberOfLines={1}>
              Aula: {alumno.aula.nombre}{ciclo ? `  ·  Ciclo: ${ciclo}` : ''}
            </Text>
          )}

          {alumno.carrera && (
            <Text style={s.carreraLine} numberOfLines={1}>
              {alumno.carrera.nombre}
            </Text>
          )}

          <View style={s.pillRow}>
            <View style={[s.pill, estadoStyle]}>
              <Text style={[s.pillText, { color: estadoColor }]}>{estadoLabel}</Text>
            </View>
            {pct != null && (
              <Text style={{ fontSize: 6.5, color: estadoColor, fontWeight: 'bold' }}>
                {pct}% asistencia
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Código de barras ── */}
      <View style={s.barcodeStrip}>
        <Text style={s.barcodeCode}>{codigo}</Text>
        <View style={s.barcodeVisual}>
          {codigo.split('').map((ch, i) => {
            const h = 5 + ((ch.charCodeAt(0) * 13 + i * 7) % 7)
            return (
              <View key={i} style={{
                width:           i % 3 === 0 ? 2.5 : i % 2 === 0 ? 1.5 : 2,
                height:          h,
                backgroundColor: C.text,
              }} />
            )
          })}
        </View>
        <Text style={s.barcodeLabel}>Presentar en el ingreso al Centro Preuniversitario</Text>
      </View>

    </View>
  )
}

/* ─── Componente interno: una página-carnet (9.3 × 5.6 cm) ───── */
function CarnetPage({ alumno, cicloLabel }: { alumno: AlumnoCarnet; cicloLabel: string }) {
  return (
    <Page size={[CARD_W, CARD_H]} style={s.page}>
      <CarnetCardContent alumno={alumno} cicloLabel={cicloLabel} />
    </Page>
  )
}

/* ─── Exportaciones públicas ──────────────────────────────────── */

/** Carnet de un solo alumno (9.3 cm × 5.6 cm). */
export function CarnetPDF({ alumno, cicloLabel = '2026-I' }: CarnetPDFProps) {
  const nombre    = alumno.nombres ?? alumno.nombre ?? ''
  const apellidos = alumno.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  return (
    <Document
      title={`Carnet — ${fullName}`}
      author="Sistema de Gestión Académica"
      subject="Carnet estudiantil"
    >
      <CarnetPage alumno={alumno} cicloLabel={cicloLabel} />
    </Document>
  )
}

/**
 * Carnets de múltiples alumnos — una página por alumno (tamaño tarjetón).
 * Ideal para imprimir en lote y cortar individualmente.
 */
export function CarnetBatchPDF({ alumnos, cicloLabel = '2026-I' }: CarnetBatchPDFProps) {
  return (
    <Document
      title={`Carnets estudiantiles — ${alumnos.length} alumno${alumnos.length !== 1 ? 's' : ''}`}
      author="Sistema de Gestión Académica"
      subject="Carnets estudiantiles"
    >
      {alumnos.map((alumno, i) => (
        <CarnetPage key={i} alumno={alumno} cicloLabel={cicloLabel} />
      ))}
    </Document>
  )
}

/* ─── Exportaciones adicionales ───────────────────────────────── */

export interface CarnetSheetPDFProps {
  alumnos:     AlumnoCarnet[]
  cicloLabel?: string
}

/**
 * Hoja A4 apaisada con 9 carnets por página (3 columnas × 3 filas).
 *
 * Disposición exacta:
 *   - Margen lateral ≈ 0.9 cm · Margen vertical ≈ 2.1 cm
 *   - Guías de corte entre filas y columnas
 *   - Borde exterior de la zona de carnets
 *
 * Ideal para imprimir el ciclo completo y guillotinar en tarjetón.
 */
export function CarnetSheetPDF({ alumnos, cicloLabel = '2026-I' }: CarnetSheetPDFProps) {
  const PER_SHEET = SHEET_COLS * SHEET_ROWS   // 9

  /* Agrupar alumnos en páginas de 9 */
  const pages: AlumnoCarnet[][] = []
  for (let i = 0; i < alumnos.length; i += PER_SHEET) {
    pages.push(alumnos.slice(i, i + PER_SHEET))
  }

  return (
    <Document
      title={`Carnets hoja A4 — ${alumnos.length} alumnos`}
      author="Sistema de Gestión Académica"
      subject="Carnets estudiantiles — hoja A4"
    >
      {pages.map((grupo, pi) => (
        <Page key={pi} size="A4" orientation="landscape"
          style={{ fontFamily: 'Helvetica', backgroundColor: C.white, position: 'relative' }}>

          {/* ── 9 carnets posicionados con absolute layout ── */}
          {grupo.map((alumno, ci) => {
            const col = ci % SHEET_COLS
            const row = Math.floor(ci / SHEET_COLS)
            return (
              <View key={ci} style={{
                position: 'absolute',
                left:     SHEET_H_MARGIN + col * CARD_W,
                top:      SHEET_V_MARGIN + row * CARD_H,
                width:    CARD_W,
                height:   CARD_H,
                overflow: 'hidden',
              }}>
                <CarnetCardContent alumno={alumno} cicloLabel={cicloLabel} />
              </View>
            )
          })}

          {/* ── Guías de corte horizontales (entre filas) ── */}
          {Array.from({ length: SHEET_ROWS - 1 }, (_, r) => (
            <View key={`gh${r}`} style={{
              position:        'absolute',
              left:            SHEET_H_MARGIN - 10,
              top:             SHEET_V_MARGIN + (r + 1) * CARD_H - 0.25,
              width:           SHEET_COLS * CARD_W + 20,
              height:          0.5,
              backgroundColor: '#9ca3af',
            }} />
          ))}

          {/* ── Guías de corte verticales (entre columnas) ── */}
          {Array.from({ length: SHEET_COLS - 1 }, (_, c) => (
            <View key={`gv${c}`} style={{
              position:        'absolute',
              left:            SHEET_H_MARGIN + (c + 1) * CARD_W - 0.25,
              top:             SHEET_V_MARGIN - 10,
              width:           0.5,
              height:          SHEET_ROWS * CARD_H + 20,
              backgroundColor: '#9ca3af',
            }} />
          ))}

          {/* ── Borde exterior de la zona de impresión ── */}
          <View style={{
            position:    'absolute',
            left:        SHEET_H_MARGIN,
            top:         SHEET_V_MARGIN,
            width:       SHEET_COLS * CARD_W,
            height:      SHEET_ROWS * CARD_H,
            borderWidth: 0.5,
            borderColor: '#6b7280',
          }} />

          {/* ── Pie de página ── */}
          <View style={{ position: 'absolute', bottom: 6, right: SHEET_H_MARGIN }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 6, color: '#9ca3af' }}>
              Hoja {pi + 1}/{pages.length} · carnets {pi * PER_SHEET + 1}–{pi * PER_SHEET + grupo.length} de {alumnos.length}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
