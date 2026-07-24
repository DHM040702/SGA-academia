'use client'
import * as React from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Avatar } from '@/components/ui/avatar'
import { RefreshCw, AlertTriangle, Check, Users, Teacher, ChevD, ChevR, Trash } from '@/components/icons'
import { useFotosControl, useEliminarFotoControl, type ReporteFotos, type PersonaFoto } from '@/hooks/use-fotos-control'
import { cn } from '@/lib/utils'

type Tab = 'alumnos' | 'docentes'

/* ─── Tile de estadística ────────────────────────────────────────── */
function Tile({ n, label, tone }: { n: number; label: string; tone?: 'ok' | 'warn' | 'danger' }) {
  const color =
    tone === 'ok'     ? 'text-success'
    : tone === 'warn'   ? 'text-warning'
    : tone === 'danger' ? 'text-danger'
    : 'text-text'
  return (
    <div className="flex-1 min-w-[120px] rounded-2 border border-border bg-surface px-3.5 py-3 text-center">
      <div className={cn('text-[24px] font-bold leading-none', color)}>{n}</div>
      <div className="text-[10.5px] text-text-mute uppercase tracking-wide mt-1.5">{label}</div>
    </div>
  )
}

/* ─── Fila de persona (sin foto) ─────────────────────────────────── */
function PersonaRow({ p, tab }: { p: PersonaFoto; tab: Tab }) {
  return (
    <Link
      href={`/${tab}/${p.id}`}
      className="flex items-center gap-3 px-3 py-2 hover:bg-surface2 border-b border-border-s last:border-0 transition-colors no-underline"
    >
      <Avatar name={`${p.nombre} ${p.apellidos}`} size={30} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-text truncate">{p.apellidos}, {p.nombre}</div>
        <div className="text-[11.5px] text-text-mute">DNI {p.dni}{p.codigo ? ` · Cód. ${p.codigo}` : ''}</div>
      </div>
    </Link>
  )
}

/* ─── Reporte de una pestaña ─────────────────────────────────────── */
function ReporteTab({ r, tab }: { r: ReporteFotos; tab: Tab }) {
  const [verSinFoto, setVerSinFoto] = React.useState(false)
  const eliminar = useEliminarFotoControl()
  const pct = r.total > 0 ? Math.round((r.conFoto / r.total) * 100) : 0

  async function quitarFoto(p: PersonaFoto) {
    if (!confirm(`¿Quitar la foto de ${p.nombre} ${p.apellidos}?\n\nLa foto se elimina del almacenamiento; podrás volver a cargar la correcta desde su perfil.`)) return
    try {
      await eliminar.mutateAsync({ tipo: tab, id: p.id })
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No se pudo quitar la foto.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cobertura */}
      <Card title="Cobertura de fotos">
        <div className="flex flex-wrap gap-2.5">
          <Tile n={r.total}        label="Total" />
          <Tile n={r.conFoto}      label="Con foto" tone="ok" />
          <Tile n={r.sinFotoTotal} label="Sin foto" tone={r.sinFotoTotal > 0 ? 'warn' : undefined} />
          <Tile n={r.duplicados.length} label="Grupos duplicados" tone={r.duplicados.length > 0 ? 'danger' : undefined} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11.5px] text-text-mute mb-1">
            <span>Progreso</span><span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface3 overflow-hidden">
            <div
              className={cn('h-full rounded-full', pct >= 90 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Fotos duplicadas */}
      <Card
        title={<span className="flex items-center gap-2">Fotos duplicadas
          {r.duplicados.length > 0 && (
            <span className="text-[11px] font-semibold text-danger bg-danger-light/50 rounded-full px-2 py-0.5">
              {r.duplicados.length}
            </span>
          )}
        </span>}
        subtitle="Misma imagen (idéntico contenido) asignada a más de una persona. Revisa cuál es la correcta y vuelve a cargar la de las demás."
      >
        {r.duplicados.length === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-success py-2">
            <Check size={16} /> No hay fotos duplicadas.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {r.duplicados.map((g) => (
              <div key={g.etag} className="rounded-2 border border-danger-light/70 bg-danger-light/10 p-3">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-danger uppercase tracking-wide mb-2.5">
                  <AlertTriangle size={12} /> Misma imagen · {g.integrantes.length} personas
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {g.integrantes.map((p) => {
                    const quitando = eliminar.isPending && eliminar.variables?.id === p.id
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-2 border border-border bg-surface px-3 py-2"
                      >
                        <Avatar name={`${p.nombre} ${p.apellidos}`} src={p.fotoUrl ?? undefined} size={40} />
                        <Link href={`/${tab}/${p.id}`} className="min-w-0 flex-1 no-underline group">
                          <div className="text-[13px] font-medium text-text truncate group-hover:text-primary transition-colors">{p.apellidos}, {p.nombre}</div>
                          <div className="text-[11.5px] text-text-mute">DNI {p.dni}{p.codigo ? ` · Cód. ${p.codigo}` : ''}</div>
                        </Link>
                        <Btn
                          variant="danger" size="sm"
                          icon={<Trash size={13} />}
                          disabled={quitando}
                          onClick={() => quitarFoto(p)}
                        >
                          {quitando ? 'Quitando…' : 'Quitar foto'}
                        </Btn>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Sin foto */}
      <Card
        title={<span className="flex items-center gap-2">Sin foto
          {r.sinFotoTotal > 0 && (
            <span className="text-[11px] font-semibold text-warning bg-warning-light/50 rounded-full px-2 py-0.5">
              {r.sinFotoTotal}
            </span>
          )}
        </span>}
        action={r.sinFotoTotal > 0 && (
          <Btn variant="ghost" size="sm" icon={verSinFoto ? <ChevD size={14} /> : <ChevR size={14} />}
            onClick={() => setVerSinFoto((v) => !v)}>
            {verSinFoto ? 'Ocultar' : 'Ver lista'}
          </Btn>
        )}
      >
        {r.sinFotoTotal === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-success py-2">
            <Check size={16} /> Todos tienen foto.
          </div>
        ) : verSinFoto ? (
          <div className="border border-border rounded-2 overflow-hidden max-h-[420px] overflow-y-auto">
            {r.sinFoto.map((p) => <PersonaRow key={p.id} p={p} tab={tab} />)}
          </div>
        ) : (
          <p className="text-[12.5px] text-text-mute">
            {r.sinFotoTotal} {tab === 'alumnos' ? 'alumno(s)' : 'docente(s)'} aún sin foto. Pulsa «Ver lista».
          </p>
        )}
      </Card>
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function ControlFotosPage() {
  const { data, isLoading, isFetching, refetch, error } = useFotosControl()
  const [tab, setTab] = React.useState<Tab>('alumnos')

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4 max-w-[900px]">
      <PageHeader
        title="Control de fotos"
        crumbs={[{ label: 'Administración' }, { label: 'Control de fotos' }]}
        action={
          <Btn variant="secondary" size="sm" icon={<RefreshCw size={14} />} disabled={isFetching}
            onClick={() => refetch()}>
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Btn>
        }
      />

      <p className="text-[12.5px] text-text-mute -mt-1">
        Revisa qué alumnos y docentes tienen foto y detecta imágenes repetidas
        (la misma foto asignada a varias personas).
      </p>

      {/* Tabs */}
      <div className="flex gap-2">
        {([['alumnos', 'Alumnos', Users], ['docentes', 'Docentes', Teacher]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-2 text-[13px] font-medium border transition-colors',
              tab === key ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-mute hover:text-text',
            )}
          >
            <Icon size={15} />
            {label}
            {data && (
              <span className={cn('text-[11px] rounded-full px-1.5 py-0.5',
                tab === key ? 'bg-white/20' : 'bg-surface2')}>
                {data[key].duplicados.length > 0 ? `${data[key].duplicados.length} dup.` : `${data[key].conFoto}/${data[key].total}`}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card><div className="flex items-center gap-3 py-8 justify-center text-text-mute text-[13px]">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Analizando fotos…
        </div></Card>
      ) : error ? (
        <Card><div className="flex items-center gap-2 text-danger text-[13px] py-4">
          <AlertTriangle size={16} /> No se pudo cargar el control de fotos.
        </div></Card>
      ) : data ? (
        <ReporteTab r={data[tab]} tab={tab} />
      ) : null}
    </div>
  )
}
