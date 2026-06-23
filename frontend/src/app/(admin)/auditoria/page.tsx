'use client'
import * as React from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Download } from '@/components/icons'
import {
  useAuditoria,
  useAuditoriaResumen,
  exportarAuditoriaCsv,
  ACCION_LABELS,
  type AuditoriaFiltros,
} from '@/hooks/use-auditoria'

const SELECT_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary'

const ACCION_COLOR: Record<string, string> = {
  crear: 'bg-green-100 text-green-700',
  actualizar: 'bg-amber-100 text-amber-700',
  eliminar: 'bg-red-100 text-red-700',
  reset_password: 'bg-purple-100 text-purple-700',
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-slate-100 text-slate-600',
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditoriaPage() {
  const [filtros, setFiltros] = React.useState<AuditoriaFiltros>({ page: 1, limit: 20 })
  const [exportando, setExportando] = React.useState(false)

  const { data: page, isLoading } = useAuditoria(filtros)
  const { data: resumen } = useAuditoriaResumen()

  function setF(patch: Partial<AuditoriaFiltros>) {
    setFiltros((f) => ({ ...f, ...patch, page: patch.page ?? 1 }))
  }

  async function handleExport() {
    setExportando(true)
    try {
      await exportarAuditoriaCsv(filtros)
    } catch {
      alert('No se pudo exportar el registro.')
    } finally {
      setExportando(false)
    }
  }

  const totalPages = page?.totalPages ?? 1

  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-4">
      <PageHeader
        title="Auditoría del sistema"
        crumbs={[{ label: 'Administración' }, { label: 'Auditoría' }]}
        action={
          <Btn variant="secondary" size="sm" onClick={handleExport} disabled={exportando}>
            <Download size={14} />
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </Btn>
        }
      />

      {/* ── Panel de resumen ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <Card pad={0}><div className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-mute">Eventos totales</div>
          <div className="text-[26px] font-serif font-semibold text-text">{resumen?.total ?? '—'}</div>
        </div></Card>
        <Card pad={0}><div className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-mute">Hoy</div>
          <div className="text-[26px] font-serif font-semibold text-text">{resumen?.hoy ?? '—'}</div>
        </div></Card>
        <Card pad={0}><div className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-mute">Accesos (7 días)</div>
          <div className="text-[26px] font-serif font-semibold text-text">{resumen?.accesos7 ?? '—'}</div>
        </div></Card>
        <Card pad={0}><div className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-mute">Usuario más activo</div>
          <div className="text-[14px] font-medium text-text truncate mt-1.5">
            {resumen?.usuariosActivos?.[0]?.nombre ?? '—'}
          </div>
          <div className="text-[11px] text-text-mute">
            {resumen?.usuariosActivos?.[0]?.total ?? 0} acciones (7 días)
          </div>
        </div></Card>
      </div>

      {/* ── Filtros ──────────────────────────────────────────── */}
      <Card pad={0}>
        <div className="grid grid-cols-5 gap-3 p-3">
          <Field label="Usuario (email)">
            <Input
              placeholder="buscar…"
              value={filtros.usuario ?? ''}
              onChange={(e) => setF({ usuario: e.target.value })}
            />
          </Field>
          <Field label="Acción">
            <select className={SELECT_CLS} value={filtros.accion ?? ''} onChange={(e) => setF({ accion: e.target.value })}>
              <option value="">Todas</option>
              <option value="crear">Creación</option>
              <option value="actualizar">Actualización</option>
              <option value="eliminar">Eliminación</option>
              <option value="reset_password">Reset contraseña</option>
            </select>
          </Field>
          <Field label="Entidad">
            <Input
              placeholder="alumnos, usuarios…"
              value={filtros.entidad ?? ''}
              onChange={(e) => setF({ entidad: e.target.value })}
            />
          </Field>
          <Field label="Desde">
            <Input type="date" value={filtros.desde ?? ''} onChange={(e) => setF({ desde: e.target.value })} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={filtros.hasta ?? ''} onChange={(e) => setF({ hasta: e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* ── Tabla ────────────────────────────────────────────── */}
      <Card pad={0}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-text-mute border-b border-border">
                <th className="px-3 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Usuario</th>
                <th className="px-3 py-2.5 font-medium">Rol</th>
                <th className="px-3 py-2.5 font-medium">Acción</th>
                <th className="px-3 py-2.5 font-medium">Entidad</th>
                <th className="px-3 py-2.5 font-medium">ID</th>
                <th className="px-3 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-text-mute">Cargando…</td></tr>
              ) : (page?.data.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-text-mute">Sin eventos para los filtros aplicados.</td></tr>
              ) : (
                page!.data.map((e) => (
                  <tr key={e.id} className="border-b border-border-s hover:bg-surface2">
                    <td className="px-3 py-2 whitespace-nowrap text-text-mute">{fmtFecha(e.createdAt)}</td>
                    <td className="px-3 py-2 truncate max-w-[180px]">{e.usuarioNombre ?? e.usuarioEmail ?? '—'}</td>
                    <td className="px-3 py-2 capitalize text-text-mute">{e.usuarioRol ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${ACCION_COLOR[e.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ACCION_LABELS[e.accion] ?? e.accion}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text">{e.entidad}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-mute truncate max-w-[140px]">{e.entidadId ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-mute">{e.ip ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border text-[12.5px] text-text-mute">
          <span>{page?.total ?? 0} eventos</span>
          <div className="flex items-center gap-2">
            <Btn
              variant="secondary" size="sm"
              disabled={(filtros.page ?? 1) <= 1}
              onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              Anterior
            </Btn>
            <span>Página {filtros.page ?? 1} de {totalPages}</span>
            <Btn
              variant="secondary" size="sm"
              disabled={(filtros.page ?? 1) >= totalPages}
              onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              Siguiente
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  )
}
