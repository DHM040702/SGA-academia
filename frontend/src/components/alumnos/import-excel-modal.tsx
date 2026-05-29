'use client'
import * as React from 'react'
import * as XLSX from 'xlsx'
import { Btn } from '@/components/ui/btn'
import { X, Upload, FileText, Download, Check, AlertTriangle } from '@/components/icons'
import { useImportarAlumnos, type ImportResult } from '@/hooks/use-alumnos'
import { cn } from '@/lib/utils'

/* ─── Types ───────────────────────────────────────────────────── */
interface ParsedRow {
  fila:      number
  codigo:    string
  dni:       string
  nombres:   string
  apellidos: string
  aula:      string
  turno:     string
  email:     string
  errores:   string[]
}

type Step = 1 | 2 | 3

/* ─── Helpers ─────────────────────────────────────────────────── */
function normalizeAula(s: string): string {
  s = String(s ?? '').trim().toUpperCase()
  const m = s.match(/^([A-Z])(\d{3})$/)
  return m ? `${m[1]}-${m[2]}` : s
}

function normalizeTurno(s: string): string {
  s = String(s ?? '').toUpperCase()
  if (s.includes('TARDE')) return 'Tarde'
  if (s.includes('MA')) return 'Mañana'
  return s
}

function validateRow(r: ParsedRow): void {
  if (!r.dni) r.errores.push('DNI requerido')
  else if (!/^\d{8}$/.test(r.dni)) r.errores.push('DNI debe tener 8 dígitos')
  if (!r.nombres || r.nombres.length < 2) r.errores.push('Nombre requerido')
  if (!r.apellidos || r.apellidos.length < 2) r.errores.push('Apellidos requerido')
}

function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target!.result, { type: 'binary' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        const rows: ParsedRow[] = raw.map((r, i) => {
          const str = (v: any) => String(v ?? '').trim()
          const codigo    = str(r['CÓDIGO'] ?? r['CODIGO'] ?? r['Código'] ?? r['codigo'] ?? '').padStart(6, '0').slice(-6)
          const dni       = str(r['DNI'] ?? r['dni'] ?? '')
          const apPat     = str(r['AP. PATERNO'] ?? r['AP.PATERNO'] ?? r['ApPaterno'] ?? '')
          const apMat     = str(r['AP. MATERNO'] ?? r['AP.MATERNO'] ?? r['ApMaterno'] ?? '')
          const nombres   = str(r['NOMBRES'] ?? r['Nombres'] ?? r['nombres'] ?? '')
          const apellidos = apPat ? `${apPat} ${apMat}`.trim()
            : str(r['Apellidos'] ?? r['apellidos'] ?? '')
          const aula  = normalizeAula(str(r['AULA'] ?? r['Aula'] ?? r['aula'] ?? ''))
          const turno = normalizeTurno(str(r['TURNO'] ?? r['Turno'] ?? r['turno'] ?? ''))
          const email = str(r['Email'] ?? r['email'] ?? r['Correo'] ?? '') || `${codigo}@academia.edu`

          const row: ParsedRow = { fila: i + 2, codigo, dni, nombres, apellidos, aula, turno, email, errores: [] }
          validateRow(row)
          return row
        })
        resolve(rows)
      } catch {
        reject(new Error('No se pudo leer el archivo. Verifica que sea .xlsx o .xls válido.'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsBinaryString(file)
  })
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['CÓDIGO', 'DNI', 'AP. PATERNO', 'AP. MATERNO', 'NOMBRES', 'ÁREA', 'TURNO', 'AULA'],
    ['123456', '12345678', 'GARCIA', 'TORRES', 'LUCAS DANIEL', 'CIENCIAS', 'MAÑANA', 'C-001'],
    ['234567', '23456789', 'MENDOZA', 'QUIROZ', 'LUCIA', 'LETRAS', 'TARDE', 'L-002'],
    ['345678', '34567890', 'ALVAREZ', 'RIOS', 'KEVIN JOSE', 'MÉDICAS', 'MAÑANA', 'M-001'],
  ])
  ws['!cols'] = [10,12,16,16,20,12,12,10].map((w) => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
  XLSX.writeFile(wb, 'plantilla_alumnos_2026.xlsx')
}

/* ─── Stepper ─────────────────────────────────────────────────── */
function Stepper({ step }: { step: Step }) {
  const steps = [
    { label: 'Subir archivo', icon: Upload },
    { label: 'Verificar datos', icon: FileText },
    { label: 'Resultado',     icon: Check },
  ]
  return (
    <div className="flex items-center px-6 py-3 border-b border-border bg-surface2 gap-0">
      {steps.map((s, i) => {
        const n = (i + 1) as Step
        const done   = step > n
        const active = step === n
        const Icon   = s.icon
        return (
          <React.Fragment key={s.label}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                done   ? 'bg-primary text-white' :
                active ? 'bg-primary text-white ring-4 ring-primary/20' :
                         'bg-surface3 text-text-mute'
              )}>
                {done
                  ? <Check size={13} />
                  : <Icon size={13} />
                }
              </div>
              <span className={cn(
                'text-[12px] font-medium whitespace-nowrap',
                active ? 'text-primary font-semibold' : done ? 'text-text' : 'text-text-mute'
              )}>
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div className={cn(
                'flex-1 h-px mx-3 transition-colors',
                step > n + 1 ? 'bg-primary' : step > n ? 'bg-primary/40' : 'bg-border'
              )} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ─── Step 1: Upload ──────────────────────────────────────────── */
function StepUpload({ onFile, error }: { onFile: (f: File) => void; error?: string | null }) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handle(f: File) {
    if (!f.name.match(/\.(xlsx|xls)$/i)) { alert('Solo se aceptan archivos .xlsx o .xls'); return }
    onFile(f)
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Drop zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-3 flex flex-col items-center justify-center py-14 gap-3 cursor-pointer transition-all',
          dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-surface2/60',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
        onClick={() => inputRef.current?.click()}
      >
        <div className={cn(
          'w-14 h-14 rounded-3 flex items-center justify-center transition-colors',
          dragging ? 'bg-primary text-white' : 'bg-primary/10 text-primary',
        )}>
          <Upload size={24} />
        </div>
        <div className="text-center">
          <div className="text-[14px] font-semibold text-text">
            {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo Excel aquí'}
          </div>
          <div className="text-[12.5px] text-text-mute mt-1">o haz clic para seleccionar  ·  .xlsx / .xls</div>
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-danger-light border border-danger-light/60 rounded-2 text-[12.5px] text-danger">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Column guide */}
      <div className="rounded-2 border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-surface2 border-b border-border flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-text-mute uppercase tracking-wide">
            Formato esperado del Excel
          </span>
          <Btn variant="ghost" size="sm" className="text-[11.5px] gap-1 h-6" onClick={downloadTemplate}>
            <Download size={12} /> Descargar plantilla
          </Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr className="bg-surface2/50">
                {['CÓDIGO','DNI','AP. PATERNO','AP. MATERNO','NOMBRES','ÁREA','TURNO','AULA'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-text-mute border-r border-b border-border last:border-r-0 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['123456','12345678','GARCIA','TORRES','LUCAS','CIENCIAS','MAÑANA','C-001'],
                ['234567','23456789','MENDOZA','QUIROZ','LUCIA','LETRAS','TARDE','L-002'],
              ].map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-1.5 font-mono text-text-mute border-r border-border last:border-r-0 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-surface2/30 text-[11px] text-text-mute">
          La contraseña inicial de cada alumno será su DNI de 8 dígitos.
        </div>
      </div>
    </div>
  )
}

/* ─── Step 2: Preview ─────────────────────────────────────────── */
function StepPreview({
  file, rows, onBack, onImport, importing,
}: {
  file: File; rows: ParsedRow[]
  onBack: () => void; onImport: () => void; importing: boolean
}) {
  const ok       = rows.filter((r) => r.errores.length === 0).length
  const errCount = rows.filter((r) => r.errores.length > 0).length
  const preview  = rows.slice(0, 10)

  return (
    <>
      <div className="flex flex-col gap-4 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2 border border-border bg-surface2 p-3 text-center">
            <div className="text-[11px] text-text-mute uppercase tracking-wide font-medium mb-1">Total filas</div>
            <div className="text-[24px] font-bold text-text">{rows.length}</div>
          </div>
          <div className="rounded-2 border border-success-light/60 bg-success-light/20 p-3 text-center">
            <div className="text-[11px] text-text-mute uppercase tracking-wide font-medium mb-1">Listos</div>
            <div className="text-[24px] font-bold text-success">{ok}</div>
          </div>
          <div className={cn(
            'rounded-2 border p-3 text-center',
            errCount > 0 ? 'border-danger-light/60 bg-danger-light/20' : 'border-border bg-surface2',
          )}>
            <div className="text-[11px] text-text-mute uppercase tracking-wide font-medium mb-1">Errores</div>
            <div className={cn('text-[24px] font-bold', errCount > 0 ? 'text-danger' : 'text-text-mute')}>{errCount}</div>
          </div>
        </div>

        {/* File info */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-surface2 border border-border rounded-2">
          <div className="w-8 h-8 rounded-2 bg-success-light/40 flex items-center justify-center text-success shrink-0">
            <FileText size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold truncate">{file.name}</div>
            <div className="text-[11px] text-text-mute">{rows.length} filas · {Math.round(file.size / 1024)} KB</div>
          </div>
          {errCount > 0 && (
            <span className="text-[11.5px] text-danger font-medium shrink-0">
              {errCount} fila{errCount > 1 ? 's' : ''} con error{errCount > 1 ? 'es' : ''} serán omitidas
            </span>
          )}
        </div>

        {/* Preview table */}
        <div>
          <div className="text-[11px] text-text-mute uppercase tracking-wide font-semibold mb-2">
            Vista previa — primeras {preview.length} filas de {rows.length}
          </div>
          <div className="border border-border rounded-2 overflow-hidden">
            <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 bg-surface2 z-10">
                  <tr>
                    {['#','Código','DNI','Nombres y Apellidos','Aula','Turno','Estado'].map((h) => (
                      <th key={h} className="px-2.5 py-2 text-left text-[10px] text-text-mute uppercase tracking-wide font-semibold whitespace-nowrap border-b border-border">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => {
                    const hasErr = r.errores.length > 0
                    return (
                      <tr key={r.fila} className={cn(
                        'border-b border-border-s last:border-0 transition-colors',
                        hasErr ? 'bg-danger-light/20' : i % 2 === 0 ? 'bg-white' : 'bg-surface2/40',
                      )}>
                        <td className="px-2.5 py-2 text-text-mute font-mono text-[11px]">{r.fila}</td>
                        <td className="px-2.5 py-2 font-mono font-semibold text-primary text-[11.5px]">
                          {r.codigo || <span className="text-text-mute">—</span>}
                        </td>
                        <td className="px-2.5 py-2 font-mono text-[11.5px]">
                          {r.dni || <span className="text-danger">—</span>}
                        </td>
                        <td className="px-2.5 py-2 max-w-[160px]">
                          <div className="font-medium truncate text-[12px]">
                            {r.apellidos || <span className="text-danger text-[11px]">Sin apellidos</span>}
                          </div>
                          <div className="text-text-mute text-[11px] truncate">{r.nombres}</div>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-semibold text-[11.5px]">
                          {r.aula || <span className="text-text-mute">—</span>}
                        </td>
                        <td className="px-2.5 py-2 text-[11.5px]">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            r.turno === 'Tarde'
                              ? 'bg-warning-light text-warning'
                              : r.turno
                                ? 'bg-primary-light text-primary'
                                : 'bg-surface3 text-text-mute',
                          )}>
                            {r.turno || '—'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          {hasErr ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-light text-danger text-[10px] font-semibold">
                              <AlertTriangle size={9} /> {r.errores[0]}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-light text-success text-[10px] font-semibold">
                              <Check size={9} /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-3.5 flex justify-between items-center bg-surface2/60 shrink-0">
        <Btn variant="secondary" size="sm" onClick={onBack} disabled={importing}>
          ← Cambiar archivo
        </Btn>
        <Btn size="sm" onClick={onImport} disabled={importing || ok === 0}>
          {importing
            ? <><span className="animate-pulse">Importando…</span></>
            : `Importar ${ok} alumno${ok !== 1 ? 's' : ''} →`
          }
        </Btn>
      </footer>
    </>
  )
}

/* ─── Step 3: Result ──────────────────────────────────────────── */
function StepResult({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  const success = result.ok > 0

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Big result card */}
      <div className={cn(
        'rounded-3 p-6 flex flex-col items-center text-center gap-2',
        success ? 'bg-success-light/30 border border-success-light' : 'bg-surface2 border border-border',
      )}>
        <div className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center mb-1',
          success ? 'bg-success text-white' : 'bg-surface3 text-text-mute',
        )}>
          {success ? <Check size={26} /> : <AlertTriangle size={24} />}
        </div>
        <div className={cn('text-[40px] font-bold leading-none', success ? 'text-success' : 'text-text-mute')}>
          {result.ok}
        </div>
        <div className="text-[15px] font-semibold text-text">
          {success
            ? `alumno${result.ok !== 1 ? 's' : ''} importado${result.ok !== 1 ? 's' : ''} correctamente`
            : 'No se pudo importar ningún alumno'}
        </div>
        {success && (
          <div className="text-[12.5px] text-text-mute">
            La contraseña inicial de cada alumno es su DNI de 8 dígitos.
          </div>
        )}
      </div>

      {/* Error list */}
      {result.errores.length > 0 && (
        <div>
          <div className="text-[11.5px] font-semibold text-danger uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {result.errores.length} fila{result.errores.length > 1 ? 's' : ''} con error
          </div>
          <div className="border border-border rounded-2 overflow-hidden max-h-[200px] overflow-y-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-surface2">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] text-text-mute uppercase font-semibold w-14 border-b border-border">Fila</th>
                  <th className="px-3 py-2 text-left text-[10px] text-text-mute uppercase font-semibold border-b border-border">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {result.errores.map((e, i) => (
                  <tr key={e.fila} className={cn('border-b border-border-s last:border-0', i % 2 === 0 ? 'bg-danger-light/10' : 'bg-white')}>
                    <td className="px-3 py-2 font-mono text-danger font-semibold">{e.fila}</td>
                    <td className="px-3 py-2 text-text">{e.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Btn onClick={onClose}>Listo</Btn>
      </div>
    </div>
  )
}

/* ─── Main modal ──────────────────────────────────────────────── */
export function ImportExcelModal({ onClose }: { onClose: () => void }) {
  const [step,       setStep]       = React.useState<Step>(1)
  const [file,       setFile]       = React.useState<File | null>(null)
  const [rows,       setRows]       = React.useState<ParsedRow[]>([])
  const [parsing,    setParsing]    = React.useState(false)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const [result,     setResult]     = React.useState<ImportResult | null>(null)
  const importar = useImportarAlumnos()

  async function handleFile(f: File) {
    setFile(f)
    setParsing(true)
    setParseError(null)
    try {
      const parsed = await parseExcel(f)
      setRows(parsed)
      setStep(2)
    } catch (err: any) {
      setParseError(err.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!file) return
    try {
      const res = await importar.mutateAsync(file)
      setResult(res)
      setStep(3)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al importar. Intenta nuevamente.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,20,35,.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[660px] max-h-[90vh] flex flex-col bg-surface rounded-4 shadow-3 border border-border overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="m-0 font-serif text-[19px] font-semibold tracking-tight text-text">
              Importar alumnos desde Excel
            </h2>
            <p className="text-[12px] text-text-mute mt-0.5">
              Importa múltiples alumnos a partir del archivo Excel del ciclo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-2 text-text-mute hover:text-text hover:bg-surface2 transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </header>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {step === 1 && (
            <>
              {parsing ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3 text-text-mute">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px]">Analizando archivo…</span>
                </div>
              ) : (
                <StepUpload onFile={handleFile} error={parseError} />
              )}
            </>
          )}

          {step === 2 && file && (
            <StepPreview
              file={file}
              rows={rows}
              onBack={() => { setFile(null); setRows([]); setStep(1) }}
              onImport={handleImport}
              importing={importar.isPending}
            />
          )}

          {step === 3 && result && (
            <StepResult result={result} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}
