'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateAlumno } from '@/hooks/use-alumnos'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { useCarreras, type AreaCarrera } from '@/hooks/use-carreras'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

interface FormValues {
  nombres: string
  apellidos: string
  dni: string
  email: string
  password: string
  fecha_nacimiento: string
  telefono: string
  ciclo_id: string
  aula_id: string
  carrera_id: string
}

export default function NuevoAlumnoPage() {
  const router = useRouter()
  const createAlumno = useCreateAlumno()
  const { data: ciclos = [] } = useCiclos()

  const [cicloId, setCicloId] = React.useState('')
  const [areaActiva, setAreaActiva] = React.useState<AreaCarrera | undefined>()

  const { data: secciones = [] } = useAulas(cicloId || undefined)
  const { data: carreras = [] } = useCarreras(areaActiva)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { password: 'Temporal1234!' } })

  // Cascada ciclo → sección
  const watchCiclo = watch('ciclo_id')
  React.useEffect(() => {
    setCicloId(watchCiclo || '')
    setValue('aula_id', '')
    setValue('carrera_id', '')
    setAreaActiva(undefined)
  }, [watchCiclo, setValue])

  // Cascada sección → área → carreras
  const watchSeccion = watch('aula_id')
  const aulaSeleccionada = secciones.find((s) => s.id === watchSeccion)
  React.useEffect(() => {
    setAreaActiva(aulaSeleccionada?.area as AreaCarrera | undefined)
    setValue('carrera_id', '')
  }, [watchSeccion, secciones, setValue])

  async function onSubmit(values: FormValues) {
    const { ciclo_id, ...dto } = values
    try {
      await createAlumno.mutateAsync({
        ...dto,
        fecha_nacimiento: dto.fecha_nacimiento || undefined,
        telefono: dto.telefono || undefined,
        aula_id: dto.aula_id || undefined,
        carrera_id: dto.carrera_id || undefined,
      })
      router.push('/alumnos')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al crear el alumno')
    }
  }

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[680px]">
      <PageHeader
        title="Nuevo alumno"
        crumbs={[{ label: 'Alumnos', href: '/alumnos' }, { label: 'Nuevo' }]}
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
            <Field label="Correo institucional" required error={errors.email?.message}>
              <Input
                type="email"
                placeholder="lucia.mendoza@cepreunasam.edu.pe"
                {...register('email', { required: 'Requerido' })}
              />
            </Field>
            <Field label="Contraseña inicial" required error={errors.password?.message}>
              <Input
                type="text"
                {...register('password', { required: 'Requerido', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Aula y carrera" className="mt-4">
          <div className="grid grid-cols-2 gap-4 p-1">
            <Field label="Ciclo">
              <select {...register('ciclo_id')} className={SELECT_CLS}>
                <option value="">Sin asignar</option>
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Aula">
              <select {...register('aula_id')} disabled={!cicloId} className={SELECT_CLS}>
                <option value="">{cicloId ? 'Sin asignar' : 'Elige ciclo primero'}</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} — {s.turno === 'manana' ? 'Mañana' : 'Tarde'}
                  </option>
                ))}
              </select>
              {aulaSeleccionada && (
                <p className="mt-1 text-[11.5px] text-text-mute">
                  Turno: <strong>{aulaSeleccionada.turno === 'manana' ? 'Mañana' : 'Tarde'}</strong>
                </p>
              )}
            </Field>
            <Field label="Carrera profesional" className="col-span-2">
              <select {...register('carrera_id')} disabled={!areaActiva} className={SELECT_CLS}>
                <option value="">{areaActiva ? 'Sin asignar' : 'Elige sección primero'}</option>
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={isSubmitting || createAlumno.isPending}>
            {createAlumno.isPending ? 'Guardando…' : 'Crear alumno'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
