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

import { Document, Page, Text, View, StyleSheet, Image, Svg, G, Rect, Path, Circle } from '@react-pdf/renderer'

/* ─── Dimensiones en puntos (pt) ─────────────────────────────── */
const CARD_W        = 263.62   // 9.3 cm × 28.3465 pt/cm
const CARD_H        = 158.74   // 5.6 cm × 28.3465 pt/cm
const HEADER_H      = 33       // cabecera (aloja el logo institucional)
const BARCODE_COL_W = 50       // columna derecha (código de barras vertical)
const BARCODE_BAR_W = 40       // ancho visual de la barra dentro del SVG
const BARCODE_SVG_H = 94       // alto del SVG (≈ alto del cuerpo menos etiquetas)

/* ─── Hoja A4 vertical — 2 × 5 = 10 carnets por página ────────── */
const SHEET_COLS     = 2
const SHEET_ROWS     = 5
const A4_PORT_W      = 595.28
const A4_PORT_H      = 841.89
const SHEET_H_MARGIN = (A4_PORT_W - SHEET_COLS * CARD_W) / 2
const SHEET_V_MARGIN = (A4_PORT_H - SHEET_ROWS * CARD_H) / 2

/* ─── Code128B ────────────────────────────────────────────────── */
// 106 patrones (índice = valor Code128). Cada cadena = 11 módulos binarios.
// (1 = barra negra, 0 = espacio blanco). Índices 103–105 = START A/B/C.
const C128B_PATS: string[] = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110',
  '11010000100', // 103 START A
  '11010010000', // 104 START B
  '11010011100', // 105 START C
]
const C128B_STOP = '1100011101011' // 13 módulos

interface BarSeg { w: number; bar: boolean }

function code128bSegs(text: string): BarSeg[] {
  const clean = (text || '').replace(/[^\x20-\x7E]/g, '?').slice(0, 24)
  const vals = [104] // START B
  for (const ch of clean) vals.push(ch.charCodeAt(0) - 32)
  let check = 104
  for (let i = 1; i < vals.length; i++) check += i * vals[i]
  vals.push(check % 103)
  let bits = ''
  for (const v of vals) bits += C128B_PATS[v] ?? ''
  bits += C128B_STOP
  const segs: BarSeg[] = []
  let i = 0
  while (i < bits.length) {
    let j = i
    while (j < bits.length && bits[j] === bits[i]) j++
    segs.push({ w: j - i, bar: bits[i] === '1' })
    i = j
  }
  return segs
}

/* ─── Paleta ──────────────────────────────────────────────────── */
const C = {
  primary:     '#1e3a5f',
  primaryDark: '#132639',
  secondary:   '#4a6fa5',
  gold:        '#c9a24b',   // filo/acento institucional
  goldSoft:    '#e6d3a3',
  seal:        '#c7d3e4',   // azul claro para la marca de agua vectorial
  success:     '#166534',
  successBg:   '#dcfce7',
  warning:     '#92400e',
  warningBg:   '#fef3c7',
  danger:      '#991b1b',
  dangerBg:    '#fee2e2',
  text:        '#111827',
  muted:       '#6b7280',
  border:      '#e5e7eb',
  bgSoft:      '#f6f8fb',
  white:       '#ffffff',
}

/* ─── Estilos ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    backgroundColor: C.white,
    flexDirection:   'column',
  },

  /* Marco exterior con filo dorado sutil */
  card: {
    flex:            1,
    flexDirection:   'column',
    backgroundColor: C.white,
    borderWidth:     0.75,
    borderColor:     C.gold,
  },

  /* ── Cabecera ── */
  header: {
    height:            HEADER_H,
    backgroundColor:   C.primaryDark,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 8,
    position:          'relative',
  },
  headerTexture: { position: 'absolute', top: 0, left: 0 },
  headerLogo: {
    width:      21,
    height:     21,
    objectFit:  'contain' as const,
    marginRight: 6,
  },
  headerLogoBox: {
    width:          21,
    height:         21,
    marginRight:    6,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, justifyContent: 'center' },
  headerInst: { color: C.white, fontSize: 8, fontWeight: 'bold', letterSpacing: 0.2 },
  headerSub:  { color: C.goldSoft, fontSize: 5.2, marginTop: 1, letterSpacing: 0.2 },
  headerBadge: {
    borderWidth:       0.6,
    borderColor:       'rgba(230,211,163,0.55)',
    backgroundColor:   'rgba(255,255,255,0.08)',
    borderRadius:      2.5,
    paddingHorizontal: 5,
    paddingVertical:   2.5,
  },
  headerBadgeText: {
    color:         C.goldSoft,
    fontSize:      5.5,
    fontWeight:    'bold',
    letterSpacing: 0.7,
  },

  /* ── Cuerpo (flex row, ocupa el resto del carnet) ── */
  body: {
    flex:          1,
    flexDirection: 'row',
    position:      'relative',
  },

  /* Marca de agua centrada tras la información */
  watermark: {
    position:       'absolute',
    top:            0,
    left:           0,
    right:          BARCODE_COL_W,
    bottom:         0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  watermarkImg: { width: 86, height: 86, objectFit: 'contain' as const, opacity: 0.05 },

  /* Sección izquierda: foto + datos */
  infoSection: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 9,
    paddingVertical:   7,
    gap:               8,
  },

  /* Foto tipo credencial (marco) */
  photoFrame: {
    width:           49,
    height:          60,
    borderRadius:    3.5,
    borderWidth:     1.4,
    borderColor:     C.primary,
    backgroundColor: C.white,
    padding:         1.5,
    flexShrink:      0,
  },
  photoImg:  { width: '100%', height: '100%', borderRadius: 2, objectFit: 'cover' as const },
  photoPlaceholder: {
    width:           '100%',
    height:          '100%',
    borderRadius:    2,
    backgroundColor: C.secondary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  photoInitials: { color: C.white, fontSize: 17, fontWeight: 'bold' },

  /* Divisor vertical con acento */
  vline: {
    width:            1,
    alignSelf:        'stretch',
    backgroundColor:  C.border,
    marginHorizontal: 1,
    flexShrink:       0,
  },

  /* Bloque de datos del alumno */
  info: { flex: 1, justifyContent: 'center', gap: 1.5 },

  name:        { fontSize: 10.5, fontWeight: 'bold', color: C.primaryDark },
  nameRule:    { width: 24, height: 1.6, backgroundColor: C.gold, borderRadius: 1, marginTop: 1.5, marginBottom: 1.5 },
  codeField:   { fontSize: 7.5,  fontFamily: 'Courier', color: C.text },
  dniField:    { fontSize: 7.5,  fontFamily: 'Courier', color: C.muted },
  aulaLine:    { fontSize: 7.5,  color: C.text },
  carreraLine: { fontSize: 7,    color: C.muted },
  footNote:    { fontSize: 5,    color: C.muted, marginTop: 2.5, letterSpacing: 0.3 },

  /* Pill estado */
  pillRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  pill:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  pillText:    { fontSize: 7.5, fontWeight: 'bold' },
  pillSuccess: { backgroundColor: C.successBg },
  pillWarning: { backgroundColor: C.warningBg },
  pillDanger:  { backgroundColor: C.dangerBg },

  /* ── Columna derecha: código de barras vertical ── */
  barcodeCol: {
    width:           BARCODE_COL_W,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    backgroundColor: C.bgSoft,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 4,
  },
  barcodeScanLbl: {
    fontSize:      4.6,
    color:         C.muted,
    fontWeight:    'bold',
    letterSpacing: 1.2,
    marginBottom:  2,
  },
  barcodeColCode: {
    fontFamily:    'Courier',
    fontSize:      6.5,
    color:         C.primary,
    fontWeight:    'bold',
    letterSpacing: 1,
    marginTop:     2,
    textAlign:     'center',
  },
})

/* ─── Helpers ─────────────────────────────────────────────────── */
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function estadoPill(pct?: number | null, estado?: string | null) {
  const label  = estado ?? (pct == null ? 'Activo' : pct >= 90 ? 'Activo' : pct >= 75 ? 'Observado' : 'En riesgo')
  const style  = (pct == null || pct >= 90) ? s.pillSuccess : pct >= 75 ? s.pillWarning : s.pillDanger
  const color  = (pct == null || pct >= 90) ? C.success     : pct >= 75 ? C.warning     : C.danger
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
  foto_url?:       string | null
  estado?:         string | null
  turno?:          string | null
  asistencia_pct?: number | null
  aula?:           { nombre: string; ciclo?: { nombre: string } | null } | null
  carrera?:        { nombre: string } | null
}

export interface CarnetPDFProps {
  alumno:         AlumnoCarnet
  cicloLabel?:    string
  logoUrl?:       string
  logoUnasamUrl?: string
}

export interface CarnetBatchPDFProps {
  alumnos:        AlumnoCarnet[]
  cicloLabel?:    string
  logoUrl?:       string
  logoUnasamUrl?: string
}

/* ─── Adornos vectoriales ─────────────────────────────────────── */

/** Textura sutil + filo dorado de la cabecera (sin ids → sin colisiones). */
function HeaderTexture() {
  return (
    <Svg style={s.headerTexture} width={CARD_W} height={HEADER_H}>
      <Path d={`M0 0 L44 0 L22 ${HEADER_H} L-22 ${HEADER_H} Z`} fill="rgba(255,255,255,0.05)" />
      <Path d={`M64 0 L90 0 L68 ${HEADER_H} L42 ${HEADER_H} Z`} fill="rgba(255,255,255,0.035)" />
      <Rect x={0} y={HEADER_H - 1.6} width={CARD_W} height={1.6} fill={C.gold} />
    </Svg>
  )
}

/** Emblema mini vectorial para la cabecera (fallback si no hay logo UNASAM). */
function EmblemMini() {
  return (
    <Svg width={21} height={21}>
      <Circle cx={10.5} cy={10.5} r={9.5} fill="rgba(255,255,255,0.10)" stroke={C.goldSoft} strokeWidth={1} />
      <Path d="M10.5 3.5 L16.5 8 L14 16.5 L7 16.5 L4.5 8 Z" fill="none" stroke={C.goldSoft} strokeWidth={1} />
      <Circle cx={10.5} cy={10.5} r={2} fill={C.goldSoft} />
    </Svg>
  )
}

/** Sello vectorial para la marca de agua (fallback si no hay logo CEPRE). */
function SealMark() {
  const c = 43
  return (
    <Svg width={86} height={86}>
      <Circle cx={c} cy={c} r={c - 2} fill="none" stroke={C.seal} strokeWidth={2} />
      <Circle cx={c} cy={c} r={c - 9} fill="none" stroke={C.seal} strokeWidth={0.8} />
      <Path d={`M ${c} ${c - 16} L ${c + 16} ${c} L ${c} ${c + 16} L ${c - 16} ${c} Z`} fill="none" stroke={C.seal} strokeWidth={1.4} />
      <Circle cx={c} cy={c} r={5} fill={C.seal} />
    </Svg>
  )
}

/* ─── Contenido del carnet (reutilizable en hoja A4) ─────────── */
function CarnetCardContent({
  alumno, cicloLabel, logoUrl, logoUnasamUrl,
}: {
  alumno: AlumnoCarnet; cicloLabel: string; logoUrl?: string; logoUnasamUrl?: string
}) {
  const nombre    = alumno.nombres ?? alumno.nombre ?? ''
  const apellidos = alumno.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  const codigo    = alumno.codigo_barra ?? alumno.codigoBarras ?? '——'
  const ciclo     = alumno.aula?.ciclo?.nombre ?? cicloLabel
  const { label: estadoLabel, style: estadoStyle, color: estadoColor } = estadoPill(alumno.asistencia_pct, alumno.estado)

  /* ── Barcode vertical: pre-calcular posiciones de barras ── */
  const segs = code128bSegs(codigo)
  const QUIET = 5  // módulos de zona de silencio
  let xCur = QUIET
  const bars: { x: number; w: number }[] = []
  for (const seg of segs) {
    if (seg.bar) bars.push({ x: xCur, w: seg.w })
    xCur += seg.w
  }
  const totalMods = xCur + QUIET

  // mw: pt por módulo (module width para el eje vertical del SVG)
  const mw = BARCODE_SVG_H / totalMods
  // cx: desplazamiento horizontal para centrar la barra dentro de la columna
  const cx = (BARCODE_COL_W - BARCODE_BAR_W) / 2

  // Transformación de módulo-espacio a SVG:
  // SVG_x = BARCODE_BAR_W * y + cx  (0→cx, 1→cx+BARCODE_BAR_W)
  // SVG_y = mw * x                  (módulo → pt verticales)
  // matrix(a,b,c,d,e,f): SVG_x = a*x+c*y+e, SVG_y = b*x+d*y+f
  // → a=0, b=mw, c=BARCODE_BAR_W, d=0, e=cx, f=0
  const mat = `matrix(0,${mw.toFixed(5)},${BARCODE_BAR_W},0,${cx.toFixed(2)},0)`

  /* ── Líneas de la sección izquierda ── */
  const aulaParts: string[] = []
  if (alumno.aula?.nombre) aulaParts.push(`Aula: ${alumno.aula.nombre}`)
  if (alumno.turno)         aulaParts.push(alumno.turno)
  if (ciclo)                aulaParts.push(`Ciclo: ${ciclo}`)

  return (
    <View style={s.card}>

      {/* ── Cabecera: logo + institución + sello «oficial» ── */}
      <View style={s.header}>
        <HeaderTexture />
        {logoUnasamUrl
          ? <Image src={logoUnasamUrl} style={s.headerLogo} />
          : <View style={s.headerLogoBox}><EmblemMini /></View>}
        <View style={s.headerTextWrap}>
          <Text style={s.headerInst}>Centro Preuniversitario</Text>
          <Text style={s.headerSub}>UNASAM · Ciclo {ciclo}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>CARNET OFICIAL</Text>
        </View>
      </View>

      {/* ── Cuerpo: info izquierda + barcode vertical derecha ── */}
      <View style={s.body}>

        {/* Marca de agua (escudo CEPRE) tras la información */}
        <View style={s.watermark}>
          {logoUrl
            ? <Image src={logoUrl} style={s.watermarkImg} />
            : <SealMark />}
        </View>

        {/* ─ Sección izquierda ─ */}
        <View style={s.infoSection}>

          {/* Foto tipo credencial */}
          <View style={s.photoFrame}>
            {alumno.foto_url ? (
              <Image src={alumno.foto_url} style={s.photoImg} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={s.photoInitials}>{initials(fullName)}</Text>
              </View>
            )}
          </View>

          <View style={s.vline} />

          {/* Datos */}
          <View style={s.info}>
            <Text style={s.name}>
              {apellidos ? `${apellidos}, ${nombre}` : nombre}
            </Text>

            {/* Acento dorado bajo el nombre */}
            <View style={s.nameRule} />

            {/* Código en su propia línea */}
            <Text style={s.codeField}>Cód: {codigo}</Text>

            {/* DNI en línea separada */}
            {alumno.dni && (
              <Text style={s.dniField}>DNI: {alumno.dni}</Text>
            )}

            {/* Aula · Turno · Ciclo */}
            {aulaParts.length > 0 && (
              <Text style={s.aulaLine}>
                {aulaParts.join('  ·  ')}
              </Text>
            )}

            {/* Carrera (si aplica) */}
            {alumno.carrera && (
              <Text style={s.carreraLine}>
                {alumno.carrera.nombre}
              </Text>
            )}

            {/* Estado (sin porcentaje de asistencia) */}
            <View style={s.pillRow}>
              <View style={[s.pill, estadoStyle]}>
                <Text style={[s.pillText, { color: estadoColor }]}>{estadoLabel}</Text>
              </View>
            </View>

            {/* Pie institucional */}
            <Text style={s.footNote}>Documento de identificación estudiantil</Text>
          </View>
        </View>

        {/* ─ Columna derecha: código de barras Code128B vertical ─ */}
        <View style={s.barcodeCol}>
          <Text style={s.barcodeScanLbl}>ESCANEAR</Text>

          {/* SVG con barras verticales via transformación matricial */}
          <Svg width={BARCODE_COL_W} height={BARCODE_SVG_H}>
            {/* Fondo blanco (zona de silencio incluida) */}
            <Rect x={0} y={0} width={BARCODE_COL_W} height={BARCODE_SVG_H} fill={C.white} />
            {/* Barras: coordenadas en módulos, matriz las convierte a pt verticales */}
            <G transform={mat}>
              {bars.map(({ x, w }, i) => (
                <Rect key={i} x={x} y={0} width={w} height={1} fill={C.text} />
              ))}
            </G>
          </Svg>

          {/* Número de código debajo del barcode */}
          <Text style={s.barcodeColCode}>{codigo}</Text>
        </View>

      </View>
    </View>
  )
}

/* ─── Página individual de carnet ────────────────────────────── */
function CarnetPage({
  alumno, cicloLabel, logoUrl, logoUnasamUrl,
}: {
  alumno: AlumnoCarnet; cicloLabel: string; logoUrl?: string; logoUnasamUrl?: string
}) {
  return (
    <Page size={[CARD_W, CARD_H]} style={s.page}>
      <CarnetCardContent alumno={alumno} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
    </Page>
  )
}

/* ─── Exportaciones públicas ──────────────────────────────────── */

/** Carnet de un solo alumno (9.3 cm × 5.6 cm). */
export function CarnetPDF({ alumno, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetPDFProps) {
  const nombre    = alumno.nombres ?? alumno.nombre ?? ''
  const apellidos = alumno.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  return (
    <Document
      title={`Carnet — ${fullName}`}
      author="Sistema de Gestión Académica"
      subject="Carnet estudiantil"
    >
      <CarnetPage alumno={alumno} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
    </Document>
  )
}

/**
 * Carnets de múltiples alumnos — una página por alumno.
 * Ideal para imprimir en lote y cortar individualmente.
 */
export function CarnetBatchPDF({ alumnos, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetBatchPDFProps) {
  return (
    <Document
      title={`Carnets estudiantiles — ${alumnos.length} alumno${alumnos.length !== 1 ? 's' : ''}`}
      author="Sistema de Gestión Académica"
      subject="Carnets estudiantiles"
    >
      {alumnos.map((alumno, i) => (
        <CarnetPage key={i} alumno={alumno} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
      ))}
    </Document>
  )
}

/* ─── Hoja A4 ─────────────────────────────────────────────────── */

export interface CarnetSheetPDFProps {
  alumnos:        AlumnoCarnet[]
  cicloLabel?:    string
  logoUrl?:       string
  logoUnasamUrl?: string
}

/**
 * Hoja A4 apaisada con 9 carnets por página (3 columnas × 3 filas).
 * Margen lateral ≈ 0.9 cm · Margen vertical ≈ 2.1 cm · guías de corte incluidas.
 */
export function CarnetSheetPDF({ alumnos, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetSheetPDFProps) {
  const PER_SHEET = SHEET_COLS * SHEET_ROWS

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
        <Page key={pi} size="A4" orientation="portrait"
          style={{ fontFamily: 'Helvetica', backgroundColor: C.white, position: 'relative' }}>

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
                <CarnetCardContent alumno={alumno} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
              </View>
            )
          })}

          {/* Guías de corte horizontales */}
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

          {/* Guías de corte verticales */}
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

          {/* Borde exterior de la zona de impresión */}
          <View style={{
            position:    'absolute',
            left:        SHEET_H_MARGIN,
            top:         SHEET_V_MARGIN,
            width:       SHEET_COLS * CARD_W,
            height:      SHEET_ROWS * CARD_H,
            borderWidth: 0.5,
            borderColor: '#6b7280',
          }} />

          {/* Pie de página */}
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
