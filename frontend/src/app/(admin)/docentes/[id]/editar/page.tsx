'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useDocente, useUpdateDocente } from '@/hooks/use-docentes'

interface FormValues {
  nombres: string
  apellidos: string
  dni: string
  telefono: string
  especialidad: string
}

export default function EditarDocentePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: docente, isLoading } = useDocente(id)
  const updateDocente = useUpdateDocente()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>()

  React.useEffect(() => {
    if (!docente) return
    reset({
      nombres: docente.nombre,
      apellidos: docente.apellidos,
      dni: docente.dni,
      telefono: docente.telefonoWhatsapp ?? '',
      especialidad: docente.especialidad ?? '',
    })
  }, [docente, reset])

  async function onSubmit(values: FormValues) {
    try {
      await updateDocente.mutateAsync({
        id,
        nombres: values.nombres,
        apellidos: values.apellidos,
        dni: values.dni,
        telefono: values.telefono || undefined,
        especialidad: values.especialidad || undefined,
      })
      router.push(`/docentes/${id}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar los cambios')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-text-mute text-sm">Cargando…</div>
  }

  if (!docente) {
    return (
      <div className="p-7 text-center">
        <p className="text-danger mb-4">Docente no encontrado</p>
        <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
      </div>
    )
  }

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[680px]">
      <PageHeader
        title="Editar docente"
        crumbs={[
          { label: 'Docentes', href: '/docentes' },
          { label: `${docente.nombre} ${docente.apellidos}`, href: `/docentes/${id}` },
          { label: 'Editar' },
        ]}
        action={
          <Btn variant="secondary" size="sm" onClick={() => router.back()}>
            Cancelar
          </Btn>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card title="Datos personales">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Nombres" required error={errors.nombres?.message}>
              <Input
                {...register('nombres', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
              />
            </Field>
            <Field label="Apellidos" required error={errors.apellidos?.message}>
              <Input
                {...register('apellidos', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
              />
            </Field>
            <Field label="DNI" required error={errors.dni?.message}>
              <Input
                maxLength={8}
                {...register('dni', {
                  required: 'Requerido',
                  pattern: { value: /^\d{8}$/, message: 'DNI debe tener 8 dígitos' },
                })}
              />
            </Field>
            <Field label="Teléfono WhatsApp" error={errors.telefono?.message}>
              <Input placeholder="+51 987 654 321" {...register('telefono')} />
            </Field>
            <Field label="Especialidad" error={errors.especialidad?.message}>
              <Input placeholder="Matemáticas" {...register('especialidad')} />
            </Field>
          </div>
        </Card>

        <Card title="Acceso al sistema" className="mt-4">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Correo institucional">
              <Input type="email" value={docente.usuario.email} disabled className="opacity-60" />
            </Field>
          </div>
          <p className="text-[11.5px] text-text-mute px-1 pb-1 mt-1">
            Para cambiar el email o la contraseña, usa la gestión de usuarios.
          </p>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={isSubmitting || updateDocente.isPending || !isDirty}>
            {updateDocente.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
