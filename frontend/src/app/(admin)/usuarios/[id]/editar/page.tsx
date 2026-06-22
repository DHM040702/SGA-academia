'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUsuario, useUpdateUsuario, useResetPasswordUsuario, ROL_LABELS } from '@/hooks/use-usuarios'
import { useAuth } from '@/contexts/auth-context'
import { useAlumnos, type Alumno } from '@/hooks/use-alumnos'
import {
  useAlumnosByApoderado,
  useVincularApoderadoGenerico,
  useDesvincularApoderadoGenerico,
  PARENTESCO_OPTS,
} from '@/hooks/use-apoderados'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

const ROLES_EDITABLES = ['admin', 'director', 'vigilante', 'apoderado', 'docente', 'alumno'] as const

interface FormValues {
  email: string
  password: string
  rol: string
  activo: string
  // Datos personales — admin / director / vigilante (en tabla usuarios)
  nombre: string
  apellidos: string
  dni: string          // usuarios.dni — DNI de acceso al sistema
  // Perfil apoderado (tabla apoderados)
  ap_nombre: string
  ap_apellidos: string
  ap_dni: string       // apoderados.dni — se sincroniza con usuarios.dni al guardar
  ap_telefono_whatsapp: string
}

export default function EditarUsuarioPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { user: me } = useAuth()
  const { data: usuario, isLoading } = useUsuario(id)
  const updateMut = useUpdateUsuario()
  const resetMut  = useResetPasswordUsuario()

  async function handleResetPassword() {
    if (!usuario?.dni) {
      alert('Este usuario no tiene DNI registrado para usarlo como contraseña temporal.')
      return
    }
    if (!confirm(
      `¿Restablecer la contraseña de este usuario a su DNI (${usuario.dni})?\n\n` +
      `El usuario deberá cambiarla obligatoriamente en su próximo inicio de sesión.`,
    )) return
    try {
      await resetMut.mutateAsync(id)
      alert(`Contraseña restablecida al DNI (${usuario.dni}). El usuario deberá cambiarla al ingresar.`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al restablecer la contraseña')
    }
  }

  const esYo = me?.id === id

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>()

  const rolActual = usuario?.rol

  // Roles que guardan nombre/apellidos/dni en la tabla usuarios directamente
  const tieneDatosEnUsuario = rolActual === 'admin' || rolActual === 'director' || rolActual === 'vigilante'

  React.useEffect(() => {
    if (!usuario) return
    reset({
      email:    usuario.email,
      password: '',
      rol:      usuario.rol,
      activo:   String(usuario.activo),
      // Admin / director / vigilante
      nombre:    usuario.nombre    ?? '',
      apellidos: usuario.apellidos ?? '',
      dni:       usuario.dni       ?? '',
      // Apoderado — nombre/apellidos del perfil vinculado; DNI en blanco (campo "nuevo valor")
      ap_nombre:            usuario.apoderado?.nombre    ?? '',
      ap_apellidos:         usuario.apoderado?.apellidos ?? '',
      ap_dni:               '',
      ap_telefono_whatsapp: '',
    })
  }, [usuario, reset])

  async function onSubmit(values: FormValues) {
    const dto: Record<string, unknown> = { id }
    if (values.email)    dto.email    = values.email
    if (values.password) dto.password = values.password
    dto.rol    = values.rol
    dto.activo = values.activo === 'true'

    if (tieneDatosEnUsuario) {
      // Admin / director / vigilante: nombre, apellidos y DNI van en el usuario directamente
      if (values.nombre)    dto.nombre    = values.nombre
      if (values.apellidos) dto.apellidos = values.apellidos
      if (values.dni)       dto.dni       = values.dni
    }

    if (rolActual === 'apoderado') {
      // Perfil apoderado
      const perfil: Record<string, string> = {}
      if (values.ap_nombre)            perfil.nombre            = values.ap_nombre
      if (values.ap_apellidos)         perfil.apellidos         = values.ap_apellidos
      if (values.ap_dni)               perfil.dni               = values.ap_dni
      if (values.ap_telefono_whatsapp) perfil.telefono_whatsapp = values.ap_telefono_whatsapp
      if (Object.keys(perfil).length)  dto.perfil               = perfil

      // Sincronizar usuarios.dni cuando cambia el DNI del apoderado
      if (values.ap_dni) dto.dni = values.ap_dni
    }

    try {
      await updateMut.mutateAsync(dto as any)
      router.push('/usuarios')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar')
    }
  }

  // ── Alumnos vinculados (solo para apoderado) ─────────────────────
  const { data: alumnosVinculados = [], isLoading: alLoading } =
    useAlumnosByApoderado(rolActual === 'apoderado' ? id : '')
  const vincularAl    = useVincularApoderadoGenerico()
  const desvincularAl = useDesvincularApoderadoGenerico()

  const [showAddAl,    setShowAddAl]    = React.useState(false)
  const [alSearchQ,    setAlSearchQ]    = React.useState('')
  const [alSeleccionado, setAlSeleccionado] = React.useState<Alumno | null>(null)
  const [alParentesco, setAlParentesco] = React.useState<string>(PARENTESCO_OPTS[0])

  const { data: alSearchPage } = useAlumnos({ q: alSearchQ, limit: 10 })
  const alResultados = alSearchQ.trim().length >= 2 ? (alSearchPage?.data ?? []) : []

  function resetAlPanel() {
    setShowAddAl(false)
    setAlSearchQ('')
    setAlSeleccionado(null)
    setAlParentesco(PARENTESCO_OPTS[0])
  }

  async function handleVincularAlumno() {
    if (!alSeleccionado) { alert('Selecciona un alumno'); return }
    if (!usuario?.apoderado) { alert('Este usuario no tiene perfil de apoderado'); return }
    try {
      await vincularAl.mutateAsync({
        alumnoId: alSeleccionado.id,
        dto: {
          accion:       'existente',
          apoderado_id: usuario.apoderado.id,
          parentesco:   alParentesco,
          es_principal: false,
        },
      })
      resetAlPanel()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al vincular')
    }
  }

  async function handleDesvincularAlumno(alumnoId: string, apoderadoId: string, nombre: string) {
    if (!confirm(`¿Desvincular al alumno ${nombre} de este apoderado?`)) return
    try {
      await desvincularAl.mutateAsync({ alumnoId, apoderadoId })
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al desvincular')
    }
  }

  // ─────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-text-mute text-sm">Cargando…</div>
  )
  if (!usuario) return (
    <div className="p-7 text-center">
      <p className="text-danger mb-4">Usuario no encontrado</p>
      <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
    </div>
  )

  const tienePerfilSoloLectura = (usuario.docente || usuario.alumno) && !usuario.apoderado

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[600px]">
      <PageHeader
        title="Editar usuario"
        crumbs={[
          { label: 'Usuarios', href: '/usuarios' },
          { label: usuario.email },
          { label: 'Editar' },
        ]}
        action={
          <Btn variant="secondary" size="sm" onClick={() => router.back()}>Cancelar</Btn>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Rol y estado */}
        <Card title="Rol y estado">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Rol" required>
              <select {...register('rol')} className={SELECT_CLS}>
                {ROLES_EDITABLES.map((r) => (
                  <option key={r} value={r}>{ROL_LABELS[r]}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                {...register('activo')}
                disabled={esYo}
                className={SELECT_CLS}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              {esYo && (
                <p className="mt-1 text-[11.5px] text-text-mute">No puedes desactivar tu propia cuenta.</p>
              )}
            </Field>
          </div>
        </Card>

        {/* Datos personales para admin / director / vigilante */}
        {tieneDatosEnUsuario && (
          <Card title="Datos personales" className="mt-4">
            <div className="grid grid-cols-2 gap-4 p-1">
              <Field label="Nombres" error={errors.nombre?.message}>
                <Input
                  placeholder="Juan Carlos"
                  {...register('nombre', { minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
                />
              </Field>
              <Field label="Apellidos" error={errors.apellidos?.message}>
                <Input
                  placeholder="García Mendoza"
                  {...register('apellidos', { minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
                />
              </Field>
              <Field
                label="DNI de ingreso"
                error={errors.dni?.message}
              >
                <Input
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={12}
                  {...register('dni', {
                    pattern: {
                      value: /^(\d{8,12})?$/,
                      message: 'DNI debe tener entre 8 y 12 dígitos',
                    },
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '')
                    },
                  })}
                />
                <p className="mt-1 text-[11.5px] text-text-mute">
                  Con este DNI el usuario inicia sesión.
                </p>
              </Field>
            </div>
          </Card>
        )}

        {/* Perfil apoderado editable */}
        {rolActual === 'apoderado' && (
          <Card title="Datos del apoderado" className="mt-4">
            <div className="grid grid-cols-2 gap-4 p-1">
              <Field label="Nombres" error={errors.ap_nombre?.message}>
                <Input
                  placeholder="Juan Carlos"
                  {...register('ap_nombre', { minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
                />
              </Field>
              <Field label="Apellidos" error={errors.ap_apellidos?.message}>
                <Input
                  placeholder="García Mendoza"
                  {...register('ap_apellidos', { minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
                />
              </Field>
              <Field
                label="Nuevo DNI"
                error={errors.ap_dni?.message}
              >
                <Input
                  placeholder="Dejar vacío para no cambiar"
                  inputMode="numeric"
                  maxLength={8}
                  {...register('ap_dni', {
                    pattern: { value: /^(\d{8})?$/, message: 'DNI debe tener 8 dígitos' },
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '')
                    },
                  })}
                />
                <p className="mt-1 text-[11.5px] text-text-mute">
                  Actualiza también el DNI de ingreso al sistema.
                </p>
              </Field>
              <Field label="Teléfono WhatsApp" error={errors.ap_telefono_whatsapp?.message}>
                <Input
                  placeholder="Dejar vacío para no cambiar"
                  {...register('ap_telefono_whatsapp', {
                    minLength: { value: 7, message: 'Mínimo 7 caracteres' },
                  })}
                />
              </Field>
            </div>

            {/* DNI de ingreso actual */}
            {usuario.dni && (
              <p className="mt-3 px-1 text-[11.5px] text-text-mute">
                DNI de ingreso actual: <strong className="text-text font-medium">{usuario.dni}</strong>
              </p>
            )}
          </Card>
        )}

        {/* Perfil de solo lectura (docente / alumno) */}
        {tienePerfilSoloLectura && (
          <Card title="Perfil vinculado" className="mt-4">
            <div className="p-1 text-[13px]">
              {(() => {
                const p = usuario.docente ?? usuario.alumno
                const tipo = usuario.docente ? 'Docente' : 'Alumno'
                return (
                  <p className="text-text-mute">
                    {tipo}: <strong className="text-text">{p!.nombre} {p!.apellidos}</strong>
                  </p>
                )
              })()}
              <p className="mt-1 text-[11.5px] text-text-mute">
                Para modificar los datos del perfil usa el módulo de{' '}
                {usuario.docente ? 'Docentes' : 'Alumnos'}.
              </p>
            </div>
          </Card>
        )}

        {/* Credenciales */}
        <Card title="Credenciales de acceso" className="mt-4">
          <div className="grid grid-cols-1 gap-4 p-1">
            <Field label="Email" required error={errors.email?.message}>
              <Input
                type="email"
                {...register('email', {
                  required: 'Requerido',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                })}
              />
            </Field>
            <Field label="Nueva contraseña" error={errors.password?.message}>
              <Input
                type="text"
                placeholder="Dejar vacío para no cambiar"
                {...register('password', {
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
              />
            </Field>

            {/* Restablecer contraseña al DNI (forzar cambio en próximo ingreso) */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 mt-1">
              <p className="text-[11.5px] text-text-mute leading-snug">
                Restablece la contraseña al <strong className="text-text">DNI</strong> del usuario y
                lo obliga a cambiarla en el próximo ingreso.
              </p>
              <Btn
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleResetPassword}
                disabled={resetMut.isPending}
                className="shrink-0"
              >
                {resetMut.isPending ? 'Restableciendo…' : 'Restablecer al DNI'}
              </Btn>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Btn>
          <Btn type="submit" disabled={isSubmitting || updateMut.isPending || !isDirty}>
            {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </div>
      </form>

      {/* ── Alumnos vinculados (sección independiente, solo para apoderado) ── */}
      {rolActual === 'apoderado' && (
        <Card title="Alumnos vinculados">
          {alLoading ? (
            <p className="p-3 text-sm text-text-mute">Cargando alumnos…</p>
          ) : alumnosVinculados.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-text-mute">Sin alumnos vinculados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alumnosVinculados.map((av) => (
                <li key={av.alumnoId} className="flex items-center justify-between py-2.5 px-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-text">
                        {av.alumno.nombre} {av.alumno.apellidos}
                      </span>
                      {av.esPrincipal && (
                        <span className="text-[10.5px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-text-mute mt-0.5 truncate">
                      {av.parentesco}
                      {av.alumno.aula && (
                        <><span className="mx-1">·</span>{av.alumno.aula.nombre}</>
                      )}
                      {av.alumno.carrera && (
                        <><span className="mx-1">·</span>{av.alumno.carrera.nombre}</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleDesvincularAlumno(
                        av.alumnoId,
                        av.apoderadoId,
                        `${av.alumno.nombre} ${av.alumno.apellidos}`,
                      )
                    }
                    disabled={desvincularAl.isPending}
                    className="ml-4 shrink-0 text-[12px] text-danger hover:underline disabled:opacity-40"
                  >
                    Desvincular
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Panel para vincular un alumno adicional */}
          {!showAddAl ? (
            <div className="px-3 py-2.5">
              <button
                type="button"
                onClick={() => setShowAddAl(true)}
                className="text-[13px] text-primary hover:underline font-medium"
              >
                + Vincular alumno
              </button>
            </div>
          ) : (
            <div className="border-t border-border p-3 space-y-3">
              <div className="relative">
                <Input
                  placeholder="Buscar alumno por nombre, apellidos o DNI…"
                  value={alSearchQ}
                  onChange={(e) => {
                    setAlSearchQ(e.target.value)
                    setAlSeleccionado(null)
                  }}
                />
                {alResultados.length > 0 && !alSeleccionado && (
                  <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-lg max-h-44 overflow-y-auto">
                    {alResultados.map((a) => (
                      <li
                        key={a.id}
                        className="px-3 py-2 text-[13px] cursor-pointer hover:bg-surface-alt"
                        onClick={() => {
                          setAlSeleccionado(a)
                          setAlSearchQ('')
                        }}
                      >
                        <span className="font-medium">{a.nombres} {a.apellidos}</span>
                        <span className="ml-2 text-text-mute text-[11.5px]">DNI {a.dni}</span>
                        {a.aula && (
                          <span className="ml-2 text-text-mute text-[11.5px]">{a.aula.nombre}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {alSeleccionado && (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-text">
                      {alSeleccionado.nombres} {alSeleccionado.apellidos}
                    </span>
                    <span className="ml-2 text-[11.5px] text-text-mute">
                      DNI {alSeleccionado.dni}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlSeleccionado(null)}
                    className="shrink-0 text-text-mute hover:text-text text-[12px] leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-end gap-3 pt-1">
                <Field label="Parentesco" required className="flex-1">
                  <select
                    value={alParentesco}
                    onChange={(e) => setAlParentesco(e.target.value)}
                    className={SELECT_CLS}
                  >
                    {PARENTESCO_OPTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-2 pb-px">
                  <Btn variant="secondary" size="sm" type="button" onClick={resetAlPanel}>
                    Cancelar
                  </Btn>
                  <Btn
                    size="sm"
                    type="button"
                    onClick={handleVincularAlumno}
                    disabled={vincularAl.isPending || !alSeleccionado}
                  >
                    {vincularAl.isPending ? 'Vinculando…' : 'Vincular'}
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
