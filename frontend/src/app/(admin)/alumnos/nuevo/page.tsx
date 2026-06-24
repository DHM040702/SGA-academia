'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Search, Plus, X, Users } from '@/components/icons'
import { useCreateAlumno } from '@/hooks/use-alumnos'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { useCarreras, type AreaCarrera } from '@/hooks/use-carreras'
import { useSearchApoderados, PARENTESCO_OPTS, type ApoderadoSearchResult } from '@/hooks/use-apoderados'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

interface AlumnoFormValues {
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

interface ApoderadoForm {
  nombre: string
  apellidos: string
  dni: string
  telefono_whatsapp: string
  email: string
  password: string
  parentesco: string
}

const APODERADO_FORM_INIT: ApoderadoForm = {
  nombre: '', apellidos: '', dni: '', telefono_whatsapp: '',
  email: '', password: '', parentesco: 'Padre',
}

export default function NuevoAlumnoPage() {
  const router = useRouter()
  const createAlumno = useCreateAlumno()

  // Ciclo → sección → área
  const { data: ciclos = [] } = useCiclos()
  const [cicloId, setCicloId] = React.useState('')
  const [areaActiva, setAreaActiva] = React.useState<AreaCarrera | undefined>()
  const { data: secciones = [] } = useAulas(cicloId || undefined)
  const { data: carreras = [] } = useCarreras(areaActiva)

  // Apoderado
  const [apModo, setApModo] = React.useState<'ninguno' | 'nuevo' | 'existente'>('ninguno')
  const [apForm, setApForm] = React.useState<ApoderadoForm>(APODERADO_FORM_INIT)
  const [apSearch, setApSearch] = React.useState('')
  const [apSeleccionado, setApSeleccionado] = React.useState<ApoderadoSearchResult | null>(null)
  const [apParentesco, setApParentesco] = React.useState('Padre')
  const { data: apResultados } = useSearchApoderados(apSearch)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AlumnoFormValues>({ defaultValues: { password: 'Temporal1234!' } })

  const watchCiclo = watch('ciclo_id')
  React.useEffect(() => {
    setCicloId(watchCiclo || '')
    setValue('aula_id', '')
    setValue('carrera_id', '')
    setAreaActiva(undefined)
  }, [watchCiclo, setValue])

  const watchSeccion = watch('aula_id')
  const aulaSeleccionada = secciones.find((s) => s.id === watchSeccion)
  React.useEffect(() => {
    setAreaActiva(aulaSeleccionada?.area as AreaCarrera | undefined)
    setValue('carrera_id', '')
  }, [watchSeccion, secciones, setValue])

  function apCampo(campo: keyof ApoderadoForm, valor: string) {
    setApForm((f) => ({ ...f, [campo]: valor }))
  }

  async function onSubmit(values: AlumnoFormValues) {
    const { ciclo_id, ...dto } = values
    // La contraseña temporal = DNI (el backend la asigna automáticamente).
    const payload: Record<string, unknown> = {
      ...dto,
      password:         undefined,
      fecha_nacimiento: dto.fecha_nacimiento || undefined,
      telefono:         dto.telefono         || undefined,
      aula_id:          dto.aula_id          || undefined,
      carrera_id:       dto.carrera_id       || undefined,
    }

    if (apModo === 'nuevo') {
      if (!apForm.nombre || !apForm.apellidos || !apForm.dni || !apForm.telefono_whatsapp || !apForm.email) {
        alert('Completa todos los datos del apoderado o selecciona "Sin apoderado".')
        return
      }
      payload.apoderado = {
        accion: 'nuevo',
        nuevo: {
          nombre:            apForm.nombre,
          apellidos:         apForm.apellidos,
          dni:               apForm.dni,
          telefono_whatsapp: apForm.telefono_whatsapp,
          email:             apForm.email,
          password:          apForm.dni, // contraseña temporal = DNI
        },
        parentesco:   apForm.parentesco,
        es_principal: true,
      }
    } else if (apModo === 'existente') {
      if (!apSeleccionado) {
        alert('Selecciona un apoderado de la lista o elige "Sin apoderado".')
        return
      }
      payload.apoderado = {
        accion:       'existente',
        apoderado_id: apSeleccionado.apoderado?.id,
        parentesco:   apParentesco,
        es_principal: true,
      }
    }

    try {
      await createAlumno.mutateAsync(payload as any)
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
        action={<Btn variant="secondary" size="sm" onClick={() => router.back()}>Cancelar</Btn>}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Datos personales */}
        <Card title="Datos personales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
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
                inputMode="numeric"
                maxLength={8}
                {...register('dni', {
                  required: 'Requerido',
                  pattern: { value: /^\d{8}$/, message: 'DNI debe tener 8 dígitos' },
                  onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, '') },
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

        {/* Acceso */}
        <Card title="Acceso al sistema" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
            <Field label="Correo institucional" required error={errors.email?.message}>
              <Input
                type="email"
                placeholder="lucia.mendoza@cepreunasam.edu.pe"
                {...register('email', { required: 'Requerido' })}
              />
            </Field>
            <p className="text-[11.5px] text-text-mute px-1">
              La contraseña temporal será el <strong>DNI</strong> del alumno; deberá cambiarla al ingresar.
            </p>
          </div>
        </Card>

        {/* Aula y carrera */}
        <Card title="Aula y carrera" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
            <Field label="Ciclo">
              <select {...register('ciclo_id')} className={SELECT_CLS}>
                <option value="">Sin asignar</option>
                {ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Aula">
              <select {...register('aula_id')} disabled={!cicloId} className={SELECT_CLS}>
                <option value="">{cicloId ? 'Sin asignar' : 'Elige ciclo primero'}</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre} — {s.turno === 'manana' ? 'Mañana' : 'Tarde'}</option>
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
                {carreras.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        {/* ── Apoderado ──────────────────────────────────────────────── */}
        <Card title="Apoderado" className="mt-4">
          {/* Selector de modo */}
          <div className="flex gap-2 p-1 mb-4">
            {(['ninguno', 'nuevo', 'existente'] as const).map((modo) => (
              <button
                key={modo}
                type="button"
                onClick={() => { setApModo(modo); setApSeleccionado(null); setApSearch('') }}
                className={[
                  'px-3 py-1.5 rounded-2 text-[12.5px] font-medium border transition-colors',
                  apModo === modo
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border text-text-mute hover:text-text',
                ].join(' ')}
              >
                {modo === 'ninguno'   && 'Sin apoderado por ahora'}
                {modo === 'nuevo'     && 'Crear nuevo apoderado'}
                {modo === 'existente' && 'Apoderado ya registrado'}
              </button>
            ))}
          </div>

          {/* Formulario nuevo apoderado */}
          {apModo === 'nuevo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
              <Field label="Nombres" required>
                <Input
                  placeholder="Carlos"
                  value={apForm.nombre}
                  onChange={(e) => apCampo('nombre', e.target.value)}
                />
              </Field>
              <Field label="Apellidos" required>
                <Input
                  placeholder="García Mendoza"
                  value={apForm.apellidos}
                  onChange={(e) => apCampo('apellidos', e.target.value)}
                />
              </Field>
              <Field label="DNI" required>
                <Input
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={8}
                  value={apForm.dni}
                  onChange={(e) => apCampo('dni', e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Field label="Teléfono WhatsApp" required>
                <Input
                  placeholder="+51 943 221 887"
                  value={apForm.telefono_whatsapp}
                  onChange={(e) => apCampo('telefono_whatsapp', e.target.value)}
                />
              </Field>
              <Field label="Email de acceso" required>
                <Input
                  type="email"
                  placeholder="carlos.garcia@gmail.com"
                  value={apForm.email}
                  onChange={(e) => apCampo('email', e.target.value)}
                />
              </Field>
              <Field label="Parentesco" required>
                <select
                  value={apForm.parentesco}
                  onChange={(e) => apCampo('parentesco', e.target.value)}
                  className={SELECT_CLS}
                >
                  {PARENTESCO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Buscar apoderado existente */}
          {apModo === 'existente' && (
            <div className="p-1 flex flex-col gap-3">
              {/* Seleccionado */}
              {apSeleccionado ? (
                <div className="flex items-center justify-between p-3 bg-primary-light border border-primary/30 rounded-2">
                  <div>
                    <p className="font-medium text-[13px] text-text">
                      {apSeleccionado.apoderado?.nombre ?? apSeleccionado.nombre}{' '}
                      {apSeleccionado.apoderado?.apellidos ?? apSeleccionado.apellidos}
                    </p>
                    <p className="text-[11.5px] text-text-mute">
                      DNI {apSeleccionado.apoderado ? apSeleccionado.dni : apSeleccionado.dni} · {apSeleccionado.email}
                    </p>
                  </div>
                  <Btn
                    variant="ghost" size="sm"
                    icon={<X size={13} />}
                    onClick={() => setApSeleccionado(null)}
                  />
                </div>
              ) : (
                <>
                  {/* Buscador */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, apellidos o DNI…"
                      value={apSearch}
                      onChange={(e) => setApSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Resultados */}
                  {apSearch.trim().length >= 2 && (
                    <div className="border border-border rounded-2 bg-surface overflow-hidden">
                      {(apResultados?.data ?? []).length === 0 ? (
                        <p className="px-3 py-2.5 text-[12.5px] text-text-mute">Sin resultados</p>
                      ) : (apResultados?.data ?? []).map((ap) => (
                        <button
                          key={ap.id}
                          type="button"
                          onClick={() => { setApSeleccionado(ap); setApSearch('') }}
                          className="w-full text-left px-3 py-2.5 hover:bg-surface2 border-b border-border last:border-0 transition-colors"
                        >
                          <p className="text-[13px] font-medium text-text">
                            {ap.apoderado?.nombre ?? ap.nombre} {ap.apoderado?.apellidos ?? ap.apellidos}
                          </p>
                          <p className="text-[11.5px] text-text-mute">DNI {ap.dni} · {ap.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Parentesco */}
              <Field label="Parentesco" required>
                <select
                  value={apParentesco}
                  onChange={(e) => setApParentesco(e.target.value)}
                  className={SELECT_CLS}
                >
                  {PARENTESCO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
          )}

          {apModo === 'ninguno' && (
            <p className="px-1 pb-1 text-[12.5px] text-text-mute">
              Podrás vincular un apoderado desde el perfil del alumno una vez creado.
            </p>
          )}
        </Card>

        <div className="flex justify-end gap-2.5 mt-5">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Btn>
          <Btn type="submit" disabled={isSubmitting || createAlumno.isPending}>
            {createAlumno.isPending ? 'Guardando…' : 'Crear alumno'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
