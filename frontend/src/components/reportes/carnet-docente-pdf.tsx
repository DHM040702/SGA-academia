/**
 * carnet-docente-pdf.tsx
 * Carnet de DOCENTE — tamaño físico 9.3 cm × 5.6 cm (landscape).
 *
 * El código de barras del carnet es el DNI del docente (el kiosco marca
 * asistencia de docentes por DNI). Replica la estética de carnet-pdf.tsx
 * (carnet de alumno) adaptando los campos: especialidad + cursos en vez de
 * aula/carrera, y DNI como código de barras.
 *
 * Importar SIEMPRE de forma dinámica:
 *   const { CarnetDocentePDF }      = await import('@/components/reportes/carnet-docente-pdf')
 *   const { CarnetDocenteBatchPDF } = await import('@/components/reportes/carnet-docente-pdf')
 *   const { CarnetDocenteSheetPDF } = await import('@/components/reportes/carnet-docente-pdf')
 */

import { Document, Page, Text, View, StyleSheet, Image, Svg, G, Rect } from '@react-pdf/renderer'

/* ─── Dimensiones en puntos (pt) ─────────────────────────────── */
const CARD_W        = 263.62   // 9.3 cm × 28.3465 pt/cm
const CARD_H        = 158.74   // 5.6 cm × 28.3465 pt/cm
const HEADER_H      = 26
const BARCODE_COL_W = 50       // columna derecha (código de barras vertical)
const BARCODE_BAR_W = 40       // ancho visual de la barra dentro del SVG
const BARCODE_SVG_H = 112      // alto del SVG (≈ alto del cuerpo menos texto inferior)

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
  primary:   '#1e3a5f',
  secondary: '#4a6fa5',
  success:   '#166534',
  successBg: '#dcfce7',
  info:      '#1e40af',
  infoBg:    '#dbeafe',
  text:      '#111827',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  white:     '#ffffff',
}

/* ─── Estilos ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    backgroundColor: C.white,
    flexDirection:   'column',
  },

  /* ── Cabecera azul ── */
  header: {
    backgroundColor:   C.primary,
    height:            HEADER_H,
    paddingHorizontal: 10,
    paddingVertical:   5,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
  },
  headerInst: { color: C.white, fontSize: 7.5, fontWeight: 'bold' },
  headerSub:  { color: 'rgba(255,255,255,0.72)', fontSize: 5.5, marginTop: 1.5 },
  headerBadge: {
    backgroundColor:   'rgba(255,255,255,0.15)',
    borderRadius:      8,
    paddingHorizontal: 6,
    paddingVertical:   3,
  },
  headerBadgeText: {
    color:         C.white,
    fontSize:      6,
    fontWeight:    'bold',
    letterSpacing: 0.5,
  },

  /* ── Cuerpo (flex row, ocupa el resto del carnet) ── */
  body: {
    flex:          1,
    flexDirection: 'row',
  },

  /* Sección izquierda: avatar + datos */
  infoSection: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 9,
    paddingVertical:   8,
    gap:               7,
  },

  /* Avatar circular */
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: C.secondary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  avatarText: { color: C.white, fontSize: 17, fontWeight: 'bold' },
  avatarImg: {
    width:        52,
    height:       52,
    borderRadius: 26,
    objectFit:    'cover' as const,
  },

  /* Divisor vertical */
  vline: {
    width:            1,
    alignSelf:        'stretch',
    backgroundColor:  C.border,
    marginHorizontal: 2,
    flexShrink:       0,
  },

  /* Bloque de datos del docente */
  info: { flex: 1, justifyContent: 'center', gap: 2 },

  name:        { fontSize: 10.5, fontWeight: 'bold', color: C.primary },
  dniField:    { fontSize: 7.5,  fontFamily: 'Courier', color: C.text },
  espLine:     { fontSize: 7.5,  color: C.text },
  cursosLine:  { fontSize: 7,    color: C.muted },

  /* Pill rol */
  pillRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  pill:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  pillText:    { fontSize: 7.5, fontWeight: 'bold' },
  pillInfo:    { backgroundColor: C.infoBg },

  /* ── Columna derecha: código de barras vertical ── */
  barcodeCol: {
    width:           BARCODE_COL_W,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    backgroundColor: '#f9fafb',
    alignItems:      'center',
    paddingBottom:   4,
    paddingTop:      0,
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
  docente:     DocenteCarnet
  cicloLabel?: string
}

export interface CarnetDocenteBatchPDFProps {
  docentes:    DocenteCarnet[]
  cicloLabel?: string
}

export interface CarnetDocenteSheetPDFProps {
  docentes:    DocenteCarnet[]
  cicloLabel?: string
}

/* ─── Contenido del carnet (reutilizable en hoja A4) ─────────── */
function CarnetCardContent({ docente, cicloLabel }: { docente: DocenteCarnet; cicloLabel: string }) {
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

  /* ── Barcode vertical (DNI): pre-calcular posiciones de barras ── */
  const segs = code128bSegs(dni)
  const QUIET = 5  // módulos de zona de silencio
  let xCur = QUIET
  const bars: { x: number; w: number }[] = []
  for (const seg of segs) {
    if (seg.bar) bars.push({ x: xCur, w: seg.w })
    xCur += seg.w
  }
  const totalMods = xCur + QUIET

  const mw = BARCODE_SVG_H / totalMods
  const cx = (BARCODE_COL_W - BARCODE_BAR_W) / 2
  const mat = `matrix(0,${mw.toFixed(5)},${BARCODE_BAR_W},0,${cx.toFixed(2)},0)`

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: C.white }}>

      {/* ── Cabecera ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerInst}>Centro Preuniversitario · UNASAM</Text>
          <Text style={s.headerSub}>Sistema de Gestión Académica · Ciclo {cicloLabel}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>CARNET DOCENTE</Text>
        </View>
      </View>

      {/* ── Cuerpo: info izquierda + barcode vertical derecha ── */}
      <View style={s.body}>

        {/* ─ Sección izquierda ─ */}
        <View style={s.infoSection}>

          {/* Avatar */}
          {fotoUrl ? (
            <Image src={fotoUrl} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials(fullName)}</Text>
            </View>
          )}

          <View style={s.vline} />

          {/* Datos */}
          <View style={s.info}>
            <Text style={s.name}>
              {apellidos ? `${apellidos}, ${nombre}` : nombre}
            </Text>

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
              <View style={[s.pill, s.pillInfo]}>
                <Text style={[s.pillText, { color: C.info }]}>Docente</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─ Columna derecha: código de barras Code128B vertical (DNI) ─ */}
        <View style={s.barcodeCol}>
          <Svg width={BARCODE_COL_W} height={BARCODE_SVG_H}>
            <Rect x={0} y={0} width={BARCODE_COL_W} height={BARCODE_SVG_H} fill={C.white} />
            <G transform={mat}>
              {bars.map(({ x, w }, i) => (
                <Rect key={i} x={x} y={0} width={w} height={1} fill={C.text} />
              ))}
            </G>
          </Svg>

          {/* Número (DNI) debajo del barcode */}
          <Text style={s.barcodeColCode}>{dni}</Text>
        </View>

      </View>
    </View>
  )
}

/* ─── Página individual de carnet ────────────────────────────── */
function CarnetPage({ docente, cicloLabel }: { docente: DocenteCarnet; cicloLabel: string }) {
  return (
    <Page size={[CARD_W, CARD_H]} style={s.page}>
      <CarnetCardContent docente={docente} cicloLabel={cicloLabel} />
    </Page>
  )
}

/* ─── Exportaciones públicas ──────────────────────────────────── */

/** Carnet de un solo docente (9.3 cm × 5.6 cm). */
export function CarnetDocentePDF({ docente, cicloLabel = '2026-I' }: CarnetDocentePDFProps) {
  const nombre    = docente.nombre ?? docente.nombres ?? ''
  const apellidos = docente.apellidos ?? ''
  const fullName  = `${nombre} ${apellidos}`.trim()
  return (
    <Document
      title={`Carnet docente — ${fullName}`}
      author="Sistema de Gestión Académica"
      subject="Carnet de docente"
    >
      <CarnetPage docente={docente} cicloLabel={cicloLabel} />
    </Document>
  )
}

/**
 * Carnets de múltiples docentes — una página por docente.
 * Ideal para imprimir en lote y cortar individualmente.
 */
export function CarnetDocenteBatchPDF({ docentes, cicloLabel = '2026-I' }: CarnetDocenteBatchPDFProps) {
  return (
    <Document
      title={`Carnets docentes — ${docentes.length} docente${docentes.length !== 1 ? 's' : ''}`}
      author="Sistema de Gestión Académica"
      subject="Carnets de docentes"
    >
      {docentes.map((docente, i) => (
        <CarnetPage key={i} docente={docente} cicloLabel={cicloLabel} />
      ))}
    </Document>
  )
}

/**
 * Hoja A4 vertical con 10 carnets por página (2 columnas × 5 filas),
 * guías de corte incluidas.
 */
export function CarnetDocenteSheetPDF({ docentes, cicloLabel = '2026-I' }: CarnetDocenteSheetPDFProps) {
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
                <CarnetCardContent docente={docente} cicloLabel={cicloLabel} />
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
