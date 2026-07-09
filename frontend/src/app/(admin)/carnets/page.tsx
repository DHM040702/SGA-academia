'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCiclos, useAulas } from '@/hooks/use-ciclos'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Btn } from '@/components/ui/btn'
import { Search, Download, X } from '@/components/icons'
import api from '@/lib/api'

/* ─── Constantes ──────────────────────────────────────────────── */
const SELECT_CLS =
  'text-[13px] px-2.5 py-1.5 border border-border rounded-2 bg-surface min-w-[180px] disabled:opacity-50'

/* ─── Helper: genera y descarga un PDF ───────────────────────── */
async function downloadPDF(component: React.ReactElement, filename: string) {
  const { pdf } = await import('@react-pdf/renderer')
  const blob = await pdf(component as React.ReactElement<any>).toBlob()
  const url  = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/* ─── Helper: iniciales de un nombre ─────────────────────────── */
function initials(a: any) {
  return `${a.nombres ?? a.nombre ?? ''} ${a.apellidos ?? ''}`
    .trim().split(/\s+/).slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA
═══════════════════════════════════════════════════════════════ */
export default function CarnetsPage() {
  const { data: ciclos = [] } = useCiclos()
  const cicloActivo = ciclos.find((c) => c.activo)

  /* ── 1. Individual ─────────────────────────────────────────── */
  const [indivSearch,  setIndivSearch]  = useState('')
  const [indivAlumno,  setIndivAlumno]  = useState<any>(null)
  const [indivLoading, setIndivLoading] = useState(false)

  const { data: indivResults = [] } = useQuery<any[]>({
    queryKey: ['alumnos', 'carnets-indiv', indivSearch],
    queryFn:  async () => {
      const { data } = await api.get('/alumnos', { params: { q: indivSearch, limit: 8, page: 1 } })
      return data?.data ?? []
    },
    enabled:   indivSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  async function descargarIndividual() {
    if (!indivAlumno) return
    setIndivLoading(true)
    try {
      const { CarnetPDF } = await import('@/components/reportes/carnet-pdf')
      await downloadPDF(
        CarnetPDF({
          alumno:     indivAlumno,
          cicloLabel: indivAlumno.aula?.ciclo?.nombre ?? cicloActivo?.nombre ?? '2026-I',
        }),
        `carnet-${indivAlumno.apellidos ?? 'alumno'}-${indivAlumno.codigo_barra ?? ''}.pdf`,
      )
    } catch { alert('No se pudo generar el carnet.') }
    finally { setIndivLoading(false) }
  }

  /* ── 2. Por aula ───────────────────────────────────────────── */
  const [aulaCicloId,     setAulaCicloId]     = useState('')
  const [aulaId,          setAulaId]          = useState('')
  const [aulaLoadBatch,   setAulaLoadBatch]   = useState(false)
  const [aulaLoadSheet,   setAulaLoadSheet]   = useState(false)
  const { data: aulasList = [] } = useAulas(aulaCicloId || undefined)

  function turnoLabel(turno?: string) {
    return turno === 'tarde' ? 'Tarde' : turno === 'manana' ? 'Mañana' : undefined
  }

  async function descargarAulaBatch() {
    if (!aulaId) return
    setAulaLoadBatch(true)
    try {
      const { data } = await api.get('/alumnos', { params: { aula_id: aulaId, limit: 200, page: 1 } })
      const raw      = data?.data ?? []
      if (!raw.length) { alert('No hay alumnos en esa aula.'); return }
      const aula       = aulasList.find((a) => a.id === aulaId)
      const aulaLabel  = aula?.nombre ?? 'aula'
      const cicloLabel = ciclos.find((c) => c.id === aulaCicloId)?.nombre ?? '2026-I'
      const turno      = turnoLabel(aula?.turno)
      const alumnos    = turno ? raw.map((a: any) => ({ ...a, turno })) : raw
      const { CarnetBatchPDF } = await import('@/components/reportes/carnet-pdf')
      await downloadPDF(
        CarnetBatchPDF({ alumnos, cicloLabel }),
        `carnets-tarjeton-${aulaLabel}.pdf`,
      )
    } catch { alert('No se pudo generar los carnets.') }
    finally { setAulaLoadBatch(false) }
  }

  async function descargarAulaSheet() {
    if (!aulaId) return
    setAulaLoadSheet(true)
    try {
      const { data } = await api.get('/alumnos', { params: { aula_id: aulaId, limit: 200, page: 1 } })
      const raw      = data?.data ?? []
      if (!raw.length) { alert('No hay alumnos en esa aula.'); return }
      const aula       = aulasList.find((a) => a.id === aulaId)
      const aulaLabel  = aula?.nombre ?? 'aula'
      const cicloLabel = ciclos.find((c) => c.id === aulaCicloId)?.nombre ?? '2026-I'
      const turno      = turnoLabel(aula?.turno)
      const alumnos    = turno ? raw.map((a: any) => ({ ...a, turno })) : raw
      const { CarnetSheetPDF } = await import('@/components/reportes/carnet-pdf')
      await downloadPDF(
        CarnetSheetPDF({ alumnos, cicloLabel }),
        `carnets-hoja-A4-${aulaLabel}.pdf`,
      )
    } catch { alert('No se pudo generar los carnets.') }
    finally { setAulaLoadSheet(false) }
  }

  /* ── 3. Ciclo completo ─────────────────────────────────────── */
  const [cicloCicloId,  setCicloCicloId]  = useState('')
  const [cicloAulaId,   setCicloAulaId]   = useState('')
  const [cicloLoading,  setCicloLoading]  = useState(false)
  const { data: cicloAulas = [] } = useAulas(cicloCicloId || undefined)

  async function descargarCicloSheet() {
    if (!cicloCicloId) return
    setCicloLoading(true)
    try {
      const params: Record<string, any> = { limit: 500, page: 1 }
      if (cicloAulaId) params.aula_id  = cicloAulaId
      else             params.ciclo_id = cicloCicloId

      const { data } = await api.get('/alumnos', { params })
      const raw      = data?.data ?? []
      if (!raw.length) { alert('No hay alumnos para generar carnets.'); return }

      const { CarnetSheetPDF } = await import('@/components/reportes/carnet-pdf')
      const cicloLabel   = ciclos.find((c) => c.id === cicloCicloId)?.nombre ?? '2026-I'
      const selectedAula = cicloAulaId ? cicloAulas.find((a) => a.id === cicloAulaId) : undefined
      const fileLabel    = selectedAula?.nombre ?? cicloLabel
      const turno        = turnoLabel(selectedAula?.turno)
      const alumnos      = turno ? raw.map((a: any) => ({ ...a, turno })) : raw

      await downloadPDF(
        CarnetSheetPDF({ alumnos, cicloLabel }),
        `carnets-hoja-A4-${fileLabel}.pdf`,
      )
    } catch { alert('No se pudo generar los carnets.') }
    finally { setCicloLoading(false) }
  }

  /* ── 4. Selección libre ────────────────────────────────────── */
  const [selSearch,  setSelSearch]  = useState('')
  const [selAlumnos, setSelAlumnos] = useState<Record<string, any>>({})
  const [selLoading, setSelLoading] = useState(false)

  const { data: selResults = [] } = useQuery<any[]>({
    queryKey: ['alumnos', 'carnets-sel', selSearch],
    queryFn:  async () => {
      const { data } = await api.get('/alumnos', { params: { q: selSearch, limit: 10, page: 1 } })
      return data?.data ?? []
    },
    enabled:   selSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  function toggleSel(a: any) {
    setSelAlumnos((prev) => {
      if (prev[a.id]) { const { [a.id]: _, ...rest } = prev; return rest }
      return { ...prev, [a.id]: a }
    })
  }

  async function descargarSeleccion() {
    const alumnos = Object.values(selAlumnos)
    if (!alumnos.length) return
    setSelLoading(true)
    try {
      const { CarnetSheetPDF } = await import('@/components/reportes/carnet-pdf')
      await downloadPDF(
        CarnetSheetPDF({ alumnos, cicloLabel: cicloActivo?.nombre ?? '2026-I' }),
        `carnets-seleccion-${alumnos.length}.pdf`,
      )
    } catch { alert('No se pudo generar los carnets.') }
    finally { setSelLoading(false) }
  }

  const selCount    = Object.values(selAlumnos).length
  const selPagesCnt = Math.ceil(selCount / 10)

  /* ── 5. Docentes ───────────────────────────────────────────── */
  const [docSearch,     setDocSearch]     = useState('')
  const [docSeleccion,  setDocSeleccion]  = useState<Record<string, any>>({})
  const [docLoadSheet,  setDocLoadSheet]  = useState(false)
  const [docLoadBatch,  setDocLoadBatch]  = useState(false)
  const [docLoadTodos,  setDocLoadTodos]  = useState(false)

  const { data: docResults = [] } = useQuery<any[]>({
    queryKey: ['docentes', 'carnets-sel', docSearch],
    queryFn:  async () => {
      const { data } = await api.get('/docentes', { params: { q: docSearch, limit: 10, page: 1 } })
      return data?.data ?? []
    },
    enabled:   docSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  function toggleDoc(d: any) {
    setDocSeleccion((prev) => {
      if (prev[d.id]) { const { [d.id]: _, ...rest } = prev; return rest }
      return { ...prev, [d.id]: d }
    })
  }

  async function descargarDocentesSeleccion(modo: 'sheet' | 'batch') {
    const docentes = Object.values(docSeleccion)
    if (!docentes.length) return
    const setLoad = modo === 'sheet' ? setDocLoadSheet : setDocLoadBatch
    setLoad(true)
    try {
      const cicloLabel = cicloActivo?.nombre ?? '2026-I'
      const mod = await import('@/components/reportes/carnet-docente-pdf')
      const comp = modo === 'sheet'
        ? mod.CarnetDocenteSheetPDF({ docentes, cicloLabel })
        : mod.CarnetDocenteBatchPDF({ docentes, cicloLabel })
      await downloadPDF(
        comp,
        `carnets-docentes-${modo === 'sheet' ? 'hoja-A4' : 'tarjeton'}-${docentes.length}.pdf`,
      )
    } catch { alert('No se pudo generar los carnets.') }
    finally { setLoad(false) }
  }

  async function descargarTodosDocentes() {
    setDocLoadTodos(true)
    try {
      const { data } = await api.get('/docentes', { params: { limit: 500, page: 1 } })
      const docentes = data?.data ?? []
      if (!docentes.length) { alert('No hay docentes para generar carnets.'); return }
      const { CarnetDocenteSheetPDF } = await import('@/components/reportes/carnet-docente-pdf')
      await downloadPDF(
        CarnetDocenteSheetPDF({ docentes, cicloLabel: cicloActivo?.nombre ?? '2026-I' }),
        `carnets-docentes-hoja-A4-todos.pdf`,
      )
    } catch { alert('No se pudo generar los carnets.') }
    finally { setDocLoadTodos(false) }
  }

  const docCount = Object.values(docSeleccion).length

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="px-7 pt-[22px] pb-7 flex flex-col gap-5 max-w-[820px]">
      <PageHeader
        title="Carnets estudiantiles"
        crumbs={[{ label: 'Carnets' }]}
      />

      {/* ══ 1. CARNET INDIVIDUAL ══════════════════════════════════ */}
      <Card
        title="Carnet individual"
        subtitle="Busca un alumno y descarga su carnet en tamaño tarjetón (9.3 × 5.6 cm)"
      >
        <div className="p-4 flex flex-col gap-4">

          {/* Buscador */}
          {!indivAlumno && (
            <div className="relative max-w-[520px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
              <input
                type="text"
                value={indivSearch}
                onChange={(e) => setIndivSearch(e.target.value)}
                placeholder="Nombre, apellidos o DNI del alumno…"
                autoComplete="off"
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {indivSearch.trim().length >= 2 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-2 overflow-hidden">
                  {indivResults.length === 0
                    ? <p className="text-[12px] text-text-mute text-center py-3">Sin resultados para «{indivSearch}»</p>
                    : indivResults.map((a: any) => (
                        <button key={a.id}
                          onClick={() => { setIndivAlumno(a); setIndivSearch('') }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-surface-2 text-[13px] flex justify-between items-center gap-3 border-b border-border-s last:border-0">
                          <div>
                            <span className="font-semibold">{a.apellidos ?? ''}{a.apellidos ? ', ' : ''}{a.nombres ?? a.nombre ?? ''}</span>
                            {a.dni && <span className="text-text-mute ml-2 text-[11px]">DNI: {a.dni}</span>}
                            {a.aula && <span className="text-text-mute ml-2 text-[11px]">· {a.aula.nombre}</span>}
                          </div>
                          <span className="font-mono text-[11px] text-primary flex-shrink-0">{a.codigo_barra}</span>
                        </button>
                      ))}
                </div>
              )}
            </div>
          )}
          {!indivAlumno && indivSearch.trim().length < 2 && (
            <p className="text-[12px] text-text-mute">Escribe al menos 2 caracteres para buscar.</p>
          )}

          {/* Alumno seleccionado */}
          {indivAlumno && (
            <div className="rounded-3 border border-border bg-surface-2/40 p-4 flex items-center gap-4 max-w-[560px]">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary font-bold text-[15px] select-none">
                {initials(indivAlumno)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] leading-tight truncate">
                  {indivAlumno.apellidos ?? ''}{indivAlumno.apellidos ? ', ' : ''}
                  {indivAlumno.nombres ?? indivAlumno.nombre ?? ''}
                </p>
                <p className="text-[11.5px] text-text-mute mt-0.5">
                  Cód: <span className="font-mono">{indivAlumno.codigo_barra ?? '—'}</span>
                  {indivAlumno.dni && <> · DNI: {indivAlumno.dni}</>}
                  {indivAlumno.aula && <> · Aula: <strong>{indivAlumno.aula.nombre}</strong></>}
                </p>
              </div>
              <Btn size="sm" icon={<Download size={14} />} disabled={indivLoading} onClick={descargarIndividual}>
                {indivLoading ? 'Generando…' : 'Descargar carnet'}
              </Btn>
              <button onClick={() => setIndivAlumno(null)} className="text-text-mute hover:text-text flex-shrink-0" title="Limpiar">
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ══ 2. LOTE POR AULA ══════════════════════════════════════ */}
      <Card
        title="Carnets por aula"
        subtitle="Todos los alumnos de un aula — tarjetón individual (9.3 × 5.6 cm) o hoja A4 con 10 carnets"
      >
        <div className="p-4 flex flex-wrap gap-3 items-end">
          {/* Ciclo */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Ciclo</label>
            <select
              value={aulaCicloId}
              onChange={(e) => { setAulaCicloId(e.target.value); setAulaId('') }}
              className={SELECT_CLS}
            >
              <option value="">Seleccionar ciclo…</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ★' : ''}</option>
              ))}
            </select>
          </div>
          {/* Aula */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">Aula</label>
            <select
              value={aulaId}
              onChange={(e) => setAulaId(e.target.value)}
              disabled={!aulaCicloId}
              className={SELECT_CLS}
            >
              <option value="">Seleccionar aula…</option>
              {aulasList.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          {/* Botones */}
          <div className="flex gap-2">
            <Btn
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              disabled={!aulaId || aulaLoadBatch || aulaLoadSheet}
              onClick={descargarAulaBatch}
            >
              {aulaLoadBatch ? 'Generando…' : 'Tarjetón individual'}
            </Btn>
            <Btn
              size="sm"
              icon={<Download size={14} />}
              disabled={!aulaId || aulaLoadBatch || aulaLoadSheet}
              onClick={descargarAulaSheet}
            >
              {aulaLoadSheet ? 'Generando…' : 'Hoja A4'}
            </Btn>
          </div>
          {/* Hint */}
          {aulaId && (
            <div className="self-center text-[11px] text-text-mute flex flex-col gap-0.5 leading-snug">
              <span>Tarjetón: 1 alumno por página (9.3 × 5.6 cm)</span>
              <span>Hoja A4: 10 carnets por página · guías de corte</span>
            </div>
          )}
        </div>
      </Card>

      {/* ══ 3. CICLO COMPLETO ══════════════════════════════════════ */}
      <Card
        title="Ciclo completo — Hoja A4"
        subtitle="Genera los carnets de un ciclo entero en hojas A4 verticales (10 carnets por página, guías de corte para guillotina)"
      >
        <div className="p-4 flex flex-wrap gap-3 items-end">
          {/* Ciclo */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">
              Ciclo <span className="text-danger">*</span>
            </label>
            <select
              value={cicloCicloId}
              onChange={(e) => { setCicloCicloId(e.target.value); setCicloAulaId('') }}
              className={SELECT_CLS}
            >
              <option value="">Seleccionar ciclo…</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ★' : ''}</option>
              ))}
            </select>
          </div>
          {/* Aula (opcional) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] text-text-mute uppercase tracking-[0.05em] font-medium">
              Aula <span className="font-normal normal-case text-text-mute">(opcional)</span>
            </label>
            <select
              value={cicloAulaId}
              onChange={(e) => setCicloAulaId(e.target.value)}
              disabled={!cicloCicloId}
              className={SELECT_CLS}
            >
              <option value="">Todas las aulas del ciclo</option>
              {cicloAulas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <Btn
            size="sm"
            icon={<Download size={14} />}
            disabled={!cicloCicloId || cicloLoading}
            onClick={descargarCicloSheet}
          >
            {cicloLoading ? 'Generando…' : 'Generar hoja A4'}
          </Btn>
          {/* Hint */}
          {cicloCicloId && (
            <div className="self-center text-[11px] text-text-mute flex flex-col gap-0.5 leading-snug">
              <span className="font-medium text-text">10 carnets por página A4 vertical</span>
              <span>
                {cicloAulaId
                  ? `Solo aula ${cicloAulas.find((a) => a.id === cicloAulaId)?.nombre ?? ''}`
                  : `Ciclo completo: ${ciclos.find((c) => c.id === cicloCicloId)?.nombre ?? ''}`}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* ══ 4. SELECCIÓN LIBRE ════════════════════════════════════ */}
      <Card
        title="Selección libre de alumnos"
        subtitle="Elige alumnos de distintas aulas o ciclos — genera hoja A4 solo con los seleccionados"
      >
        <div className="p-4 flex flex-col gap-4">
          {/* Buscador */}
          <div className="relative max-w-[520px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
            <input
              type="text"
              value={selSearch}
              onChange={(e) => setSelSearch(e.target.value)}
              placeholder="Buscar alumno para agregar a la selección…"
              autoComplete="off"
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {selSearch.trim().length >= 2 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-2 overflow-hidden">
                {selResults.length === 0
                  ? <p className="text-[12px] text-text-mute text-center py-3">Sin resultados para «{selSearch}»</p>
                  : selResults.map((a: any) => {
                      const checked = Boolean(selAlumnos[a.id])
                      return (
                        <button key={a.id} onClick={() => toggleSel(a)}
                          className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-3 border-b border-border-s last:border-0 transition-colors ${
                            checked ? 'bg-primary/8' : 'hover:bg-surface-2'
                          }`}>
                          {/* Checkbox visual */}
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors ${
                            checked ? 'bg-primary border-primary text-white' : 'border-border'
                          }`}>
                            {checked ? '✓' : ''}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">{a.apellidos ?? ''}{a.apellidos ? ', ' : ''}{a.nombres ?? a.nombre ?? ''}</span>
                            {a.dni && <span className="text-text-mute ml-2 text-[11px]">DNI: {a.dni}</span>}
                            {a.aula && <span className="text-text-mute ml-2 text-[11px]">· {a.aula.nombre}</span>}
                          </div>
                          <span className="font-mono text-[11px] text-primary flex-shrink-0">{a.codigo_barra}</span>
                        </button>
                      )
                    })}
              </div>
            )}
          </div>

          {/* Chips de alumnos seleccionados */}
          {selCount > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-text-mute uppercase tracking-[0.04em]">
                  Seleccionados ({selCount})
                </span>
                <button onClick={() => setSelAlumnos({})} className="text-[11px] text-danger hover:underline">
                  Limpiar todo
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                {Object.values(selAlumnos).map((a: any) => (
                  <span key={a.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-[12px] rounded-full border border-primary/20">
                    <span className="font-medium truncate max-w-[180px]">
                      {a.apellidos ?? ''}{a.apellidos ? ', ' : ''}{a.nombres ?? a.nombre ?? ''}
                    </span>
                    <button
                      onClick={() => toggleSel(a)}
                      className="text-primary/60 hover:text-danger leading-none flex-shrink-0"
                      title="Quitar">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botón de generación */}
          <div className="flex items-center gap-3 pt-1 border-t border-border-s">
            <Btn
              size="sm"
              icon={<Download size={14} />}
              disabled={selCount === 0 || selLoading}
              onClick={descargarSeleccion}
            >
              {selLoading
                ? 'Generando…'
                : selCount > 0
                  ? `Generar hoja A4 (${selCount} alumno${selCount !== 1 ? 's' : ''})`
                  : 'Generar hoja A4'}
            </Btn>
            {selCount > 0 ? (
              <p className="text-[11.5px] text-text-mute">
                {selPagesCnt} {selPagesCnt === 1 ? 'hoja A4' : 'hojas A4'} · 10 carnets por página
              </p>
            ) : (
              <p className="text-[11.5px] text-text-mute">
                Busca y selecciona alumnos para comenzar.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ══ 5. CARNETS DE DOCENTES ════════════════════════════════ */}
      <Card
        title="Carnets de docentes"
        subtitle="El código de barras del carnet es el DNI del docente (igual al que marca el kiosco)"
      >
        <div className="p-4 flex flex-col gap-4">

          {/* Todos los docentes */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border-s">
            <Btn
              size="sm"
              icon={<Download size={14} />}
              disabled={docLoadTodos}
              onClick={descargarTodosDocentes}
            >
              {docLoadTodos ? 'Generando…' : 'Todos los docentes · Hoja A4'}
            </Btn>
            <p className="text-[11.5px] text-text-mute">
              Genera una hoja A4 vertical con todos los docentes (10 por página, guías de corte).
            </p>
          </div>

          {/* Selección libre de docentes */}
          <div className="relative max-w-[520px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Buscar docente por nombre, apellidos o DNI…"
              autoComplete="off"
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-border rounded-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {docSearch.trim().length >= 2 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2 shadow-2 overflow-hidden">
                {docResults.length === 0
                  ? <p className="text-[12px] text-text-mute text-center py-3">Sin resultados para «{docSearch}»</p>
                  : docResults.map((d: any) => {
                      const checked = Boolean(docSeleccion[d.id])
                      return (
                        <button key={d.id} onClick={() => toggleDoc(d)}
                          className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-3 border-b border-border-s last:border-0 transition-colors ${
                            checked ? 'bg-primary/8' : 'hover:bg-surface-2'
                          }`}>
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors ${
                            checked ? 'bg-primary border-primary text-white' : 'border-border'
                          }`}>
                            {checked ? '✓' : ''}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">{d.apellidos ?? ''}{d.apellidos ? ', ' : ''}{d.nombre ?? ''}</span>
                            {d.especialidad && <span className="text-text-mute ml-2 text-[11px]">· {d.especialidad}</span>}
                          </div>
                          <span className="font-mono text-[11px] text-primary flex-shrink-0">{d.dni}</span>
                        </button>
                      )
                    })}
              </div>
            )}
          </div>

          {/* Chips seleccionados */}
          {docCount > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-text-mute uppercase tracking-[0.04em]">
                  Seleccionados ({docCount})
                </span>
                <button onClick={() => setDocSeleccion({})} className="text-[11px] text-danger hover:underline">
                  Limpiar todo
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                {Object.values(docSeleccion).map((d: any) => (
                  <span key={d.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-[12px] rounded-full border border-primary/20">
                    <span className="font-medium truncate max-w-[180px]">
                      {d.apellidos ?? ''}{d.apellidos ? ', ' : ''}{d.nombre ?? ''}
                    </span>
                    <button onClick={() => toggleDoc(d)} className="text-primary/60 hover:text-danger leading-none flex-shrink-0" title="Quitar">✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botones de generación de la selección */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border-s">
            <Btn
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              disabled={docCount === 0 || docLoadBatch || docLoadSheet}
              onClick={() => descargarDocentesSeleccion('batch')}
            >
              {docLoadBatch ? 'Generando…' : 'Tarjetón individual'}
            </Btn>
            <Btn
              size="sm"
              icon={<Download size={14} />}
              disabled={docCount === 0 || docLoadBatch || docLoadSheet}
              onClick={() => descargarDocentesSeleccion('sheet')}
            >
              {docLoadSheet ? 'Generando…' : `Hoja A4${docCount > 0 ? ` (${docCount})` : ''}`}
            </Btn>
            <p className="text-[11.5px] text-text-mute">
              {docCount > 0
                ? 'Tarjetón: 1 docente por página · Hoja A4: 10 por página con guías de corte.'
                : 'Busca y selecciona docentes para comenzar.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
