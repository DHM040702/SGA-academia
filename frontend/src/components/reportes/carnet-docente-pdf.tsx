/**
 * carnet-docente-pdf.tsx
 * Carnet de DOCENTE — tamaño físico 9.3 cm × 5.6 cm (landscape).
 *
 * El código de barras del carnet es el DNI del docente (el kiosco marca
 * asistencia de docentes por DNI). Diseño DISTINTO al carnet de alumno para
 * diferenciarlos: esquema teal + bronce (vs. azul + dorado), foto a la
 * derecha y código de barras HORIZONTAL en una franja inferior (vs. la
 * columna vertical del alumno). Campos: especialidad + cursos, DNI como código.
 *
 * Importar SIEMPRE de forma dinámica:
 *   const { CarnetDocentePDF }      = await import('@/components/reportes/carnet-docente-pdf')
 *   const { CarnetDocenteBatchPDF } = await import('@/components/reportes/carnet-docente-pdf')
 *   const { CarnetDocenteSheetPDF } = await import('@/components/reportes/carnet-docente-pdf')
 */

import { Document, Page, Text, View, StyleSheet, Image, Svg, Rect, Path, Circle } from '@react-pdf/renderer'

/* ─── Dimensiones en puntos (pt) ─────────────────────────────── */
const CARD_W     = 263.62   // 9.3 cm × 28.3465 pt/cm
const CARD_H     = 158.74   // 5.6 cm × 28.3465 pt/cm
const HEADER_H   = 33       // cabecera (aloja los logos)
const BARCODE_H  = 34       // franja inferior del código de barras horizontal
const BAR_AREA_W = 150      // ancho de las barras horizontales (pt)
const BAR_HEIGHT = 20       // alto de las barras (pt)

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

/* ─── Paleta (CLARA — mínima tinta; teal suave, distinto al alumno) ── */
const C = {
  ink:      '#1f2937',   // texto principal
  teal:     '#2f7d78',   // acento medio (líneas, bordes, badge)
  tealDeep: '#256b66',   // títulos
  tealSoft: '#eaf3f1',   // fondos muy claros (pill, foto placeholder)
  sealLine: '#d3e4e1',   // marca de agua (líneas finas)
  muted:    '#6b7280',
  border:   '#dfe6e4',
  white:    '#ffffff',
}

/* ─── Estilos ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: C.white, flexDirection: 'column' },

  /* Marco exterior: fino filo teal sobre blanco */
  card: { flex: 1, flexDirection: 'column', backgroundColor: C.white, borderWidth: 0.75, borderColor: C.teal },

  /* ── Cabecera BLANCA con filo teal (sin fondo oscuro → poca tinta) ── */
  header: {
    height:            HEADER_H,
    backgroundColor:   C.white,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 9,
    borderBottomWidth: 1.2,
    borderBottomColor: C.teal,
  },
  headerLogo:    { width: 22, height: 22, objectFit: 'contain' as const, marginRight: 6 },
  headerLogoBox: { width: 22, height: 22, marginRight: 6, alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, justifyContent: 'center' },
  headerInst: { color: C.tealDeep, fontSize: 8, fontWeight: 'bold', letterSpacing: 0.2 },
  headerSub:  { color: C.muted, fontSize: 5.5, marginTop: 1, letterSpacing: 0.2 },
  headerBadge: {
    borderWidth:       0.8,
    borderColor:       C.teal,
    backgroundColor:   C.white,
    borderRadius:      2.5,
    paddingHorizontal: 6,
    paddingVertical:   2.5,
  },
  headerBadgeText: { color: C.teal, fontSize: 6, fontWeight: 'bold', letterSpacing: 1 },

  /* ── Cuerpo central: datos (izq) + foto (der) ── */
  body: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 10,
    paddingVertical:   7,
    gap:               8,
    position:          'relative',
  },
  watermark: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  watermarkImg: { width: 84, height: 84, objectFit: 'contain' as const, opacity: 0.16 },

  /* Bloque de datos del docente */
  info: { flex: 1, justifyContent: 'center', gap: 1.5 },
  name:       { fontSize: 10.5, fontWeight: 'bold', color: C.tealDeep },
  nameRule:   { width: 24, height: 1.4, backgroundColor: C.teal, borderRadius: 1, marginTop: 1.5, marginBottom: 1.5 },
  dniField:   { fontSize: 7.5, fontFamily: 'Courier', color: C.ink },
  espLine:    { fontSize: 7.5, color: C.ink },
  cursosLine: { fontSize: 7,   color: C.muted },
  footNote:   { fontSize: 5,   color: C.muted, marginTop: 2.5, letterSpacing: 0.3 },

  /* Pill rol (fondo muy claro + borde fino) */
  pillRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  pill:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: C.tealSoft, borderWidth: 0.6, borderColor: C.teal },
  pillText: { fontSize: 7.5, fontWeight: 'bold', color: C.tealDeep, letterSpacing: 0.5 },

  /* Foto tipo credencial (derecha) — placeholder claro */
  photoFrame: {
    width: 50, height: 62, borderRadius: 3.5, borderWidth: 1.2, borderColor: C.teal,
    backgroundColor: C.white, padding: 1.5, flexShrink: 0,
  },
  photoImg: { width: '100%', height: '100%', borderRadius: 2, objectFit: 'cover' as const },
  photoPlaceholder: {
    width: '100%', height: '100%', borderRadius: 2, backgroundColor: C.tealSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  photoInitials: { color: C.tealDeep, fontSize: 17, fontWeight: 'bold' },

  /* ── Franja inferior BLANCA: código de barras HORIZONTAL (DNI) ── */
  barcodeStrip: {
    height:            BARCODE_H,
    borderTopWidth:    1.2,
    borderTopColor:    C.teal,
    backgroundColor:   C.white,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 10,
  },
  barcodeInfo:    { justifyContent: 'center' },
  barcodeInfoLbl: { fontSize: 5.5, color: C.muted, fontWeight: 'bold', letterSpacing: 0.8 },
  barcodeInfoSub: { fontSize: 5,   color: C.muted, marginTop: 1 },
  barcodeRight:   { alignItems: 'center' },
  barcodeCode:    { fontFamily: 'Courier', fontSize: 7, color: C.tealDeep, fontWeight: 'bold', letterSpacing: 2, marginTop: 1.5 },
})

/* ─── Helpers ─────────────────────────────────────────────────── */
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

/** Emblema mini vectorial para la cabecera (fallback si no hay logo UNASAM). */
function EmblemMini() {
  return (
    <Svg width={22} height={22}>
      <Circle cx={11} cy={11} r={10} fill={C.white} stroke={C.teal} strokeWidth={1} />
      <Path d="M11 4 L17 8.5 L14.6 17 L7.4 17 L5 8.5 Z" fill="none" stroke={C.teal} strokeWidth={1} />
      <Circle cx={11} cy={11} r={2} fill={C.teal} />
    </Svg>
  )
}

/** Sello vectorial (líneas finas y claras) para la marca de agua. Poca tinta. */
function SealMark() {
  const c = 38
  return (
    <Svg width={76} height={76}>
      <Circle cx={c} cy={c} r={c - 2} fill="none" stroke={C.sealLine} strokeWidth={1.4} />
      <Circle cx={c} cy={c} r={c - 8} fill="none" stroke={C.sealLine} strokeWidth={0.6} />
      <Path d={`M ${c} ${c - 14} L ${c + 14} ${c} L ${c} ${c + 14} L ${c - 14} ${c} Z`} fill="none" stroke={C.sealLine} strokeWidth={0.9} />
      <Circle cx={c} cy={c} r={3.5} fill={C.sealLine} />
    </Svg>
  )
}

/* ─── Tipos ───────────────────────────────────────────────────── */
export interface DocenteCarnet {
  nombre?:        string | null
  nombres?:       string | null
  apellidos?:     string | null
  dni?:           string | null
  especialidad?:  string | null
  fotoUrl?:       string | null
  foto_url?:      string | null
  horarios?:      { curso?: { nombre?: string | null } | null }[] | null
}

export interface CarnetDocentePDFProps {
  docente:        DocenteCarnet
  cicloLabel?:    string
  logoUrl?:       string
  logoUnasamUrl?: string
}

export interface CarnetDocenteBatchPDFProps {
  docentes:       DocenteCarnet[]
  cicloLabel?:    string
  logoUrl?:       string
  logoUnasamUrl?: string
}

export interface CarnetDocenteSheetPDFProps {
  docentes:       DocenteCarnet[]
  cicloLabel?:    string
  logoUrl?:       string
  logoUnasamUrl?: string
}

/* ─── Contenido del carnet (reutilizable en hoja A4) ─────────── */
function CarnetCardContent({
  docente, cicloLabel, logoUrl, logoUnasamUrl,
}: {
  docente: DocenteCarnet; cicloLabel: string; logoUrl?: string; logoUnasamUrl?: string
}) {
  const nombre    = docente.nombre ?? docente.nombres ?? ''
  const apellidos = docente.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  const dni       = docente.dni ?? '——'
  const fotoUrl   = docente.fotoUrl ?? docente.foto_url ?? null

  /* Cursos únicos que dicta */
  const cursos = [...new Set(
    (docente.horarios ?? [])
      .map((h) => h.curso?.nombre ?? '')
      .filter(Boolean),
  )]

  /* ── Barcode HORIZONTAL (DNI): pre-calcular posiciones de barras ── */
  const segs = code128bSegs(dni)
  const QUIET = 6  // módulos de zona de silencio
  let xCur = QUIET
  const hbars: { x: number; w: number }[] = []
  for (const seg of segs) {
    if (seg.bar) hbars.push({ x: xCur, w: seg.w })
    xCur += seg.w
  }
  const totalMods = xCur + QUIET
  const uw = BAR_AREA_W / totalMods  // ancho por módulo (pt)

  return (
    <View style={s.card}>

      {/* ── Cabecera: logo de la academia + institución + sello «DOCENTE» ── */}
      <View style={s.header}>
        {/* Solo el logo de la academia: el de la UNASAM va de marca de agua */}
        {logoUrl
          ? <Image src={logoUrl} style={s.headerLogo} />
          : <View style={s.headerLogoBox}><EmblemMini /></View>}
        <View style={s.headerTextWrap}>
          <Text style={s.headerInst}>Centro Preuniversitario</Text>
          <Text style={s.headerSub}>UNASAM · Ciclo {cicloLabel}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>DOCENTE</Text>
        </View>
      </View>

      {/* ── Cuerpo central: datos (izq) + foto (der) ── */}
      <View style={s.body}>

        {/* Marca de agua: escudo de la UNASAM (vectorial de respaldo si no carga) */}
        <View style={s.watermark}>
          {logoUnasamUrl
            ? <Image src={logoUnasamUrl} style={s.watermarkImg} />
            : <SealMark />}
        </View>

        {/* Datos */}
        <View style={s.info}>
          <Text style={s.name}>
            {apellidos ? `${apellidos}, ${nombre}` : nombre}
          </Text>

          {/* Acento bronce bajo el nombre */}
          <View style={s.nameRule} />

          {/* DNI (= código de asistencia) */}
          <Text style={s.dniField}>DNI: {dni}</Text>

          {/* Especialidad */}
          {docente.especialidad && (
            <Text style={s.espLine}>{docente.especialidad}</Text>
          )}

          {/* Cursos que dicta */}
          {cursos.length > 0 && (
            <Text style={s.cursosLine}>{cursos.join('  ·  ')}</Text>
          )}

          {/* Rol */}
          <View style={s.pillRow}>
            <View style={s.pill}>
              <Text style={s.pillText}>DOCENTE</Text>
            </View>
          </View>

          {/* Pie institucional */}
          <Text style={s.footNote}>Personal docente · CEPRE-UNASAM</Text>
        </View>

        {/* Foto tipo credencial (derecha) */}
        <View style={s.photoFrame}>
          {fotoUrl ? (
            <Image src={fotoUrl} style={s.photoImg} />
          ) : (
            <View style={s.photoPlaceholder}>
              <Text style={s.photoInitials}>{initials(fullName)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Franja inferior: código de barras HORIZONTAL (DNI) ── */}
      <View style={s.barcodeStrip}>
        <View style={s.barcodeInfo}>
          <Text style={s.barcodeInfoLbl}>CÓDIGO DE ASISTENCIA</Text>
          <Text style={s.barcodeInfoSub}>Escanee el DNI del docente</Text>
        </View>
        <View style={s.barcodeRight}>
          <Svg width={BAR_AREA_W} height={BAR_HEIGHT}>
            <Rect x={0} y={0} width={BAR_AREA_W} height={BAR_HEIGHT} fill={C.white} />
            {hbars.map(({ x, w }, i) => (
              <Rect key={i} x={x * uw} y={0} width={w * uw} height={BAR_HEIGHT} fill={C.ink} />
            ))}
          </Svg>
          <Text style={s.barcodeCode}>{dni}</Text>
        </View>
      </View>
    </View>
  )
}

/* ─── Página individual de carnet ────────────────────────────── */
function CarnetPage({
  docente, cicloLabel, logoUrl, logoUnasamUrl,
}: {
  docente: DocenteCarnet; cicloLabel: string; logoUrl?: string; logoUnasamUrl?: string
}) {
  return (
    <Page size={[CARD_W, CARD_H]} style={s.page}>
      <CarnetCardContent docente={docente} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
    </Page>
  )
}

/* ─── Exportaciones públicas ──────────────────────────────────── */

/** Carnet de un solo docente (9.3 cm × 5.6 cm). */
export function CarnetDocentePDF({ docente, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetDocentePDFProps) {
  const nombre    = docente.nombre ?? docente.nombres ?? ''
  const apellidos = docente.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  return (
    <Document
      title={`Carnet docente — ${fullName}`}
      author="Sistema de Gestión Académica"
      subject="Carnet de docente"
    >
      <CarnetPage docente={docente} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
    </Document>
  )
}

/**
 * Carnets de múltiples docentes — una página por docente.
 * Ideal para imprimir en lote y cortar individualmente.
 */
export function CarnetDocenteBatchPDF({ docentes, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetDocenteBatchPDFProps) {
  return (
    <Document
      title={`Carnets docentes — ${docentes.length} docente${docentes.length !== 1 ? 's' : ''}`}
      author="Sistema de Gestión Académica"
      subject="Carnets de docentes"
    >
      {docentes.map((docente, i) => (
        <CarnetPage key={i} docente={docente} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
      ))}
    </Document>
  )
}

/**
 * Hoja A4 vertical con 10 carnets por página (2 columnas × 5 filas),
 * guías de corte incluidas.
 */
export function CarnetDocenteSheetPDF({ docentes, cicloLabel = '2026-I', logoUrl, logoUnasamUrl }: CarnetDocenteSheetPDFProps) {
  const PER_SHEET = SHEET_COLS * SHEET_ROWS

  const pages: DocenteCarnet[][] = []
  for (let i = 0; i < docentes.length; i += PER_SHEET) {
    pages.push(docentes.slice(i, i + PER_SHEET))
  }

  return (
    <Document
      title={`Carnets docentes hoja A4 — ${docentes.length} docentes`}
      author="Sistema de Gestión Académica"
      subject="Carnets de docentes — hoja A4"
    >
      {pages.map((grupo, pi) => (
        <Page key={pi} size="A4" orientation="portrait"
          style={{ fontFamily: 'Helvetica', backgroundColor: C.white, position: 'relative' }}>

          {grupo.map((docente, ci) => {
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
                <CarnetCardContent docente={docente} cicloLabel={cicloLabel} logoUrl={logoUrl} logoUnasamUrl={logoUnasamUrl} />
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
              Hoja {pi + 1}/{pages.length} · carnets {pi * PER_SHEET + 1}–{pi * PER_SHEET + grupo.length} de {docentes.length}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
