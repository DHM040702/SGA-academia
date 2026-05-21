'use client'
import * as React from 'react'
import * as XLSX from 'xlsx'
import { Btn } from '@/components/ui/btn'
import { Pill } from '@/components/ui/pill'
import { Dot } from '@/components/ui/dot'
import { X, Upload, FileText, Download } from '@/components/icons'
import { useImportarAlumnos, type ImportResult } from '@/hooks/use-alumnos'
import { cn } from '@/lib/utils'

/* ─── Types ───────────────────────────────────────────────────── */
interface ParsedRow {
  fila: number
  dni: string
  nombres: string
  apellidos: string
  email: string
  fecha_nacimiento?: string
  telefono?: string
  errores: string[]
  avisos: string[]
}

type Step = 1 | 2 | 3

/* ─── Helpers ─────────────────────────────────────────────────── */
function validateRow(r: ParsedRow): void {
  if (!r.dni) r.errores.push('DNI requerido')
  else if (!/^\d{8}$/.test(r.dni)) r.errores.push('DNI debe tener 8 dígitos')
  if (!r.nombres || r.nombres.length < 2) r.errores.push('Nombres requerido (mín. 2 car.)')
  if (!r.apellidos || r.apellidos.length < 2) r.errores.push('Apellidos requerido (mín. 2 car.)')
  if (!r.email) r.errores.push('Email requerido')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) r.errores.push('Email no válido')
}

function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const rows: ParsedRow[] = raw.map((r, i) => {
          const row: ParsedRow = {
            fila: i + 2,
            dni: String(r['DNI'] ?? r['dni'] ?? '').trim(),
            nombres: String(r['Nombres'] ?? r['nombres'] ?? '').trim(),
            apellidos: String(r['Apellidos'] ?? r['apellidos'] ?? '').trim(),
            email: String(r['Email'] ?? r['email'] ?? r['Correo'] ?? '').trim(),
            fecha_nacimiento: r['Fecha_nacimiento'] ?? r['FechaNacimiento'] ?? undefined,
            telefono: String(r['Telefono'] ?? r['telefono'] ?? '').trim() || undefined,
            errores: [],
            avisos: [],
          }
          validateRow(row)
          return row
        })
        resolve(rows)
      } catch (err) {
        reject(new Error('No se pudo leer el archivo Excel'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsBinaryString(file)
  })
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['DNI', 'Nombres', 'Apellidos', 'Email', 'Fecha_nacimiento', 'Telefono'],
    ['76543210', 'Lucía', 'Mendoza Quiroz', 'lucia.mendoza@cepreunasam.edu.pe', '2005-03-14', '+51943221887'],
    ['76112233', 'Diego', 'Salazar Romero', 'diego.salazar@cepreunasam.edu.pe', '', ''],
  ])
  ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 38 }, { wch: 18 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
  XLSX.writeFile(wb, 'plantilla_alumnos.xlsx')
}

/* ─── Stepper ─────────────────────────────────────────────────── */
function Stepper({ step }: { step: Step }) {
  const labels = ['Subir archivo', 'Validar datos', 'Resultado']
  return (
    <div className="flex items-center px-5 py-3.5 gap-1 border-b border-border-s bg-surface2">
      {labels.map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold',
                  done ? 'bg-primary text-white' : active ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-surface3 text-text-mute',
                )}
              >
                {done ? '✓' : n}
              </div>
              <span className={cn('text-[12.5px]', active ? 'font-semibold text-text' : done ? 'text-text' : 'text-text-mute')}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={cn('flex-1 h-px mx-2', done ? 'bg-primary' : 'bg-border')} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ─── Step 1: Drop zone ───────────────────────────────────────── */
function StepUpload({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handle(f: File) {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      alert('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    onFile(f)
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-3 flex flex-col items-center justify-center py-12 gap-3 cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface2',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-11 h-11 rounded-2 bg-primary/10 flex items-center justify-center text-primary">
          <Upload size={20} />
        </div>
        <div className="text-center">
          <div className="text-[13.5px] font-semibold text-text">Arrastra tu archivo Excel aquí</div>
          <div className="text-[12px] text-text-mute mt-0.5">o haz clic para seleccionar · .xlsx / .xls</div>
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      </div>

      {/* Format guide */}
      <div className="bg-surface2 border border-border-s rounded-2 p-3.5">
        <div className="text-[11.5px] font-semibold text-text-mute uppercase tracking-wide mb-2">Columnas requeridas</div>
        <div className="flex flex-wrap gap-1.5">
          {['DNI', 'Nombres', 'Apellidos', 'Email'].map((c) => (
            <Pill key={c} tone="primary">{c}</Pill>
          ))}
          {['Fecha_nacimiento', 'Telefono'].map((c) => (
            <Pill key={c} tone="neutral">{c} <span className="opacity-60 text-[10px]">opcional</span></Pill>
          ))}
        </div>
        <div className="text-[11.5px] text-text-mute mt-2.5">
          La contraseña inicial de cada alumno será su DNI. Puedes cambiarlo después.
        </div>
      </div>
    </div>
  )
}

/* ─── Step 2: Preview & validate ─────────────────────────────── */
function StepPreview({
  file, rows, onBack, onImport, importing,
}: {
  file: File; rows: ParsedRow[]
  onBack: () => void; onImport: () => void; importing: boolean
}) {
  const ok = rows.filter((r) => r.errores.length === 0).length
  const errCount = rows.filter((r) => r.errores.length > 0).length
  const preview = rows.slice(0, 8)

  const fileSizeKb = Math.round(file.size / 1024)

  return (
    <>
      <div className="p-5 flex flex-col gap-3.5">
        {/* File summary */}
        <div className="flex items-center gap-3 p-3 bg-surface2 border border-border-s rounded-2">
          <div className="w-9 h-9 rounded-2 bg-success-light flex items-center justify-center text-success shrink-0">
            <FileText size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">{file.name}</div>
            <div className="text-[11.5px] text-text-mute">{rows.length} filas · {fileSizeKb} KB</div>
          </div>
          <Pill tone={errCount === 0 ? 'success' : 'warning'}>
            <Dot tone={errCount === 0 ? 'success' : 'warning'} size={6} />
            {errCount === 0 ? 'Sin errores' : `${errCount} error${errCount > 1 ? 'es' : ''}`}
          </Pill>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2 border border-success-light bg-success-light/40 p-3 text-center">
            <div className="text-[22px] font-bold text-success">{ok}</div>
            <div className="text-[11.5px] text-text-mute mt-0.5">Listos para importar</div>
          </div>
          <div className={cn('rounded-2 border p-3 text-center', errCount > 0 ? 'border-danger-light bg-danger-light/40' : 'border-border-s bg-surface2')}>
            <div className={cn('text-[22px] font-bold', errCount > 0 ? 'text-danger' : 'text-text-mute')}>{errCount}</div>
            <div className="text-[11.5px] text-text-mute mt-0.5">Errores (no se importan)</div>
          </div>
        </div>

        {/* Preview table */}
        <div>
          <div className="text-[11px] text-text-mute uppercase tracking-wide font-semibold mb-1.5">
            Vista previa · {Math.min(8, rows.length)} de {rows.length} filas
          </div>
          <div className="border border-border rounded-2 overflow-hidden text-[12px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface2">
                  {['#', 'DNI', 'Nombres', 'Apellidos', 'Email', ''].map((h) => (
                    <th key={h} className="px-2.5 py-2 text-left text-[10.5px] text-text-mute uppercase tracking-wide font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => {
                  const hasErr = r.errores.length > 0
                  return (
                    <tr key={r.fila} className={cn('border-t border-border-s', hasErr && 'bg-danger-light/30')}>
                      <td className="px-2.5 py-1.5 text-text-mute font-mono">{r.fila}</td>
                      <td className="px-2.5 py-1.5 font-mono">{r.dni || <span className="text-danger">—</span>}</td>
                      <td className="px-2.5 py-1.5">{r.nombres || <span className="text-danger">—</span>}</td>
                      <td className="px-2.5 py-1.5">{r.apellidos || <span className="text-danger">—</span>}</td>
                      <td className="px-2.5 py-1.5 text-text-mute truncate max-w-[140px]">{r.email || <span className="text-danger">—</span>}</td>
                      <td className="px-2.5 py-1.5 text-right">
                        {hasErr
                          ? <Pill tone="danger" className="text-[10px]">{r.errores[0]}</Pill>
                          : <Pill tone="success" className="text-[10px]">✓</Pill>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-5 py-3 flex justify-between items-center bg-surface2">
        {errCount > 0 ? (
          <span className="text-[12px] text-danger">{errCount} filas con errores serán omitidas</span>
        ) : (
          <span className="text-[12px] text-text-mute" />
        )}
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={onBack} disabled={importing}>Atrás</Btn>
          <Btn size="sm" onClick={onImport} disabled={importing || ok === 0}>
            {importing ? 'Importando…' : `Importar ${ok} alumno${ok !== 1 ? 's' : ''} →`}
          </Btn>
        </div>
      </footer>
    </>
  )
}

/* ─── Step 3: Result ──────────────────────────────────────────── */
function StepResult({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className={cn(
        'rounded-3 p-5 flex flex-col items-center text-center gap-2',
        result.ok > 0 ? 'bg-success-light/40' : 'bg-surface2',
      )}>
        <div className={cn('text-[36px] font-bold', result.ok > 0 ? 'text-success' : 'text-text-mute')}>
          {result.ok}
        </div>
        <div className="text-[14px] font-semibold">
          {result.ok > 0
            ? `alumno${result.ok !== 1 ? 's' : ''} importado${result.ok !== 1 ? 's' : ''} correctamente`
            : 'No se importó ningún alumno'}
        </div>
      </div>

      {result.errores.length > 0 && (
        <div>
          <div className="text-[11.5px] font-semibold text-danger uppercase tracking-wide mb-2">
            {result.errores.length} fila{result.errores.length > 1 ? 's' : ''} con error
          </div>
          <div className="border border-border rounded-2 overflow-hidden text-[12px] max-h-[180px] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-surface2">
                <tr>
                  <th className="px-3 py-2 text-left text-[10.5px] text-text-mute uppercase tracking-wide font-semibold w-12">Fila</th>
                  <th className="px-3 py-2 text-left text-[10.5px] text-text-mute uppercase tracking-wide font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {result.errores.map((e) => (
                  <tr key={e.fila} className="border-t border-border-s bg-danger-light/20">
                    <td className="px-3 py-1.5 font-mono text-danger">{e.fila}</td>
                    <td className="px-3 py-1.5 text-text">{e.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
      </div>
    </div>
  )
}

/* ─── Main modal ──────────────────────────────────────────────── */
export function ImportExcelModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = React.useState<Step>(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [rows, setRows] = React.useState<ParsedRow[]>([])
  const [parsing, setParsing] = React.useState(false)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<ImportResult | null>(null)
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
      alert(err?.response?.data?.message ?? 'Error al importar')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(30,22,14,.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[640px] max-h-[88vh] flex flex-col bg-surface rounded-4 shadow-3 border border-border overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between px-5 pt-4 pb-3.5 border-b border-border shrink-0">
          <div>
            <h2 className="m-0 font-serif text-[20px] font-semibold tracking-tight">
              Importar alumnos desde Excel
            </h2>
            <div className="text-[12.5px] text-text-mute mt-1">
              Paso {step} de 3 · {['Subir archivo', 'Validar datos', 'Resultado'][step - 1]}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Btn variant="ghost" size="sm" className="text-[12px]" onClick={downloadTemplate}>
              <Download size={13} />Plantilla
            </Btn>
            <Btn variant="ghost" size="sm" className="p-1.5" onClick={onClose}>
              <X size={15} />
            </Btn>
          </div>
        </header>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <>
              {parsing && (
                <div className="flex items-center justify-center py-16 text-text-mute text-[13px]">
                  Analizando archivo…
                </div>
              )}
              {!parsing && (
                <>
                  <StepUpload onFile={handleFile} />
                  {parseError && (
                    <div className="mx-5 mb-4 px-3 py-2.5 bg-danger-light border border-danger-light rounded-2 text-[12.5px] text-danger">
                      {parseError}
                    </div>
                  )}
                </>
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
