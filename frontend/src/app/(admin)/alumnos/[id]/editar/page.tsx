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
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { useCarreras, type AreaCarrera } from '@/hooks/use-carreras'
import {
  useApoderadosByAlumno,
  useVincularApoderado,
  useDesvincularApoderado,
  useSearchApoderados,
  PARENTESCO_OPTS,
  type ApoderadoSearchResult,
} from '@/hooks/use-apoderados'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

interface FormValues {
  nombres: string
  apellidos: string
  dni: string
  fecha_nacimiento: string
  telefono: string
  ciclo_id: string
  aula_id: string
  carrera_id: string
}

export default function EditarAlumnoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: alumno, isLoading } = useAlumno(id)
  const updateAlumno = useUpdateAlumno()
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
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>()

  // Pre-rellenar con datos existentes
  React.useEffect(() => {
    if (!alumno) return
    const ciclo = alumno.aula?.ciclo?.id ?? ''
    const area = alumno.aula?.area as AreaCarrera | undefined
    setCicloId(ciclo)
    setAreaActiva(area)
    reset({
      nombres:          alumno.nombres,
      apellidos:        alumno.apellidos,
      dni:              alumno.dni,
      fecha_nacimiento: alumno.fecha_nacimiento ?? '',
      telefono:         alumno.telefono ?? '',
      ciclo_id:         ciclo,
      aula_id:          alumno.aula?.id ?? '',
      carrera_id:       alumno.carrera?.id ?? '',
    })
  }, [alumno, reset])

  // Cascada ciclo → limpiar sección y carrera
  const watchCiclo = watch('ciclo_id')
  React.useEffect(() => {
    if (watchCiclo !== cicloId) {
      setCicloId(watchCiclo || '')
      setValue('aula_id', '')
      setValue('carrera_id', '')
      setAreaActiva(undefined)
    }
  }, [watchCiclo, cicloId, setValue])

  // Cascada sección → área → carreras
  const watchSeccion = watch('aula_id')
  const aulaSeleccionada = secciones.find((s) => s.id === watchSeccion)
  React.useEffect(() => {
    if (aulaSeleccionada) {
      setAreaActiva(aulaSeleccionada.area as AreaCarrera)
      const currentCarreraArea = alumno?.carrera?.area
      if (aulaSeleccionada.area !== currentCarreraArea) setValue('carrera_id', '')
    }
  }, [watchSeccion, secciones, alumno, setValue])

  async function onSubmit(values: FormValues) {
    const { ciclo_id, ...dto } = values
    try {
      await updateAlumno.mutateAsync({
        id,
        ...dto,
        fecha_nacimiento: dto.fecha_nacimiento || undefined,
        telefono:         dto.telefono || undefined,
        aula_id:          dto.aula_id || undefined,
        carrera_id:       dto.carrera_id || undefined,
      })
      router.push(`/alumnos/${id}`)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar los cambios')
    }
  }

  // ── Apoderados vinculados ─────────────────────────────────────────
  const { data: apoderados = [], isLoading: apLoading } = useApoderadosByAlumno(id)
  const vincularAp  = useVincularApoderado(id)
  const desvincularAp = useDesvincularApoderado(id)

  const [showAddAp,    setShowAddAp]    = React.useState(false)
  const [apModo,       setApModo]       = React.useState<'existente' | 'nuevo'>('existente')
  const [apSearchQ,    setApSearchQ]    = React.useState('')
  const [apSeleccionado, setApSeleccionado] = React.useState<ApoderadoSearchResult | null>(null)
  const [apParentesco, setApParentesco] = React.useState<string>(PARENTESCO_OPTS[0])
  // Campos nuevo apoderado
  const [apNombre,    setApNombre]    = React.useState('')
  const [apApellidos, setApApellidos] = React.useState('')
  const [apDni,       setApDni]       = React.useState('')
  const [apTelefono,  setApTelefono]  = React.useState('')
  const [apEmail,     setApEmail]     = React.useState('')
  const [apPassword,  setApPassword]  = React.useState('')

  const { data: apSearchData } = useSearchApoderados(apSearchQ)
  const apResultados = apSearchData?.data ?? []

  function resetAddPanel() {
    setShowAddAp(false)
    setApModo('existente')
    setApSearchQ('')
    setApSeleccionado(null)
    setApParentesco(PARENTESCO_OPTS[0])
    setApNombre(''); setApApellidos(''); setApDni(''); setApTelefono(''); setApEmail(''); setApPassword('')
  }

  async function handleVincular() {
    if (!apParentesco) { alert('Selecciona el parentesco'); return }
    const dto: Record<string, unknown> = { parentesco: apParentesco, es_principal: false }

    if (apModo === 'existente') {
      if (!apSeleccionado) { alert('Selecciona un apoderado de la búsqueda'); return }
      const apId = apSeleccionado.apoderado?.id
      if (!apId) { alert('El usuario seleccionado no tiene perfil de apoderado'); return }
      dto.accion = 'existente'
      dto.apoderado_id = apId
    } else {
      if (!apNombre || !apApellidos || !apDni || !apTelefono || !apEmail || !apPassword) {
        alert('Completa todos los datos del nuevo apoderado')
        return
      }
      dto.accion = 'nuevo'
      dto.nuevo = {
        nombre:           apNombre,
        apellidos:        apApellidos,
        dni:              apDni,
        telefono_whatsapp: apTelefono,
        email:            apEmail,
        password:         apPassword,
      }
    }

    try {
      await vincularAp.mutateAsync(dto)
      resetAddPanel()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al vincular')
    }
  }

  async function handleDesvincular(apoderadoId: string, nombre: string) {
    if (!confirm(`¿Desvincular a ${nombre} de este alumno?`)) return
    try {
      await desvincularAp.mutateAsync(apoderadoId)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al desvincular')
    }
  }

  // ─────────────────────────────────────────────────────────────────

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
          <p className="text-[11.5px] text-text-mute px-1 pb-1 mt-1">
            Para cambiar el email o la contraseña, usa la gestión de usuarios.
          </p>
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
          <Btn type="submit" disabled={isSubmitting || updateAlumno.isPending || !isDirty}>
            {updateAlumno.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </div>
      </form>

      {/* ── Apoderados vinculados (sección separada del form principal) ── */}
      <Card title="Apoderados vinculados">
        {/* Lista actual */}
        {apLoading ? (
          <p className="p-3 text-sm text-text-mute">Cargando apoderados…</p>
        ) : apoderados.length === 0 ? (
          <p className="px-3 py-2.5 text-[13px] text-text-mute">Sin apoderados vinculados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {apoderados.map((av) => (
              <li key={av.apoderadoId} className="flex items-center justify-between py-2.5 px-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-text">
                      {av.apoderado.nombre} {av.apoderado.apellidos}
                    </span>
                    {av.esPrincipal && (
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-text-mute mt-0.5 truncate">
                    {av.parentesco}
                    <span className="mx-1">·</span>
                    {av.apoderado.usuario.email}
                    {av.apoderado.dni && (
                      <><span className="mx-1">·</span>DNI {av.apoderado.dni}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleDesvincular(
                      av.apoderadoId,
                      `${av.apoderado.nombre} ${av.apoderado.apellidos}`,
                    )
                  }
                  disabled={desvincularAp.isPending}
                  className="ml-4 shrink-0 text-[12px] text-danger hover:underline disabled:opacity-40"
                >
                  Desvincular
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Panel "Agregar apoderado" */}
        {!showAddAp ? (
          <div className="px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowAddAp(true)}
              className="text-[13px] text-primary hover:underline font-medium"
            >
              + Agregar apoderado
            </button>
          </div>
        ) : (
          <div className="border-t border-border p-3 space-y-3">
            {/* Selector de modo */}
            <div className="flex gap-1.5">
              {(['existente', 'nuevo'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setApModo(m)}
                  className={`px-3 py-1 text-[12px] rounded font-medium transition-colors ${
                    apModo === m
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-mute hover:text-text'
                  }`}
                >
                  {m === 'existente' ? 'Apoderado existente' : 'Nuevo apoderado'}
                </button>
              ))}
            </div>

            {/* ── Modo existente ── */}
            {apModo === 'existente' && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Buscar por nombre, apellidos o DNI…"
                    value={apSearchQ}
                    onChange={(e) => {
                      setApSearchQ(e.target.value)
                      setApSeleccionado(null)
                    }}
                  />
                  {apResultados.length > 0 && !apSeleccionado && (
                    <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-lg max-h-44 overflow-y-auto">
                      {apResultados.map((r) => (
                        <li
                          key={r.id}
                          className="px-3 py-2 text-[13px] cursor-pointer hover:bg-surface-alt"
                          onClick={() => {
                            setApSeleccionado(r)
                            setApSearchQ('')
                          }}
                        >
                          <span className="font-medium">
                            {r.apoderado?.nombre ?? r.nombre}{' '}
                            {r.apoderado?.apellidos ?? r.apellidos}
                          </span>
                          {r.dni && (
                            <span className="ml-2 text-text-mute text-[11.5px]">
                              DNI {r.dni}
                            </span>
                          )}
                          <span className="ml-2 text-text-mute text-[11.5px]">{r.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {apSeleccionado && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-text">
                        {apSeleccionado.apoderado?.nombre ?? apSeleccionado.nombre}{' '}
                        {apSeleccionado.apoderado?.apellidos ?? apSeleccionado.apellidos}
                      </span>
                      <span className="ml-2 text-[11.5px] text-text-mute">
                        {apSeleccionado.email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApSeleccionado(null)}
                      className="shrink-0 text-text-mute hover:text-text text-[12px] leading-none"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Modo nuevo ── */}
            {apModo === 'nuevo' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombres" required>
                  <Input
                    placeholder="Juan Carlos"
                    value={apNombre}
                    onChange={(e) => setApNombre(e.target.value)}
                  />
                </Field>
                <Field label="Apellidos" required>
                  <Input
                    placeholder="García Méndez"
                    value={apApellidos}
                    onChange={(e) => setApApellidos(e.target.value)}
                  />
                </Field>
                <Field label="DNI" required>
                  <Input
                    placeholder="12345678"
                    inputMode="numeric"
                    maxLength={8}
                    value={apDni}
                    onChange={(e) => setApDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  />
                </Field>
                <Field label="Teléfono WhatsApp" required>
                  <Input
                    placeholder="+51 943 221 887"
                    value={apTelefono}
                    onChange={(e) => setApTelefono(e.target.value)}
                  />
                </Field>
                <Field label="Email de acceso" required>
                  <Input
                    type="email"
                    placeholder="juan@correo.com"
                    value={apEmail}
                    onChange={(e) => setApEmail(e.target.value)}
                  />
                </Field>
                <Field label="Contraseña" required>
                  <Input
                    type="text"
                    placeholder="Mínimo 8 caracteres"
                    value={apPassword}
                    onChange={(e) => setApPassword(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* Parentesco + botones */}
            <div className="flex items-end gap-3 pt-1">
              <Field label="Parentesco" required className="flex-1">
                <select
                  value={apParentesco}
                  onChange={(e) => setApParentesco(e.target.value)}
                  className={SELECT_CLS}
                >
                  {PARENTESCO_OPTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2 pb-px">
                <Btn variant="secondary" size="sm" type="button" onClick={resetAddPanel}>
                  Cancelar
                </Btn>
                <Btn
                  size="sm"
                  type="button"
                  onClick={handleVincular}
                  disabled={vincularAp.isPending}
                >
                  {vincularAp.isPending ? 'Vinculando…' : 'Vincular'}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
