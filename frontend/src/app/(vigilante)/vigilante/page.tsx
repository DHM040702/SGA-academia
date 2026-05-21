'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAsistencia, useScan } from '@/hooks/use-asistencia'
import { Avatar } from '@/components/ui/avatar'
import { Dot } from '@/components/ui/dot'
import { useAuth } from '@/contexts/auth-context'

const TODAY = new Date().toISOString().split('T')[0]

function clock() {
  return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}
function dateStr() {
  return new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()
}

type ScanState = 'idle' | 'success' | 'error'

interface LastScan {
  nombre: string
  codigo: string
  seccion: string
  hora: string
  esTardanza: boolean
}

export default function VigilantePage() {
  const { user } = useAuth()
  const scanMut = useScan()

  const [currentTime, setCurrentTime] = useState(clock())
  const [buffer, setBuffer] = useState('')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [lastScan, setLastScan] = useState<LastScan | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Live feed
  const { data: page } = useAsistencia({ fecha: TODAY, limit: 20 })
  const feed = page?.data ?? []
  const presentes = feed.filter((r) => !r.esTardanza).length
  const tardanzas = feed.filter((r) => r.esTardanza).length
  const total = feed.length

  // Clock ticker
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(clock()), 10_000)
    return () => clearInterval(id)
  }, [])

  // HID barcode reader: listen for keystrokes, collect 6-char buffer, submit on Enter
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const code = buffer.trim()
        setBuffer('')
        clearTimeout(bufferTimer.current)
        if (code.length >= 4) {
          scanMut
            .mutateAsync({ codigo: code })
            .then((result) => {
              const alumno = result?.alumno
              const docente = result?.docente
              const persona = alumno ?? docente
              setLastScan({
                nombre: persona
                  ? `${persona.nombre ?? (persona as any).nombres} ${persona.apellidos}`
                  : code,
                codigo: code,
                seccion: alumno?.seccion?.nombre ?? '—',
                hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                esTardanza: result?.esTardanza ?? false,
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
      } else if (e.key.length === 1) {
        setBuffer((b) => b + e.key)
        clearTimeout(bufferTimer.current)
        bufferTimer.current = setTimeout(() => setBuffer(''), 300)
      }
    },
    [buffer, scanMut],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const bgColor = scanState === 'success' ? '#0a1a0a' : scanState === 'error' ? '#1a0a0a' : '#1a1612'
  const accentColor = scanState === 'success' ? '#7be087' : scanState === 'error' ? '#f87171' : '#8aa8ff'

  return (
    <div
      className="w-full h-full flex overflow-hidden"
      style={{
        background: bgColor,
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'background 0.4s',
      }}
    >
      {/* ── Main kiosk ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center px-6 py-3.5"
          style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="font-serif text-[18px] font-semibold tracking-tight">
            <span style={{ color: accentColor }}>CEPREUNASAM</span>
            <span className="text-white/50 mx-1.5">·</span>
            <span className="text-white/80 text-[14px] font-normal">Sistema de Asistencia</span>
          </div>
          <div className="flex-1" />
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium"
            style={{ background: 'rgba(80,170,90,.15)', color: '#7be087', border: '1px solid rgba(80,170,90,.3)' }}
          >
            <Dot tone="success" size={6} />
            Lector conectado
          </div>
          <div className="w-px h-5 mx-3.5" style={{ background: 'rgba(255,255,255,.12)' }} />
          <div className="flex items-center gap-2">
            <Avatar name={user?.email ?? 'Vigilante'} size={28} />
            <div>
              <div className="text-[12px] font-semibold leading-tight">{user?.email?.split('@')[0] ?? 'Vigilante'}</div>
              <div className="text-[10.5px] opacity-70">Vigilante · Entrada principal</div>
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
          {/* Ambient rings */}
          <svg
            width="600" height="600" viewBox="0 0 600 600"
            className="absolute pointer-events-none"
            style={{ opacity: 0.04 }}
          >
            <circle cx="300" cy="300" r="280" fill="none" stroke="#fff" strokeWidth="1" />
            <circle cx="300" cy="300" r="200" fill="none" stroke="#fff" strokeWidth="1" />
            <circle cx="300" cy="300" r="120" fill="none" stroke="#fff" strokeWidth="1" />
          </svg>

          <div className="relative text-center max-w-[720px]">
            {scanState === 'idle' && (
              <>
                <div className="text-[11px] tracking-[0.2em] uppercase opacity-55 mb-3">
                  {lastScan ? 'Último ingreso registrado' : 'Esperando escaneo…'}
                </div>
                {lastScan ? (
                  <>
                    <div
                      className="w-44 h-44 rounded-full mx-auto mb-6 flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,.06)', border: '4px solid rgba(255,255,255,.1)' }}
                    >
                      <Avatar name={lastScan.nombre} size={160} />
                    </div>
                    <h1 className="font-serif text-[44px] font-semibold tracking-[-0.02em] leading-tight m-0">
                      ✓ {lastScan.nombre}
                    </h1>
                    <div className="mt-3 text-[16px] opacity-75">
                      <span className="font-mono">{lastScan.codigo}</span>
                      <span className="mx-2.5 opacity-40">·</span>
                      <span>Sección {lastScan.seccion}</span>
                    </div>
                    <div
                      className="inline-flex items-center gap-2.5 mt-6 px-5 py-3 rounded-full text-[16px] font-semibold"
                      style={{
                        background: 'rgba(80,170,90,.15)',
                        color: '#7be087',
                        border: '1px solid rgba(80,170,90,.3)',
                      }}
                    >
                      <Dot tone="success" size={10} />
                      Asistencia registrada · {lastScan.hora}
                      {lastScan.esTardanza && ' · Tardanza'}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="w-44 h-44 rounded-full mx-auto mb-6 flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,.04)', border: '3px dashed rgba(255,255,255,.15)' }}
                    >
                      <span className="text-[64px] opacity-30">📷</span>
                    </div>
                    <h1 className="font-serif text-[36px] font-semibold tracking-tight opacity-60 m-0">
                      Sin escaneos aún
                    </h1>
                  </>
                )}
              </>
            )}

            {scanState === 'success' && lastScan && (
              <>
                <div className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#7be087' }}>
                  ✓ Acceso permitido
                </div>
                <div
                  className="w-44 h-44 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ background: 'rgba(80,170,90,.12)', border: '4px solid rgba(80,170,90,.4)' }}
                >
                  <Avatar name={lastScan.nombre} size={160} />
                </div>
                <h1 className="font-serif text-[44px] font-semibold tracking-[-0.02em] leading-tight m-0" style={{ color: '#7be087' }}>
                  {lastScan.nombre}
                </h1>
                <div className="mt-3 text-[16px] opacity-80">
                  {lastScan.codigo} · Sección {lastScan.seccion}
                </div>
                <div
                  className="inline-flex items-center gap-2.5 mt-6 px-5 py-3 rounded-full text-[16px] font-semibold"
                  style={{ background: 'rgba(80,170,90,.2)', color: '#7be087', border: '1px solid rgba(80,170,90,.5)' }}
                >
                  <Dot tone="success" size={10} />
                  {lastScan.esTardanza ? 'Tardanza · ' : 'Puntual · '}
                  {lastScan.hora}
                </div>
              </>
            )}

            {scanState === 'error' && (
              <>
                <div className="text-[11px] tracking-[0.2em] uppercase mb-3 text-red-400">
                  ✕ Acceso denegado
                </div>
                <div
                  className="w-44 h-44 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,.12)', border: '4px solid rgba(239,68,68,.4)' }}
                >
                  <span className="text-[80px] opacity-40">?</span>
                </div>
                <h1 className="font-serif text-[40px] font-semibold tracking-tight text-red-400 m-0">
                  Código no reconocido
                </h1>
                <div className="mt-3 text-[15px] opacity-70">{errorMsg}</div>
              </>
            )}

            {/* Scan prompt */}
            <div
              className="mx-auto mt-10 px-5 py-4 flex items-center gap-3.5 text-[13px] opacity-75 rounded-3 w-fit"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px dashed rgba(255,255,255,.15)' }}
            >
              <span className="text-[22px]">⬛</span>
              <div className="text-left">
                <div className="font-semibold text-[14px]">Escanee el código de barras…</div>
                <div className="mt-0.5 text-[12px] opacity-80">
                  El lector HID funciona como teclado. No se requiere acción adicional.
                </div>
              </div>
              <kbd className="ml-2 px-2 py-1 bg-white/10 rounded text-[11px] font-mono">↵</kbd>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center gap-5 px-6 py-3.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
        >
          <div>
            <div className="font-mono text-[11px] opacity-60 tracking-[0.05em]">{dateStr()}</div>
            <div className="font-serif text-[26px] font-semibold leading-tight mt-0.5">{currentTime}</div>
          </div>
          <div className="w-px h-9" style={{ background: 'rgba(255,255,255,.12)' }} />
          <KioskoStat n={presentes + tardanzas} l="Presentes" />
          <KioskoStat n={tardanzas} l="Tardanzas" />
          <KioskoStat n={total} l="Total hoy" />
          <KioskoStat n={total > 0 ? `${Math.round(((presentes + tardanzas) / total) * 100)}%` : '—'} l="Asistencia" highlight />
          <div className="flex-1" />
          <a
            href="/inicio"
            className="px-3 py-1.5 rounded-2 text-[13px] font-medium transition-colors"
            style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}
          >
            Volver al panel
          </a>
        </div>
      </div>

      {/* ── Live feed sidebar ── */}
      <aside
        className="w-[340px] flex flex-col overflow-hidden"
        style={{ background: 'rgba(255,255,255,.04)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif text-[17px] font-semibold m-0">En vivo</h3>
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: 'rgba(80,170,90,.15)', color: '#7be087', border: '1px solid rgba(80,170,90,.25)' }}
            >
              <Dot tone="success" size={6} />actualizando
            </div>
          </div>
          <div className="text-[12px] opacity-60">Últimos {feed.length} registros de hoy</div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {feed.map((r, i) => {
            const persona = r.tipoPersona === 'alumno' ? r.alumno : r.docente
            const nombre = persona
              ? `${(persona as any).nombre ?? (persona as any).nombres} ${persona.apellidos}`
              : 'Desconocido'
            const codigo = r.tipoPersona === 'alumno'
              ? (r.alumno as any)?.codigoBarras ?? r.alumnoId?.slice(0, 6) ?? '—'
              : r.docente?.dni ?? '—'
            const hora = new Date(r.horaIngreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
            return (
              <div
                key={r.id}
                className="flex gap-3 items-center px-4 py-3"
                style={{
                  background: i === 0 ? 'rgba(125,165,255,.08)' : 'transparent',
                  borderLeft: `3px solid ${i === 0 ? '#8aa8ff' : 'transparent'}`,
                }}
              >
                <div className="font-mono text-[12px] opacity-70 w-10">{hora}</div>
                <Avatar name={nombre} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{nombre}</div>
                  <div className="text-[11px] opacity-65 font-mono">{codigo}</div>
                </div>
                <span style={{ color: r.esTardanza ? '#fbbf24' : '#7be087' }}>
                  {r.esTardanza ? '⚠' : '✓'}
                </span>
              </div>
            )
          })}
          {feed.length === 0 && (
            <div className="py-8 text-center text-[12px] opacity-50">Sin ingresos hoy</div>
          )}
        </div>

        <div className="px-4 py-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,.15)' }}>
          <div className="text-[11px] opacity-55 tracking-[0.06em] uppercase mb-2">Atajos de teclado</div>
          <div className="grid gap-1.5 text-[12px]" style={{ gridTemplateColumns: 'auto 1fr' }}>
            <Kbd>F2</Kbd><span className="opacity-85">Registro manual por DNI</span>
            <Kbd>Esc</Kbd><span className="opacity-85">Limpiar pantalla</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function KioskoStat({ n, l, highlight }: { n: string | number; l: string; highlight?: boolean }) {
  return (
    <div>
      <div
        className="font-serif text-[22px] font-semibold leading-none"
        style={{ color: highlight ? '#a3c7ff' : '#fff' }}
      >
        {n}
      </div>
      <div className="text-[10.5px] opacity-65 mt-1 uppercase tracking-[0.05em]">{l}</div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="px-1.5 py-0.5 rounded text-[11px] font-mono w-fit"
      style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}
    >
      {children}
    </kbd>
  )
}
