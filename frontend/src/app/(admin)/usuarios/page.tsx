'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { Avatar } from '@/components/ui/avatar'
import { Plus, Edit, Trash, Search } from '@/components/icons'
import { useUsuarios, useDeleteUsuario, ROL_LABELS, type RolUsuario } from '@/hooks/use-usuarios'
import { useAuth } from '@/contexts/auth-context'

const ROL_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'Todos los roles' },
  { value: 'admin',     label: 'Administrador' },
  { value: 'director',  label: 'Director' },
  { value: 'vigilante', label: 'Vigilante' },
  { value: 'docente',   label: 'Docente' },
  { value: 'alumno',    label: 'Alumno' },
  { value: 'apoderado', label: 'Apoderado' },
]

const SELECT_CLS =
  'px-3 py-2 text-[13px] border border-border rounded-2 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary'

function rolTone(rol: RolUsuario): 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'primary' {
  const map: Record<RolUsuario, any> = {
    admin: 'danger', director: 'primary', vigilante: 'warning',
    docente: 'info', alumno: 'success', apoderado: 'neutral',
  }
  return map[rol]
}

export default function UsuariosPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const [page,   setPage]   = React.useState(1)
  const [rolFil, setRolFil] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [q,      setQ]      = React.useState('')   // debounced
  const deleteMut = useDeleteUsuario()

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useUsuarios({
    page, limit: 20,
    rol: rolFil || undefined,
    search: q || undefined,
  })

  const usuarios = data?.data ?? []
  const meta     = data?.meta

  async function handleDelete(id: string, email: string) {
    if (!confirm(`¿Eliminar el usuario "${email}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteMut.mutateAsync(id)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al eliminar usuario')
    }
  }

  return (
    <div className="px-4 md:px-7 pt-4 md:pt-[22px] pb-7 flex flex-col gap-4">
      <PageHeader
        title="Usuarios del sistema"
        crumbs={[{ label: 'Usuarios' }]}
        action={
          <Btn icon={<Plus size={14} />} size="sm" onClick={() => router.push('/usuarios/nuevo')}>
            Nuevo usuario
          </Btn>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={rolFil}
          onChange={(e) => { setRolFil(e.target.value); setPage(1) }}
          className={SELECT_CLS}
        >
          {ROL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-3 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface2">
              <th className="text-left px-4 py-3 font-semibold text-text-mute">Usuario</th>
              <th className="text-left px-4 py-3 font-semibold text-text-mute">Rol</th>
              <th className="text-left px-4 py-3 font-semibold text-text-mute">Perfil vinculado</th>
              <th className="text-left px-4 py-3 font-semibold text-text-mute">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-text-mute">Creado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-mute">Cargando…</td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-mute">Sin resultados</td>
              </tr>
            ) : usuarios.map((u) => {
              const perfil = u.docente ?? u.alumno ?? u.apoderado
              const esYo   = u.id === me?.id
              return (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.nombre ?? u.email} size={28} />
                      <div>
                        {(u.nombre || u.apellidos) && (
                          <div className="font-medium text-text">{u.nombre} {u.apellidos}</div>
                        )}
                        <div className={u.nombre ? 'text-[11.5px] text-text-mute' : 'font-medium text-text'}>{u.email}</div>
                        {u.dni && <div className="text-[11px] text-text-mute font-mono">DNI {u.dni}</div>}
                        {esYo && <div className="text-[11px] text-primary font-medium">Tú</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={rolTone(u.rol)}>{ROL_LABELS[u.rol]}</Pill>
                  </td>
                  <td className="px-4 py-3 text-text-mute">
                    {perfil
                      ? <span className="text-text">{perfil.nombre} {perfil.apellidos}</span>
                      : <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Dot tone={u.activo ? 'success' : 'neutral'} />
                      <span className={u.activo ? 'text-text' : 'text-text-mute'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-mute">
                    {new Date(u.createdAt).toLocaleDateString('es-PE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/usuarios/${u.id}/editar`}>
                        <Btn variant="ghost" size="sm" icon={<Edit size={13} />} />
                      </Link>
                      {!esYo && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          icon={<Trash size={13} />}
                          className="text-danger hover:bg-danger-l"
                          disabled={deleteMut.isPending}
                          onClick={() => handleDelete(u.id, u.email)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px] text-text-mute">
          <span>{meta.total} usuario{meta.total !== 1 ? 's' : ''}</span>
          <div className="flex gap-1">
            <Btn variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Btn>
            <span className="flex items-center px-3">
              {page} / {meta.totalPages}
            </span>
            <Btn variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
