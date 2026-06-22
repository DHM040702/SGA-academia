'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateUsuario, ROL_LABELS } from '@/hooks/use-usuarios'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

// Roles creables desde este formulario
const ROLES_SISTEMA = ['admin', 'director', 'vigilante', 'apoderado'] as const
type RolSistema = (typeof ROLES_SISTEMA)[number]

interface FormValues {
  email: string
  password: string
  rol: RolSistema
  activo: string
  // Datos personales (todos los roles)
  nombre: string
  apellidos: string
  dni: string
  // Campos extra solo para apoderado
  telefono_whatsapp: string
}

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const createMut = useCreateUsuario()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { rol: 'vigilante', activo: 'true' },
  })

  const rolSeleccionado = watch('rol')
  const esApoderado = rolSeleccionado === 'apoderado'

  async function onSubmit(values: FormValues) {
    // La contraseña temporal = DNI (el backend la asigna automáticamente).
    const dto: Record<string, unknown> = {
      email:    values.email,
      rol:      values.rol,
      activo:   values.activo === 'true',
    }

    if (esApoderado) {
      // Para apoderado: los datos personales van en el perfil
      // El backend deriva usuarios.dni automáticamente del perfil.dni
      dto.perfil = {
        nombre:            values.nombre,
        apellidos:         values.apellidos,
        dni:               values.dni,
        telefono_whatsapp: values.telefono_whatsapp,
      }
    } else {
      // Para admin / director / vigilante: datos directamente en el usuario
      if (values.nombre)    dto.nombre    = values.nombre
      if (values.apellidos) dto.apellidos = values.apellidos
      if (values.dni)       dto.dni       = values.dni
    }

    try {
      await createMut.mutateAsync(dto as any)
      router.push('/usuarios')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al crear el usuario')
    }
  }

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[600px]">
      <PageHeader
        title="Nuevo usuario"
        crumbs={[{ label: 'Usuarios', href: '/usuarios' }, { label: 'Nuevo' }]}
        action={
          <Btn variant="secondary" size="sm" onClick={() => router.back()}>Cancelar</Btn>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Rol y estado — primero para que los campos de perfil se muestren/oculten */}
        <Card title="Rol y estado">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Rol" required>
              <select {...register('rol')} className={SELECT_CLS}>
                {ROLES_SISTEMA.map((r) => (
                  <option key={r} value={r}>{ROL_LABELS[r]}</option>
                ))}
              </select>
              <p className="mt-1 text-[11.5px] text-text-mute">
                {esApoderado
                  ? 'Se creará también el perfil de apoderado vinculado.'
                  : 'Docentes y alumnos se crean desde sus módulos propios.'}
              </p>
            </Field>
            <Field label="Estado">
              <select {...register('activo')} className={SELECT_CLS}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Datos personales — todos los roles */}
        <Card title={esApoderado ? 'Datos del apoderado' : 'Datos personales'} className="mt-4">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Nombres" required={esApoderado} error={errors.nombre?.message}>
              <Input
                placeholder="Juan Carlos"
                {...register('nombre', {
                  ...(esApoderado ? { required: 'Requerido' } : {}),
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
              />
            </Field>
            <Field label="Apellidos" required={esApoderado} error={errors.apellidos?.message}>
              <Input
                placeholder="García Mendoza"
                {...register('apellidos', {
                  ...(esApoderado ? { required: 'Requerido' } : {}),
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
              />
            </Field>

            {/* DNI de ingreso — todos los roles */}
            <Field
              label="DNI"
              required
              error={errors.dni?.message}
            >
              <Input
                placeholder={esApoderado ? '76543210' : '12345678'}
                inputMode="numeric"
                maxLength={12}
                {...register('dni', {
                  required: 'Requerido',
                  pattern: {
                    value: /^\d{8,12}$/,
                    message: 'DNI debe tener entre 8 y 12 dígitos',
                  },
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '')
                  },
                })}
              />
              <p className="mt-1 text-[11.5px] text-text-mute">
                Con este DNI el usuario iniciará sesión en el sistema.
              </p>
            </Field>

            {/* Teléfono solo para apoderado */}
            {esApoderado && (
              <Field label="Teléfono WhatsApp" required error={errors.telefono_whatsapp?.message}>
                <Input
                  placeholder="+51 943 221 887"
                  {...register('telefono_whatsapp', {
                    required: 'Requerido',
                    minLength: { value: 7, message: 'Mínimo 7 caracteres' },
                  })}
                />
              </Field>
            )}
          </div>
        </Card>

        {/* Credenciales */}
        <Card title="Credenciales de acceso" className="mt-4">
          <div className="grid grid-cols-1 gap-4 p-1">
            <Field label="Email" required error={errors.email?.message}>
              <Input
                type="email"
                placeholder="juan.garcia@cepre.edu.pe"
                {...register('email', {
                  required: 'Requerido',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                })}
              />
            </Field>
            <p className="text-[11.5px] text-text-mute px-1">
              La contraseña temporal será el <strong>DNI</strong> del usuario. Deberá cambiarla
              en su primer inicio de sesión.
            </p>
          </div>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Btn>
          <Btn type="submit" disabled={isSubmitting || createMut.isPending}>
            {createMut.isPending ? 'Guardando…' : 'Crear usuario'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
