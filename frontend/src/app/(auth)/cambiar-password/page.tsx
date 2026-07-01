'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import api from '@/lib/api'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Lock } from '@/components/icons'

export default function CambiarPasswordPage() {
  const { user, loading, refreshUser, logout } = useAuth()
  const router = useRouter()
  const [nueva, setNueva] = React.useState('')
  const [confirmar, setConfirmar] = React.useState('')
  const [error, setError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  function roleHome(rol?: string) {
    if (rol === 'alumno' || rol === 'apoderado') return '/portal/inicio'
    if (rol === 'auxiliar') return '/auxiliar'
    return '/inicio'
  }

  // Si no hay sesión, volver al login
  React.useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (nueva !== confirmar) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }

    setSaving(true)
    try {
      await api.post('/auth/cambiar-password', { nueva })
      await refreshUser()
      router.replace(roleHome(user?.rol))
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (Array.isArray(msg)) setError(msg.join('. '))
      else if (typeof msg === 'string') setError(msg)
      else setError('No se pudo cambiar la contraseña. Verifique la contraseña actual.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-bg p-10 font-sans">
      <div className="w-full max-w-[400px]">
        <h1 className="m-0 font-serif font-semibold text-[28px] text-text tracking-[-0.02em]">
          Cambiar contraseña
        </h1>
        <p className="mt-2 mb-8 text-[13.5px] text-text-mute leading-relaxed">
          Por seguridad, debe establecer una nueva contraseña antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nueva contraseña" required>
            <Input
              icon={<Lock size={14} />}
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirmar nueva contraseña" required>
            <Input
              icon={<Lock size={14} />}
              type="password"
              placeholder="Repita la nueva contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          {error && (
            <p className="text-[12.5px] text-danger bg-danger-light px-3 py-2 rounded-2 m-0">
              {error}
            </p>
          )}

          <Btn type="submit" disabled={saving} className="w-full justify-center py-3">
            {saving ? 'Guardando…' : 'Cambiar contraseña'}
          </Btn>

          <button
            type="button"
            onClick={() => { logout(); router.replace('/login') }}
            className="text-[12.5px] text-text-mute hover:text-text bg-transparent border-0 cursor-pointer mt-1"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
