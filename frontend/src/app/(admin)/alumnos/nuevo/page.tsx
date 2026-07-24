'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Search, X, CreditCard, UserCheck, Lock, Layers, Users, Check } from '@/components/icons'
import { useCreateAlumno, useUpdateAlumno } from '@/hooks/use-alumnos'
import api from '@/lib/api'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { useCarreras, type AreaCarrera } from '@/hooks/use-carreras'
import { useSearchApoderados, PARENTESCO_OPTS, type ApoderadoSearchResult } from '@/hooks/use-apoderados'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

const AREA_LABEL: Record<string, string> = {
  ciencias: 'Ciencias',
  letras:   'Letras',
  medicas:  'Médicas',
}
const AREAS: AreaCarrera[] = ['ciencias', 'letras', 'medicas']

/** Título de sección con ícono (Card acepta ReactNode en title). */
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-2 bg-primary/10 text-primary">{icon}</span>
      {children}
    </span>
  )
}

interface AlumnoFormValues {
  nombres: string
  apellidos: string
  dni: string
  codigo: string
  genero: string
  email: string
  password: string
  fecha_nacimiento: string
  telefono: string
  colegio: string
  quinto: string
  ciclo_id: string
  aula_id: string
  carrera_id: string
}

/** Apoderado ya vinculado al alumno hallado por DNI. */
interface ApoderadoVinculado {
  id: string
  nombre: string
  apellidos: string
  dni: string
  email: string
  parentesco: string
  es_principal: boolean
}

/** Alumno hallado por DNI (para autocompletar). */
interface AlumnoExistente {
  id: string
  activo: boolean
  aula?: { nombre: string; ciclo?: { nombre: string } | null } | null
  apoderados: ApoderadoVinculado[]
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
  const updateAlumno = useUpdateAlumno()

  // Alumno hallado por DNI (si existe, al guardar se ACTUALIZA en vez de crear).
  const [existente, setExistente] = React.useState<AlumnoExistente | null>(null)
  const [buscando, setBuscando] = React.useState(false)

  // Ciclo → sección → área
  const { data: ciclos = [] } = useCiclos()
  const [cicloId, setCicloId] = React.useState('')
  const [areaActiva, setAreaActiva] = React.useState<AreaCarrera | undefined>()
  const { data: secciones = [] } = useAulas(cicloId || undefined)
  // Se cargan TODAS las carreras y se agrupan por área en el selector: así el
  // área del aula solo prioriza su grupo (no bloquea las demás áreas, p. ej.
  // si un aula quedó guardada con el área equivocada).
  const { data: carreras = [] } = useCarreras()

  // Grupos de carreras por área, con el área del aula seleccionada primero.
  const gruposCarreras = React.useMemo(() => {
    const orden = areaActiva
      ? [areaActiva, ...AREAS.filter((a) => a !== areaActiva)]
      : AREAS
    return orden
      .map((a) => ({ area: a, items: carreras.filter((c) => c.area === a) }))
      .filter((g) => g.items.length > 0)
  }, [carreras, areaActiva])

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

  // Al editar el DNI se limpia cualquier resultado previo de búsqueda.
  const watchDni = watch('dni')
  React.useEffect(() => { setExistente(null) }, [watchDni])

  /** Busca el DNI; si el alumno existe, jala sus datos al formulario. */
  async function buscarDni() {
    const dni = (watchDni || '').replace(/\D/g, '')
    if (dni.length !== 8) { alert('Ingresa un DNI de 8 dígitos para buscar.'); return }
    setBuscando(true)
    try {
      const { data } = await api.get('/alumnos/buscar-por-dni', { params: { dni } })
      if (!data?.encontrado) {
        setExistente(null)
        alert('DNI no registrado: es un alumno nuevo. Completa sus datos.')
        return
      }
      const a = data.alumno
      setValue('nombres', a.nombres || '')
      setValue('apellidos', a.apellidos || '')
      setValue('codigo', a.codigo || '')
      setValue('genero', a.genero || '')
      setValue('telefono', a.telefono || '')
      setValue('email', a.email || '')
      setValue('colegio', a.colegio || '')
      setValue('quinto', a.quinto === true ? 'si' : a.quinto === false ? 'no' : '')
      setValue('fecha_nacimiento', a.fecha_nacimiento || '')
      setExistente({ id: a.id, activo: data.activo, aula: a.aula, apoderados: a.apoderados ?? [] })
      // Al re-matricular partimos "sin apoderado": los actuales se muestran y solo
      // se agrega uno si el usuario lo elige explícitamente.
      setApModo('ninguno'); setApSeleccionado(null); setApSearch('')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo buscar el DNI.')
    } finally {
      setBuscando(false)
    }
  }

  /** Construye el bloque `apoderado` del payload (o null). Devuelve `false` si
   *  el usuario eligió agregar uno pero faltan datos (se avisa y se aborta). */
  function construirApoderado(): Record<string, unknown> | null | false {
    if (apModo === 'nuevo') {
      if (!apForm.nombre || !apForm.apellidos || !apForm.dni || !apForm.telefono_whatsapp) {
        alert('Completa nombres, apellidos, DNI y teléfono del apoderado (el correo es opcional).')
        return false
      }
      return {
        accion: 'nuevo',
        nuevo: {
          nombre:            apForm.nombre,
          apellidos:         apForm.apellidos,
          dni:               apForm.dni,
          telefono_whatsapp: apForm.telefono_whatsapp,
          email:             apForm.email || undefined,
          password:          apForm.dni, // contraseña temporal = DNI
        },
        parentesco:   apForm.parentesco,
        es_principal: true,
      }
    }
    if (apModo === 'existente') {
      if (!apSeleccionado) {
        alert('Selecciona un apoderado de la lista o elige "Sin apoderado".')
        return false
      }
      return {
        accion:       'existente',
        apoderado_id: apSeleccionado.apoderado?.id,
        parentesco:   apParentesco,
        es_principal: true,
      }
    }
    return null
  }

  async function onSubmit(values: AlumnoFormValues) {
    const { ciclo_id, codigo, ...dto } = values
    const payload: Record<string, unknown> = {
      ...dto,
      codigo:           codigo || undefined,
      password:         undefined, // la contraseña temporal la asigna el backend (= DNI)
      email:            dto.email || undefined, // '' rompería @IsEmail; enviar undefined
      genero:           dto.genero || undefined,
      fecha_nacimiento: dto.fecha_nacimiento || undefined,
      colegio:          dto.colegio || undefined,
      quinto:           dto.quinto === 'si' ? true : dto.quinto === 'no' ? false : undefined,
      aula_id:          dto.aula_id    || undefined,
      carrera_id:       dto.carrera_id || undefined,
    }

    const apoderado = construirApoderado()
    if (apoderado === false) return // faltan datos del apoderado
    if (apoderado) payload.apoderado = apoderado

    // Si el DNI ya existía, se ACTUALIZA / re-matricula (evita duplicar y el
    // choque de DNI único). El apoderado se vincula si se agregó uno.
    if (existente) {
      try {
        await updateAlumno.mutateAsync({ id: existente.id, ...payload })
        router.push('/alumnos')
      } catch (err: any) {
        alert(err?.response?.data?.message ?? 'Error al actualizar el alumno')
      }
      return
    }

    try {
      await createAlumno.mutateAsync(payload as any)
      router.push('/alumnos')
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al crear el alumno')
    }
  }

  const guardando = createAlumno.isPending || updateAlumno.isPending

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[820px]">
      <PageHeader
        title={existente ? 'Actualizar alumno' : 'Nuevo alumno'}
        crumbs={[{ label: 'Alumnos', href: '/alumnos' }, { label: 'Nuevo' }]}
        action={<Btn variant="secondary" size="sm" onClick={() => router.back()}>Cancelar</Btn>}
      />

      <p className="text-[12.5px] text-text-mute -mt-1">
        Los campos con <span className="text-danger">*</span> son obligatorios. El correo es opcional
        (si se omite, se genera uno interno automáticamente).
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Identificación: DNI (con búsqueda) + código */}
        <Card
          title={<SectionTitle icon={<CreditCard size={15} />}>Identificación</SectionTitle>}
          subtitle="Ingresa el DNI y pulsa Buscar: si el alumno ya existe, se cargan sus datos."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="DNI" required error={errors.dni?.message}>
              <div className="flex gap-2">
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
                <Btn
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={buscando}
                  onClick={buscarDni}
                  className="shrink-0"
                >
                  <Search size={14} />{buscando ? 'Buscando…' : 'Buscar'}
                </Btn>
              </div>
            </Field>
            <Field label="Código" hint="Código de barras de 6 dígitos. Se autogenera si se deja vacío." error={errors.codigo?.message}>
              <Input
                placeholder="Autogenerado si se deja vacío"
                inputMode="numeric"
                maxLength={6}
                {...register('codigo', {
                  pattern: { value: /^\d{6}$/, message: 'El código debe tener 6 dígitos' },
                  onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, '') },
                })}
              />
            </Field>
          </div>

          {existente && (
            <div
              className={[
                'mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-2 text-[12.5px] border',
                existente.activo
                  ? 'bg-warning-light/40 border-warning-light text-text'
                  : 'bg-primary/5 border-primary/20 text-text',
              ].join(' ')}
            >
              <Search size={14} className="mt-0.5 flex-shrink-0 text-primary" />
              <div>
                {existente.activo ? (
                  <>Este alumno <strong>ya está registrado</strong>{existente.aula ? <> (aula {existente.aula.nombre}{existente.aula.ciclo ? ` · ${existente.aula.ciclo.nombre}` : ''})</> : ''}. Al guardar se <strong>actualizarán sus datos y su matrícula</strong> (no se crea un duplicado).</>
                ) : (
                  <>Este alumno fue <strong>dado de baja</strong>. Al guardar se <strong>reactivará y re-matriculará</strong> con los datos de este formulario.</>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Datos personales */}
        <Card title={<SectionTitle icon={<UserCheck size={15} />}>Datos personales</SectionTitle>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Field label="Género" error={errors.genero?.message}>
              <select {...register('genero')} className={SELECT_CLS}>
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </Field>
            <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
              <Input type="date" {...register('fecha_nacimiento')} />
            </Field>
            <Field label="Teléfono" required error={errors.telefono?.message}>
              <Input
                placeholder="+51 943 221 887"
                inputMode="tel"
                {...register('telefono', {
                  required: 'Requerido',
                  minLength: { value: 6, message: 'Teléfono demasiado corto' },
                })}
              />
            </Field>
            <Field label="¿Culminó 5.º de secundaria?" error={errors.quinto?.message}>
              <select {...register('quinto')} className={SELECT_CLS}>
                <option value="">Sin especificar</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </Field>
            <Field label="Colegio de procedencia" className="sm:col-span-2" error={errors.colegio?.message}>
              <Input placeholder="I.E. José Carlos Mariátegui" {...register('colegio')} />
            </Field>
          </div>
        </Card>

        {/* Acceso */}
        <Card title={<SectionTitle icon={<Lock size={15} />}>Acceso al sistema</SectionTitle>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Correo institucional"
              hint="Opcional. Si se deja vacío, se genera un correo interno automáticamente."
              error={errors.email?.message}
            >
              <Input
                type="email"
                placeholder="lucia.mendoza@cepreunasam.edu.pe"
                {...register('email', {
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo no válido' },
                })}
              />
            </Field>
            <div className="flex items-center">
              <p className="text-[11.5px] text-text-mute rounded-2 bg-surface2 border border-border px-3 py-2.5">
                La contraseña temporal será el <strong>DNI</strong> del alumno; deberá cambiarla al ingresar.
              </p>
            </div>
          </div>
        </Card>

        {/* Aula y carrera */}
        <Card title={<SectionTitle icon={<Layers size={15} />}>Aula y carrera</SectionTitle>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {AREA_LABEL[s.area] ?? s.area} — {s.turno === 'manana' ? 'Mañana' : 'Tarde'}
                  </option>
                ))}
              </select>
              {aulaSeleccionada && (
                <p className="mt-1 text-[11.5px] text-text-mute">
                  Área: <strong>{AREA_LABEL[aulaSeleccionada.area] ?? aulaSeleccionada.area}</strong>
                  {' · '}Turno: <strong>{aulaSeleccionada.turno === 'manana' ? 'Mañana' : 'Tarde'}</strong>
                </p>
              )}
            </Field>
            <Field
              label="Carrera profesional"
              hint={areaActiva
                ? `Las carreras de ${AREA_LABEL[areaActiva] ?? areaActiva} (área del aula) aparecen primero.`
                : undefined}
              className="sm:col-span-2"
            >
              <select {...register('carrera_id')} disabled={carreras.length === 0} className={SELECT_CLS}>
                <option value="">Sin asignar</option>
                {gruposCarreras.map((g) => (
                  <optgroup key={g.area} label={AREA_LABEL[g.area] ?? g.area}>
                    {g.items.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {/* ── Apoderado ── */}
        <Card title={<SectionTitle icon={<Users size={15} />}>Apoderado</SectionTitle>}>
          {/* Apoderados ya vinculados (al buscar por DNI un alumno existente) */}
          {existente && existente.apoderados.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-[11.5px] font-medium text-text-mute uppercase tracking-wide">Apoderados vinculados</p>
              {existente.apoderados.map((ap) => (
                <div key={ap.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2 border border-border bg-surface2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[12px] font-semibold">
                    {(ap.nombre?.[0] ?? '') + (ap.apellidos?.[0] ?? '')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text truncate">
                      {ap.nombre} {ap.apellidos}
                      {ap.es_principal && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-success">
                          <Check size={11} /> Principal
                        </span>
                      )}
                    </p>
                    <p className="text-[11.5px] text-text-mute truncate">
                      {ap.parentesco}{ap.dni ? ` · DNI ${ap.dni}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {existente && (
            <p className="mb-3 text-[12px] text-text-mute">
              {existente.apoderados.length > 0
                ? 'Puedes agregar otro apoderado a este alumno:'
                : 'Este alumno no tiene apoderados. Puedes vincular uno:'}
            </p>
          )}

          {/* Selector de modo */}
          <div className="flex flex-wrap gap-2 mb-4">
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
                {modo === 'ninguno'   && (existente ? 'No agregar' : 'Sin apoderado por ahora')}
                {modo === 'nuevo'     && 'Crear nuevo apoderado'}
                {modo === 'existente' && 'Apoderado ya registrado'}
              </button>
            ))}
          </div>

          {/* Formulario nuevo apoderado */}
          {apModo === 'nuevo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  inputMode="tel"
                  value={apForm.telefono_whatsapp}
                  onChange={(e) => apCampo('telefono_whatsapp', e.target.value)}
                />
              </Field>
              <Field label="Email de acceso" hint="Opcional. Se genera uno interno si se deja vacío." className="sm:col-span-2">
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
            <div className="flex flex-col gap-3">
              {/* Seleccionado */}
              {apSeleccionado ? (
                <div className="flex items-center justify-between p-3 bg-primary-light border border-primary/30 rounded-2">
                  <div>
                    <p className="font-medium text-[13px] text-text">
                      {apSeleccionado.apoderado?.nombre ?? apSeleccionado.nombre}{' '}
                      {apSeleccionado.apoderado?.apellidos ?? apSeleccionado.apellidos}
                    </p>
                    <p className="text-[11.5px] text-text-mute">
                      DNI {apSeleccionado.dni} · {apSeleccionado.email}
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

          {apModo === 'ninguno' && !existente && (
            <p className="text-[12.5px] text-text-mute">
              Podrás vincular un apoderado desde el perfil del alumno una vez creado.
            </p>
          )}
        </Card>

        <div className="flex justify-end gap-2.5 mt-1">
          <Btn variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Btn>
          <Btn type="submit" icon={<Check size={15} />} disabled={isSubmitting || guardando}>
            {guardando
              ? 'Guardando…'
              : existente ? 'Actualizar alumno' : 'Crear alumno'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
