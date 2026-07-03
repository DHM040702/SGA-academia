'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAsistencia, useScan, useSetTardanza, useResumenAsistencia } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Dot } from '@/components/ui/dot'
import { useAuth } from '@/contexts/auth-context'

const _n = new Date()
const TODAY = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, '0')}-${String(_n.getDate()).padStart(2, '0')}`

function clock() {
  return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}
function dateStr() {
  return new Date()
    .toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
}

type ScanState = 'idle' | 'success' | 'error'
interface LastScan {
  id: string; nombre: string; codigo: string
  aula: string; hora: string; esTardanza: boolean
  yaRegistrado?: boolean
}

export default function AuxiliarPage() {
  const { user, loading } = useAuth()
  const router     = useRouter()
  const scanMut    = useScan()
  const correctMut = useSetTardanza()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.debeCambiarPassword) router.replace('/cambiar-password')
  }, [user, loading, router])

  const [currentTime, setCurrentTime]   = useState(clock())
  const [buffer, setBuffer]             = useState('')
  const [scanState, setScanState]       = useState<ScanState>('idle')
  const [lastScan, setLastScan]         = useState<LastScan | null>(null)
  const [errorMsg, setErrorMsg]         = useState('')
  const [manualCode, setManualCode]     = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const bufferTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const manualInputRef = useRef<HTMLInputElement>(null)

  const { data: pageData } = useAsistencia({ fecha: TODAY, limit: 20 })
  const feed      = pageData?.data ?? []
  // Totales REALES del día (no solo el feed de 20 «En vivo»). Se refrescan
  // automáticamente y tras cada escaneo (invalida la key ['asistencia']).
  const { data: stats } = useResumenAsistencia()
  const presentes     = stats?.presentes ?? feed.filter((r) => !r.esTardanza).length
  const tardanzas     = stats?.tardanzas ?? feed.filter((r) => r.esTardanza).length
  const totalEsperado = stats?.total_alumno ?? feed.length
  const asistieron    = presentes + tardanzas
  const pctAsistencia = stats?.pct_asistencia ?? (feed.length > 0 ? Math.round((asistieron / feed.length) * 100) : 0)

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(clock()), 10_000)
    return () => clearInterval(id)
  }, [])

  function processCode(code: string) {
    if (!code || scanMut.isPending) return
    scanMut.mutateAsync({ codigo: code })
      .then((result) => {
        const alumno  = result?.alumno
        const docente = result?.docente
        const persona = alumno ?? docente
        // Usar la hora REAL del registro (para un re-escaneo muestra la hora
        // original, no la actual).
        const horaReg = result?.horaIngreso
          ? new Date(result.horaIngreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        setLastScan({
          id:           result?.id ?? '',
          nombre:       persona ? `${persona.nombre ?? (persona as any).nombres} ${persona.apellidos}` : code,
          codigo:       code,
          aula:         alumno?.aula?.nombre ?? '—',
          hora:         horaReg,
          esTardanza:   result?.esTardanza ?? false,
          yaRegistrado: result?.yaRegistrado ?? false,
        })
        setScanState('success')
        setTimeout(() => setScanState('idle'), 4000)
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Código no encontrado'
        setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
        setScanState('error')
        setTimeout(() => setScanState('idle'), 3000)
      })
  }

  function toggleTardanza() {
    if (!lastScan?.id) return
    correctMut.mutate(
      { id: lastScan.id, es_tardanza: !lastScan.esTardanza },
      { onSuccess: () => setLastScan((p) => p ? { ...p, esTardanza: !p.esTardanza } : p) },
    )
  }

  function submitManual() {
    const code = manualCode.trim()
    if (!code) return
    setManualCode('')
    processCode(code)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (inputFocused) return
    if (e.key === 'Enter') {
      const code = buffer.trim()
      setBuffer('')
      clearTimeout(bufferTimer.current)
      if (code.length >= 4) processCode(code)
    } else if (e.key.length === 1) {
      setBuffer((b) => b + e.key)
      clearTimeout(bufferTimer.current)
      bufferTimer.current = setTimeout(() => setBuffer(''), 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer, inputFocused])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Duplicado = se re-escaneó a alguien que YA tenía asistencia hoy. Se muestra
  // en ÁMBAR (advertencia) para que el auxiliar note que NO es un registro nuevo.
  const duplicado = scanState === 'success' && !!lastScan?.yaRegistrado

  const bg     = scanState === 'error' ? '#1a0a0a' : duplicado ? '#1a1608' : scanState === 'success' ? '#0a1a0a' : '#1a1612'
  const accent = scanState === 'error' ? '#f87171' : duplicado ? '#fbbf24' : scanState === 'success' ? '#7be087' : '#8aa8ff'

  /* ── color helpers ── */
  const successStyle = { background: 'rgba(80,170,90,.15)', color: '#7be087', border: '1px solid rgba(80,170,90,.3)' } as const
  const successStyleStrong = { background: 'rgba(80,170,90,.2)', color: '#7be087', border: '1px solid rgba(80,170,90,.5)' } as const

  // Estilos de la confirmación: verde (nuevo) vs ámbar (ya registrado).
  const okColor    = duplicado ? '#fbbf24' : '#7be087'
  const okCircle   = duplicado
    ? { background: 'rgba(251,191,36,.12)', border: '3px solid rgba(251,191,36,.4)' }
    : { background: 'rgba(80,170,90,.12)', border: '3px solid rgba(80,170,90,.4)' }
  const okPill     = duplicado
    ? { background: 'rgba(251,191,36,.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.5)' }
    : successStyleStrong

  return (
    <div
      className="w-full h-full flex overflow-hidden select-none"
      style={{ background: bg, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.4s' }}
    >
      {/* ════════════════ REGISTRO DE ASISTENCIA ════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5"
          style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.06)' }}
        >
          <div className="font-serif font-semibold tracking-tight leading-none">
            <span className="text-[15px] sm:text-[17px]" style={{ color: accent }}>Centro Preuniversitario</span>
            <span className="hidden sm:inline text-white/40 mx-1.5">·</span>
            <span className="hidden sm:inline text-white/65 text-[12px] font-normal">Registro con lectora HID</span>
          </div>

          <div className="flex-1" />

          {/* Lector pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={successStyle}
          >
            <Dot tone="success" size={6} />
            <span>Lector conectado</span>
          </div>

          <div className="hidden sm:block w-px h-5 mx-3" style={{ background: 'rgba(255,255,255,.12)' }} />

          {/* User */}
          <div className="flex items-center gap-2">
            <Avatar name={user?.nombre ? `${user.nombre} ${user.apellidos ?? ''}`.trim() : (user?.email ?? 'Auxiliar')} size={26} />
            <div className="hidden md:block leading-tight">
              <div className="text-[12px] font-semibold">
                {user?.nombre ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}` : (user?.email?.split('@')[0] ?? 'Auxiliar')}
              </div>
              <div className="text-[10px] opacity-55">Auxiliar · Entrada principal</div>
            </div>
          </div>

          {/* Sidebar toggle — only on smaller than lg */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden ml-1 w-8 h-8 rounded-lg flex items-center justify-center text-[16px]"
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)' }}
          >
            {sidebarOpen ? '✕' : '≡'}
          </button>
        </div>

        {/* ── Center — flex-1, NO scroll, everything shrinks to fit ── */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 gap-0 overflow-hidden">

          {/* Ambient rings (decorative, only large screens) */}
          <svg
            width="520" height="520" viewBox="0 0 600 600"
            className="absolute pointer-events-none opacity-[0.035] hidden lg:block"
          >
            <circle cx="300" cy="300" r="280" fill="none" stroke="#fff" strokeWidth="1" />
            <circle cx="300" cy="300" r="200" fill="none" stroke="#fff" strokeWidth="1" />
            <circle cx="300" cy="300" r="120" fill="none" stroke="#fff" strokeWidth="1" />
          </svg>

          <div className="relative w-full max-w-md text-center flex flex-col items-center gap-2 sm:gap-3">

            {/* ── IDLE ── */}
            {scanState === 'idle' && (
              <>
                <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase opacity-50 m-0">
                  {lastScan ? 'Último ingreso registrado' : 'Esperando escaneo…'}
                </p>

                {lastScan ? (
                  <>
                    <div
                      className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,.06)', border: '3px solid rgba(255,255,255,.1)' }}
                    >
                      <Avatar name={lastScan.nombre} size={120} />
                    </div>

                    <h1 className="font-serif text-xl sm:text-3xl lg:text-[40px] font-semibold tracking-tight leading-tight m-0 break-words w-full" style={{ color: '#fff' }}>
                      ✓ {lastScan.nombre}
                    </h1>

                    <p className="text-[12px] sm:text-[14px] opacity-70 m-0">
                      <span className="font-mono">{lastScan.codigo}</span>
                      {lastScan.aula !== '—' && (
                        <><span className="mx-2 opacity-40">·</span>Aula {lastScan.aula}</>
                      )}
                    </p>

                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] sm:text-[14px] font-semibold"
                      style={successStyle}
                    >
                      <Dot tone="success" size={8} />
                      Asistencia registrada · {lastScan.hora}
                      {lastScan.esTardanza && ' · Tardanza'}
                    </div>

                    <TardanzaToggle
                      esTardanza={lastScan.esTardanza}
                      onToggle={toggleTardanza}
                      pending={correctMut.isPending}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,.04)', border: '3px dashed rgba(255,255,255,.15)' }}
                    >
                      <span className="text-4xl sm:text-5xl opacity-30">📷</span>
                    </div>
                    <h1 className="font-serif text-xl sm:text-3xl font-semibold opacity-55 m-0" style={{ color: '#fff' }}>
                      Sin escaneos aún
                    </h1>
                  </>
                )}
              </>
            )}

            {/* ── SUCCESS ── */}
            {scanState === 'success' && lastScan && (
              <>
                <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase m-0" style={{ color: okColor }}>
                  {duplicado ? '⚠ Ya tenía asistencia hoy' : '✓ Acceso permitido'}
                </p>
                <div
                  className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-full flex items-center justify-center"
                  style={okCircle}
                >
                  <Avatar name={lastScan.nombre} size={120} />
                </div>
                <h1
                  className="font-serif text-xl sm:text-3xl lg:text-[40px] font-semibold tracking-tight leading-tight m-0 break-words w-full"
                  style={{ color: okColor }}
                >
                  {lastScan.nombre}
                </h1>
                <p className="text-[12px] sm:text-[14px] opacity-75 m-0">
                  {lastScan.codigo}{lastScan.aula !== '—' ? ` · Aula ${lastScan.aula}` : ''}
                </p>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] sm:text-[14px] font-semibold"
                  style={okPill}
                >
                  <Dot tone={duplicado ? 'warning' : 'success'} size={8} />
                  {duplicado
                    ? `Registrado ${lastScan.hora}${lastScan.esTardanza ? ' · Tardanza' : ''}`
                    : `${lastScan.esTardanza ? 'Tardanza' : 'Puntual'} · ${lastScan.hora}`}
                </div>
                <TardanzaToggle
                  esTardanza={lastScan.esTardanza}
                  onToggle={toggleTardanza}
                  pending={correctMut.isPending}
                />
              </>
            )}

            {/* ── ERROR ── */}
            {scanState === 'error' && (
              <>
                <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-red-400 m-0">
                  ✕ Acceso denegado
                </p>
                <div
                  className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,.12)', border: '3px solid rgba(239,68,68,.4)' }}
                >
                  <span className="text-4xl sm:text-5xl opacity-40">?</span>
                </div>
                <h1 className="font-serif text-xl sm:text-3xl font-semibold text-red-400 m-0">
                  Código no reconocido
                </h1>
                <p className="text-[12px] sm:text-[13px] opacity-65 m-0 break-words w-full">{errorMsg}</p>
              </>
            )}

            {/* ── Scan prompt ── */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] opacity-70 w-fit mx-auto mt-1"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px dashed rgba(255,255,255,.15)' }}
            >
              <span className="text-lg flex-shrink-0">⬛</span>
              <div className="text-left">
                <div className="font-semibold leading-tight">Escanee el código de barras…</div>
                <div className="text-[11px] opacity-75 hidden sm:block mt-0.5">
                  El lector HID funciona como teclado.
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[11px] font-mono flex-shrink-0">↵</kbd>
            </div>

            {/* ── Manual input ── */}
            <div className="w-full mt-1">
              <div className="text-[10px] tracking-[0.12em] uppercase opacity-45 mb-1.5 text-center">
                Ingreso manual
              </div>
              <div className="flex gap-2">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitManual() } }}
                  placeholder="Código de alumno o DNI docente…"
                  className="flex-1 min-w-0 px-3 py-2 text-[12px] sm:text-[13px] rounded-lg font-mono outline-none"
                  style={{
                    background: 'rgba(255,255,255,.08)',
                    border: inputFocused ? '1px solid rgba(138,168,255,.6)' : '1px solid rgba(255,255,255,.15)',
                    color: '#fff',
                  }}
                />
                <button
                  onClick={submitManual}
                  disabled={!manualCode.trim() || scanMut.isPending}
                  className="px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold rounded-lg flex-shrink-0 disabled:opacity-30 transition-opacity"
                  style={{ background: 'rgba(138,168,255,.2)', color: '#8aa8ff', border: '1px solid rgba(138,168,255,.3)' }}
                >
                  Registrar
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="flex-shrink-0 flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-2 sm:py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)' }}
        >
          <div className="flex-shrink-0">
            <div className="font-mono text-[9px] sm:text-[10px] opacity-55 tracking-[0.05em] hidden sm:block">{dateStr()}</div>
            <div className="font-serif text-[18px] sm:text-[22px] font-semibold leading-tight">{currentTime}</div>
          </div>

          <div className="w-px h-7 flex-shrink-0" style={{ background: 'rgba(255,255,255,.12)' }} />

          <RegistroStat n={asistieron} l="Presentes" />
          <RegistroStat n={tardanzas} l="Tardanzas" />
          <RegistroStat n={totalEsperado} l="Total" />
          <RegistroStat
            n={totalEsperado > 0 ? `${pctAsistencia}%` : '—'}
            l="Asistencia"
            highlight
          />

          <div className="flex-1" />

          {/* Atajos — solo desktop */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] opacity-60">
            <Kbd>↵</Kbd><span>Confirmar</span>
            <Kbd>Esc</Kbd><span>Limpiar</span>
          </div>

          <Link
            href="/inicio"
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-medium"
            style={{ color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}
          >
            Panel
          </Link>
        </div>
      </div>

      {/* ════════════════ SIDEBAR ════════════════ */}

      {/* Desktop — always visible */}
      <aside
        className="hidden lg:flex w-[260px] xl:w-[300px] flex-shrink-0 flex-col overflow-hidden"
        style={{ background: 'rgba(255,255,255,.04)', borderLeft: '1px solid rgba(255,255,255,.06)' }}
      >
        <FeedPanel feed={feed} />
      </aside>

      {/* Mobile/tablet — slide-over */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute right-0 top-0 bottom-0 w-72 sm:w-80 flex flex-col overflow-hidden"
            style={{ background: '#1e1e1a', borderLeft: '1px solid rgba(255,255,255,.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <FeedPanel feed={feed} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  )
}

/* ─── Feed panel (shared sidebar content) ─────────────────────── */
function FeedPanel({ feed, onClose }: { feed: any[]; onClose?: () => void }) {
  return (
    <>
      <div
        className="flex-shrink-0 px-4 pt-3.5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-[15px] font-semibold m-0" style={{ color: '#fff' }}>En vivo</h3>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: 'rgba(80,170,90,.15)', color: '#7be087', border: '1px solid rgba(80,170,90,.25)' }}
            >
              <Dot tone="success" size={5} />actualizando
            </div>
            {onClose && (
              <button onClick={onClose} className="text-white/40 hover:text-white text-[15px] leading-none">✕</button>
            )}
          </div>
        </div>
        <p className="text-[11px] opacity-55 m-0 mt-0.5">Últimos {feed.length} registros de hoy</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {feed.map((r: any, i: number) => {
          const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
          const nombre  = persona ? `${persona.nombre ?? persona.nombres} ${persona.apellidos}` : 'Desconocido'
          const codigo  = r.tipoPersona === 'alumno'
            ? r.alumno?.codigoBarras ?? '—'
            : r.docente?.dni ?? '—'
          const hora = new Date(r.horaIngreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
          return (
            <div
              key={r.id}
              className="flex gap-2.5 items-center px-3 py-2.5"
              style={{
                background:  i === 0 ? 'rgba(125,165,255,.08)' : 'transparent',
                borderLeft: `3px solid ${i === 0 ? '#8aa8ff' : 'transparent'}`,
              }}
            >
              <div className="font-mono text-[10.5px] opacity-60 w-9 flex-shrink-0 leading-tight">{hora}</div>
              <Avatar name={nombre} size={30} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate">{nombre}</div>
                <div className="text-[10.5px] opacity-55 font-mono">{codigo}</div>
              </div>
              <span className="flex-shrink-0 text-[13px]" style={{ color: r.esTardanza ? '#fbbf24' : '#7be087' }}>
                {r.esTardanza ? '⚠' : '✓'}
              </span>
            </div>
          )
        })}
        {feed.length === 0 && (
          <div className="py-10 text-center text-[12px] opacity-45">Sin ingresos hoy</div>
        )}
      </div>

      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.15)' }}
      >
        <div className="text-[10px] opacity-50 tracking-[0.06em] uppercase mb-1.5">Atajos de teclado</div>
        <div className="grid gap-1.5 text-[11px]" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <Kbd>↵</Kbd><span className="opacity-75 self-center">Confirmar código escaneado</span>
          <Kbd>Esc</Kbd><span className="opacity-75 self-center">Limpiar pantalla</span>
        </div>
      </div>
    </>
  )
}

/* ─── Sub-components ──────────────────────────────────────────── */
function RegistroStat({ n, l, highlight }: { n: string | number; l: string; highlight?: boolean }) {
  return (
    <div className="flex-shrink-0">
      <div
        className="font-serif text-[17px] sm:text-[20px] font-semibold leading-none"
        style={{ color: highlight ? '#a3c7ff' : '#fff' }}
      >
        {n}
      </div>
      <div className="text-[9px] sm:text-[10px] opacity-60 mt-0.5 uppercase tracking-[0.05em]">{l}</div>
    </div>
  )
}

function TardanzaToggle({
  esTardanza, onToggle, pending,
}: {
  esTardanza: boolean; onToggle: () => void; pending: boolean
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className="text-[12px] sm:text-[13px] transition-opacity"
        style={{ opacity: esTardanza ? 0.4 : 1, color: '#7be087' }}
      >
        Puntual
      </span>

      {/* Toggle pill — fixed 52×26px so the thumb calc is exact */}
      <button
        onClick={onToggle}
        disabled={pending}
        aria-label={esTardanza ? 'Cambiar a puntual' : 'Cambiar a tardanza'}
        className="relative flex-shrink-0 rounded-full transition-all disabled:opacity-40"
        style={{
          width: 52, height: 26,
          background: esTardanza ? 'rgba(251,191,36,.3)' : 'rgba(80,170,90,.3)',
          border: `1.5px solid ${esTardanza ? 'rgba(251,191,36,.6)' : 'rgba(80,170,90,.55)'}`,
        }}
      >
        {/* Thumb — uses left so it's always correct regardless of outer size */}
        <span
          className="absolute top-[3px] rounded-full transition-all shadow-md"
          style={{
            width: 18, height: 18,
            background: esTardanza ? '#fbbf24' : '#7be087',
            left: esTardanza ? 'calc(100% - 21px)' : '3px',
          }}
        />
      </button>

      <span
        className="text-[12px] sm:text-[13px] transition-all"
        style={{ opacity: esTardanza ? 1 : 0.4, color: '#fbbf24' }}
      >
        Tardanza
      </span>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono"
      style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}
    >
      {children}
    </kbd>
  )
}
