'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateDocente } from '@/hooks/use-docentes'

interface FormValues {
  nombres: string
  apellidos: string
  dni: string
  email: string
  password: string
  telefono: string
  especialidad: string
}

export default function NuevoDocentePage() {
  const router = useRouter()
  const createDocente = useCreateDocente()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    try {
      // La contraseña temporal = DNI (el backend la asigna automáticamente).
      await createDocente.mutateAsync({
        ...values,
        password: undefined,
        email: values.email || undefined, // '' rompería @IsEmail; enviar undefined
        especialidad: values.especialidad || undefined,
      })
      router.push('/docentes')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al crear el docente')
    }
  }

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[680px]">
      <PageHeader
        title="Nuevo docente"
        crumbs={[
          { label: 'Docentes', href: '/docentes' },
          { label: 'Nuevo' },
        ]}
        action={
          <Btn variant="secondary" size="sm" onClick={() => router.back()}>
            Cancelar
          </Btn>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card title="Datos personales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
            <Field label="Nombres" required error={errors.nombres?.message}>
              <Input
                placeholder="Carlos"
                {...register('nombres', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
              />
            </Field>
            <Field label="Apellidos" required error={errors.apellidos?.message}>
              <Input
                placeholder="Ramírez Torres"
                {...register('apellidos', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
              />
            </Field>
            <Field label="DNI" required error={errors.dni?.message}>
              <Input
                placeholder="45678901"
                maxLength={8}
                {...register('dni', {
                  required: 'Requerido',
                  pattern: { value: /^\d{8}$/, message: 'DNI debe tener 8 dígitos' },
                })}
              />
            </Field>
            <Field label="Teléfono WhatsApp" required error={errors.telefono?.message}>
              <Input
                placeholder="+51 987 654 321"
                inputMode="tel"
                {...register('telefono', {
                  required: 'Requerido',
                  minLength: { value: 6, message: 'Teléfono demasiado corto' },
                })}
              />
            </Field>
            <Field label="Especialidad" error={errors.especialidad?.message}>
              <Input placeholder="Matemáticas" {...register('especialidad')} />
            </Field>
          </div>
        </Card>

        <Card title="Acceso al sistema" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
            <Field
              label="Correo institucional"
              hint="Opcional. Si se deja vacío, se genera un correo interno automáticamente."
              error={errors.email?.message}
            >
              <Input
                type="email"
                placeholder="c.ramirez@cepreunasam.edu.pe"
                {...register('email', {
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo no válido' },
                })}
              />
            </Field>
          </div>
          <p className="text-[11.5px] text-text-mute px-1 pb-1 mt-1">
            La contraseña temporal será el <strong>DNI</strong> del docente; deberá cambiarla al ingresar.
            El DNI del docente será su código de asistencia en el lector de barras.
          </p>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={isSubmitting || createDocente.isPending}>
            {createDocente.isPending ? 'Guardando…' : 'Crear docente'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
