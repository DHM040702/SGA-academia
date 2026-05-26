'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUsuario, useUpdateUsuario, ROL_LABELS } from '@/hooks/use-usuarios'
import { useAuth } from '@/contexts/auth-context'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

const ROLES_EDITABLES = ['admin', 'director', 'vigilante', 'apoderado', 'docente', 'alumno'] as const

interface FormValues {
  email: string
  password: string
  rol: string
  activo: string
  // Perfil apoderado
  nombre: string
  apellidos: string
  dni: string
  telefono_whatsapp: string
}

export default function EditarUsuarioPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { user: me } = useAuth()
  const { data: usuario, isLoading } = useUsuario(id)
  const updateMut = useUpdateUsuario()

  const esYo = me?.id === id

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>()

  const rolActual = usuario?.rol

  React.useEffect(() => {
    if (!usuario) return
    const ap = usuario.apoderado
    reset({
      email:              usuario.email,
      password:           '',
      rol:                usuario.rol,
      activo:             String(usuario.activo),
      nombre:             ap?.nombre   ?? '',
      apellidos:          ap?.apellidos ?? '',
      dni:                '',
      telefono_whatsapp:  '',
    })
  }, [usuario, reset])

  async function onSubmit(values: FormValues) {
    const dto: Record<string, unknown> = { id }
    if (values.email)    dto.email    = values.email
    if (values.password) dto.password = values.password
    dto.rol    = values.rol
    dto.activo = values.activo === 'true'

    // Enviar cambios de perfil solo para apoderado
    if (rolActual === 'apoderado') {
      const perfil: Record<string, string> = {}
      if (values.nombre)            perfil.nombre            = values.nombre
      if (values.apellidos)         perfil.apellidos         = values.apellidos
      if (values.dni)               perfil.dni               = values.dni
      if (values.telefono_whatsapp) perfil.telefono_whatsapp = values.telefono_whatsapp
      if (Object.keys(perfil).length) dto.perfil = perfil
    }

    try {
      await updateMut.mutateAsync(dto as any)
      router.push('/usuarios')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar')
    }
  }

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

        {/* Perfil apoderado editable */}
        {rolActual === 'apoderado' && (
          <Card title="Datos del apoderado" className="mt-4">
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
              <Field label="Nuevo DNI" error={errors.dni?.message}>
                <Input
                  placeholder="Dejar vacío para no cambiar"
                  maxLength={8}
                  {...register('dni', {
                    pattern: { value: /^(\d{8})?$/, message: 'DNI debe tener 8 dígitos' },
                  })}
                />
              </Field>
              <Field label="Teléfono WhatsApp" error={errors.telefono_whatsapp?.message}>
                <Input
                  placeholder="Dejar vacío para no cambiar"
                  {...register('telefono_whatsapp', {
                    minLength: { value: 7, message: 'Mínimo 7 caracteres' },
                  })}
                />
              </Field>
            </div>
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
          </div>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Btn>
          <Btn type="submit" disabled={isSubmitting || updateMut.isPending || !isDirty}>
            {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
