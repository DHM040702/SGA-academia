'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurso, useUpdateCurso, type HorarioCurso } from '@/hooks/use-cursos'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { KPI } from '@/components/ui/kpi'
import { Edit, X, ChevL, Calendar } from '@/components/icons'

/* ─── helpers ────────────────────────────────────────────────────── */
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function fmtHora(iso: string) {
  if (!iso) return '—'
  if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5)
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

/* ─── EditarCursoModal ───────────────────────────────────────────── */
function EditarCursoModal({
  id,
  nombre: initNombre,
  codigo: initCodigo,
  onClose,
}: {
  id: string
  nombre: string
  codigo: string
  onClose: () => void
}) {
  const [nombre, setNombre] = useState(initNombre)
  const [codigo, setCodigo] = useState(initCodigo)
  const [error, setError]   = useState('')
  const updateMut = useUpdateCurso()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateMut.mutateAsync({ id, nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-[460px] bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-semibold">Editar curso</h2>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-text-mute hover:text-text">
            <X size={16} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-mute mb-1.5 block uppercase tracking-[0.05em]">Código</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              required
              maxLength={10}
              pattern="[A-Z0-9_\-]+"
              className="w-full px-3 py-2 text-[13px] font-mono border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="text-[12px] text-danger bg-danger-light px-3 py-2 rounded-2">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-border-s">
            <Btn variant="secondary" size="sm" onClick={onClose} type="button">Cancelar</Btn>
            <Btn size="sm" type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Horario row ────────────────────────────────────────────────── */
function HorarioRow({ h }: { h: HorarioCurso; i: number }) {
  const live = (() => {
    const now = new Date()
    const hoy = now.getDay() === 0 ? 7 : now.getDay()
    if (hoy !== h.diaSemana) return false
    const cur = now.getHours() * 60 + now.getMinutes()
    const ini = new Date(h.horaInicio)
    const fin = new Date(h.horaFin)
    const s   = ini.getUTCHours() * 60 + ini.getUTCMinutes()
    const e   = fin.getUTCHours() * 60 + fin.getUTCMinutes()
    return cur >= s && cur <= e
  })()

  return (
    <tr className="border-t border-border-s hover:bg-surface2/40 transition-colors">
      <td className="px-3.5 py-3">
        <div className="flex items-center gap-2">
          {live && <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />}
          <span className={live ? 'font-semibold text-success' : ''}>{DIAS[h.diaSemana] ?? `Día ${h.diaSemana}`}</span>
        </div>
      </td>
      <td className="px-3.5 py-3 font-mono text-[12px] text-text-mute">
        {fmtHora(h.horaInicio)} – {fmtHora(h.horaFin)}
      </td>
      <td className="px-3.5 py-3 font-medium">{h.aula?.nombre ?? '—'}</td>
      <td className="px-3.5 py-3 text-[12px] text-text-mute">{h.aula?.ciclo?.nombre ?? '—'}</td>
      <td className="px-3.5 py-3">
        {h.docente
          ? `${h.docente.nombre} ${h.docente.apellidos}`
          : <span className="text-text-mute">Sin asignar</span>}
      </td>
      <td className="px-3.5 py-3">
        <Pill tone={h.publicado ? 'success' : 'neutral'}>
          {h.publicado ? 'Publicado' : 'Borrador'}
        </Pill>
      </td>
    </tr>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function CursoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [showEdit, setShowEdit] = useState(false)

  const { data: curso, isLoading } = useCurso(id)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-text-mute text-[13px]">
        Cargando…
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-text-mute text-[14px]">Curso no encontrado</p>
        <Btn variant="secondary" size="sm" onClick={() => router.push('/cursos')}>
          <ChevL size={14} /> Volver
        </Btn>
      </div>
    )
  }

  const horarios = curso.horarios ?? []
  const publicados  = horarios.filter((h) => h.publicado).length
  const diasUnicos  = new Set(horarios.map((h) => h.diaSemana)).size
  const aulasUnicas = new Set(horarios.map((h) => h.aula?.id).filter(Boolean)).size

  return (
    <>
      <PageHeader
        title={curso.nombre}
        crumbs={[{ label: 'Cursos', href: '/cursos' }, { label: curso.nombre }]}
        action={
          <Btn variant="secondary" size="sm" icon={<Edit size={14} />} onClick={() => setShowEdit(true)}>
            Editar curso
          </Btn>
        }
      />

      <div className="px-7 pb-8 pt-5 flex flex-col gap-5">
        {/* Cabecera del curso */}
        <div className="flex items-start gap-4 p-5 bg-surface border border-border rounded-3">
          <div
            className="w-14 h-14 rounded-3 flex items-center justify-center font-mono font-bold text-[18px] text-white shrink-0"
            style={{ background: 'var(--color-primary)' }}
          >
            {curso.codigo.slice(0, 3)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-serif text-[24px] font-semibold tracking-tight m-0">{curso.nombre}</h2>
              <span className="font-mono text-[12px] text-text-mute bg-surface2 border border-border-s px-2 py-0.5 rounded">
                {curso.codigo}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12.5px] text-text-mute">
              <span><Calendar size={12} className="inline mr-1" />{horarios.length} horario{horarios.length !== 1 ? 's' : ''} asignado{horarios.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{diasUnicos} día{diasUnicos !== 1 ? 's' : ''} de clase</span>
              <span>·</span>
              <span>{aulasUnicas} aula{aulasUnicas !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => router.push('/horarios')}
          >
            Ver horarios →
          </Btn>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <KPI
            label="Horarios totales"
            value={horarios.length}
            sub="asignados al curso"
            accent="var(--color-primary)"
          />
          <KPI
            label="Publicados"
            value={publicados}
            sub={`${horarios.length - publicados} en borrador`}
            accent="var(--color-success)"
          />
          <KPI
            label="Días de clase"
            value={diasUnicos}
            sub="días de la semana"
            accent="var(--color-info)"
          />
          <KPI
            label="Aulas"
            value={aulasUnicas}
            sub="donde se dicta"
            accent="var(--color-warning)"
          />
        </div>

        {/* Tabla de horarios */}
        <Card
          title="Horarios asignados"
          subtitle={`${horarios.length} registro${horarios.length !== 1 ? 's' : ''}`}
        >
          {horarios.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar size={32} className="text-text-soft mx-auto mb-3" />
              <p className="text-[13px] text-text-mute mb-3">
                Este curso no tiene horarios asignados aún.
              </p>
              <Btn size="sm" variant="secondary" onClick={() => router.push('/horarios')}>
                Ir a Horarios
              </Btn>
            </div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface2/50">
                  {['Día', 'Horario', 'Aula', 'Ciclo', 'Docente', 'Estado'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2.5 text-[11px] text-text-mute uppercase tracking-[0.04em] font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios
                  .slice()
                  .sort((a, b) => a.diaSemana - b.diaSemana)
                  .map((h, i) => (
                    <HorarioRow key={h.id} h={h} i={i} />
                  ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {showEdit && (
        <EditarCursoModal
          id={curso.id}
          nombre={curso.nombre}
          codigo={curso.codigo}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
