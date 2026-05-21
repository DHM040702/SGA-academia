'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAlumno, useUpdateAlumno } from '@/hooks/use-alumnos'
import { useCiclos, useSecciones } from '@/hooks/use-ciclos'

interface FormValues {
  nombres: string
  apellidos: string
  dni: string
  email: string
  fecha_nacimiento: string
  telefono: string
  ciclo_id: string
  seccion_id: string
}

export default function EditarAlumnoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: alumno, isLoading } = useAlumno(id)
  const updateAlumno = useUpdateAlumno()
  const { data: ciclos = [] } = useCiclos()
  const [cicloId, setCicloId] = React.useState('')
  const { data: secciones = [] } = useSecciones(cicloId || undefined)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>()

  React.useEffect(() => {
    if (!alumno) return
    const ciclo = alumno.seccion?.ciclo?.id ?? ''
    setCicloId(ciclo)
    reset({
      nombres: alumno.nombres,
      apellidos: alumno.apellidos,
      dni: alumno.dni,
      email: alumno.usuario.email,
      fecha_nacimiento: alumno.fecha_nacimiento ?? '',
      telefono: alumno.telefono ?? '',
      ciclo_id: ciclo,
      seccion_id: alumno.seccion?.id ?? '',
    })
  }, [alumno, reset])

  const watchCiclo = watch('ciclo_id')
  React.useEffect(() => {
    if (watchCiclo !== cicloId) {
      setCicloId(watchCiclo || '')
      setValue('seccion_id', '')
    }
  }, [watchCiclo, cicloId, setValue])

  async function onSubmit(values: FormValues) {
    const { ciclo_id, email, ...dto } = values
    try {
      await updateAlumno.mutateAsync({
        id,
        ...dto,
        fecha_nacimiento: dto.fecha_nacimiento || undefined,
        telefono: dto.telefono || undefined,
        seccion_id: dto.seccion_id || undefined,
      })
      router.push(`/alumnos/${id}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar los cambios')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-text-mute text-sm">Cargando…</div>
  }

  if (!alumno) {
    return (
      <div className="p-7 text-center">
        <p className="text-danger mb-4">Alumno no encontrado</p>
        <Btn variant="secondary" onClick={() => router.back()}>Volver</Btn>
      </div>
    )
  }

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[680px]">
      <PageHeader
        title="Editar alumno"
        crumbs={[
          { label: 'Alumnos', href: '/alumnos' },
          { label: `${alumno.nombres} ${alumno.apellidos}`, href: `/alumnos/${id}` },
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
                placeholder="Lucía"
                {...register('nombres', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
              />
            </Field>
            <Field label="Apellidos" required error={errors.apellidos?.message}>
              <Input
                placeholder="Mendoza Quiroz"
                {...register('apellidos', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
              />
            </Field>
            <Field label="DNI" required error={errors.dni?.message}>
              <Input
                placeholder="76543210"
                maxLength={8}
                {...register('dni', {
                  required: 'Requerido',
                  pattern: { value: /^\d{8}$/, message: 'DNI debe tener 8 dígitos' },
                })}
              />
            </Field>
            <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
              <Input type="date" {...register('fecha_nacimiento')} />
            </Field>
            <Field label="Teléfono" error={errors.telefono?.message}>
              <Input placeholder="+51 943 221 887" {...register('telefono')} />
            </Field>
          </div>
        </Card>

        <Card title="Acceso al sistema" className="mt-4">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Correo institucional">
              <Input
                type="email"
                value={alumno.usuario.email}
                disabled
                className="opacity-60"
              />
            </Field>
          </div>
        </Card>

        <Card title="Sección" className="mt-4">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Ciclo">
              <select
                {...register('ciclo_id')}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sin asignar</option>
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Sección">
              <select
                {...register('seccion_id')}
                disabled={!cicloId}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">{cicloId ? 'Sin asignar' : 'Elige ciclo primero'}</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={isSubmitting || updateAlumno.isPending || !isDirty}>
            {updateAlumno.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
