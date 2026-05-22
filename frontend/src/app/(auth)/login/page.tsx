'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Scan, Shield } from '@/components/icons'

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  function roleHome(rol?: string) {
    if (rol === 'alumno' || rol === 'apoderado') return '/portal/inicio'
    if (rol === 'vigilante') return '/vigilante'
    return '/inicio'
  }

  React.useEffect(() => {
    if (user) router.replace(roleHome(user.rol))
  }, [user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // useEffect above handles redirect after user state updates
    } catch {
      setError('Credenciales incorrectas. Verifique su usuario y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full grid grid-cols-[1.05fr_1fr] overflow-hidden font-sans">
      {/* ── Brand panel ─────────────────────────────────────── */}
      <div
        className="relative flex flex-col justify-between p-[52px_60px] text-white overflow-hidden"
        style={{ background: 'linear-gradient(165deg, oklch(0.36 0.10 255) 0%, oklch(0.28 0.11 255) 100%)' }}
      >
        {/* Watermark rings */}
        <svg
          width="520" height="520" viewBox="0 0 520 520"
          className="absolute right-[-120px] bottom-[-80px] opacity-[0.08] pointer-events-none"
        >
          <circle cx="260" cy="260" r="240" fill="none" stroke="#fff" strokeWidth="1"/>
          <circle cx="260" cy="260" r="180" fill="none" stroke="#fff" strokeWidth="1"/>
          <circle cx="260" cy="260" r="120" fill="none" stroke="#fff" strokeWidth="1"/>
          <path d="M180 200 L260 224 L340 200 L340 320 L260 344 L180 320 Z" fill="#fff" opacity="0.6"/>
        </svg>

        {/* Logo */}
        <div className="font-serif font-bold text-[22px] tracking-tight relative z-10">
          CEPREUNASAM
        </div>

        {/* Hero text */}
        <div className="max-w-[420px] relative z-10">
          <p className="text-[11px] tracking-[0.18em] uppercase opacity-70 mb-3">
            Sistema de Gestión Académica
          </p>
          <h2 className="m-0 font-serif font-medium text-[38px] leading-[1.1] tracking-[-0.02em]">
            La administración del Centro Preuniversitario, en un solo lugar.
          </h2>
          <p className="mt-[18px] text-[14px] leading-relaxed opacity-80">
            Asistencia por código de barras, horarios sin conflictos, comunicados inmediatos y reportes en tiempo real.
          </p>
        </div>

        {/* Version */}
        <div className="font-mono text-[11.5px] tracking-[0.05em] opacity-55 relative z-10">
          UNASAM · CEPREUNASAM
        </div>
      </div>

      {/* ── Login form ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-10 bg-bg">
        <div className="w-full max-w-[380px]">
          <h1 className="m-0 font-serif font-semibold text-[30px] text-text tracking-[-0.02em]">
            Iniciar sesión
          </h1>
          <p className="mt-2 mb-8 text-[13.5px] text-text-mute">
            Ingrese sus credenciales para acceder al sistema.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Usuario o correo institucional" required>
              <Input
                icon={<Mail size={14} />}
                type="email"
                placeholder="usuario@unasam.edu.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Contraseña" required>
              <Input
                icon={<Lock size={14} />}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <p className="text-[12.5px] text-danger bg-danger-light px-3 py-2 rounded-2 m-0">
                {error}
              </p>
            )}

            <div className="flex justify-between items-center">
              <label className="inline-flex items-center gap-1.5 text-[12.5px] text-text-mute cursor-pointer select-none">
                <input type="checkbox" className="accent-primary" defaultChecked />
                Mantener sesión iniciada
              </label>
              <a href="#" className="text-[12.5px] text-primary no-underline font-medium hover:underline">
                ¿Olvidó su contraseña?
              </a>
            </div>

            <Btn
              type="submit"
              disabled={loading}
              className="w-full justify-center py-3"
            >
              {loading ? 'Verificando…' : 'Ingresar al sistema'}
            </Btn>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-2.5 my-[22px]">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-soft tracking-[0.05em]">O ACCESO RÁPIDO</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" size="sm" className="justify-center">
              <Scan size={14} />
              Modo vigilante
            </Btn>
            <Btn variant="secondary" size="sm" className="justify-center">
              <Shield size={14} />
              Acceso SSO
            </Btn>
          </div>

          <div className="mt-8 p-3 bg-surface2 border border-border-s rounded-2 text-[11.5px] text-text-mute leading-[1.55]">
            Acceso restringido a personal autorizado de CEPREUNASAM. Todos los accesos quedan registrados.
          </div>
        </div>
      </div>
    </div>
  )
}
