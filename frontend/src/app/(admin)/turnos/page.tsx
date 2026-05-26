'use client'
import * as React from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTurnos, useUpdateTurno, isoToHHMM, type TurnoKey } from '@/hooks/use-turnos'

interface TurnoFormState {
  hora_entrada: string
  hora_limite_puntual: string
  hora_fin: string
  activo: boolean
}

function TurnoCard({ turno, label }: { turno: TurnoKey; label: string }) {
  const { data: configs = [], isLoading } = useTurnos()
  const updateTurno = useUpdateTurno()

  const config = configs.find((c) => c.turno === turno)

  const [form, setForm] = React.useState<TurnoFormState>({
    hora_entrada: '',
    hora_limite_puntual: '',
    hora_fin: '',
    activo: true,
  })
  const [dirty, setDirty] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!config) return
    setForm({
      hora_entrada: isoToHHMM(config.horaEntrada),
      hora_limite_puntual: isoToHHMM(config.horaLimitePuntual),
      hora_fin: isoToHHMM(config.horaFin),
      activo: config.activo,
    })
    setDirty(false)
  }, [config])

  function onChange(field: keyof TurnoFormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
    setDirty(true)
    setSaved(false)
  }

  async function onSave() {
    try {
      await updateTurno.mutateAsync({ turno, ...form })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al guardar')
    }
  }

  if (isLoading) {
    return (
      <Card title={label}>
        <div className="h-24 flex items-center justify-center text-text-mute text-sm">Cargando…</div>
      </Card>
    )
  }

  return (
    <Card title={label}>
      <div className="p-1 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Hora de entrada">
            <Input
              type="time"
              value={form.hora_entrada}
              onChange={(e) => onChange('hora_entrada', e.target.value)}
            />
          </Field>
          <Field label="Límite puntual">
            <Input
              type="time"
              value={form.hora_limite_puntual}
              onChange={(e) => onChange('hora_limite_puntual', e.target.value)}
            />
            <p className="mt-1 text-[11px] text-text-mute">Después de esta hora = tardanza</p>
          </Field>
          <Field label="Hora de salida">
            <Input
              type="time"
              value={form.hora_fin}
              onChange={(e) => onChange('hora_fin', e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => onChange('activo', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-[13px] text-text">Turno activo</span>
          </label>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[12px] text-success font-medium">Guardado</span>
            )}
            <Btn
              size="sm"
              disabled={!dirty || updateTurno.isPending}
              onClick={onSave}
            >
              {updateTurno.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Btn>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function TurnosPage() {
  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[760px]">
      <PageHeader
        title="Configuración de turnos"
        crumbs={[{ label: 'Configuración' }, { label: 'Turnos' }]}
      />
      <p className="text-[13px] text-text-mute -mt-1">
        Define los horarios de entrada, límite de puntualidad y salida para cada turno.
        Estos valores determinan automáticamente si una asistencia se registra como tardanza.
      </p>
      <TurnoCard turno="manana" label="Turno Mañana" />
      <TurnoCard turno="tarde" label="Turno Tarde" />
    </div>
  )
}
