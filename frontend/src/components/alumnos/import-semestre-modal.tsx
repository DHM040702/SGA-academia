'use client'

import * as React from 'react'
import { Btn } from '@/components/ui/btn'
import { X, Upload, FileText, Check, AlertTriangle } from '@/components/icons'
import { useImportarSemestre, type SemestreImportResult } from '@/hooks/use-alumnos'
import { cn } from '@/lib/utils'

/* ─── Columnas del CSV oficial (para la guía de formato) ────────── */
const COLUMNAS: { col: string; uso: string }[] = [
  { col: 'Nombre / Apellido Paterno / Apellido Materno', uso: 'Nombre y apellidos del alumno' },
  { col: 'DNI',                    uso: 'Identifica al alumno · usuario y contraseña inicial' },
  { col: 'Código de Inscripción',  uso: 'Código de barras del carnet (el que escanea el kiosco)' },
  { col: 'Área de Carrera',        uso: '1 = ciencias · 2 = letras · 3 = médicas' },
  { col: 'Carrera',                uso: 'Se crea/enlaza automáticamente' },
  { col: 'Nombre de Turno',        uso: 'MAÑANA / TARDE' },
  { col: 'Número de Celular',      uso: 'Teléfono del alumno' },
  { col: 'colegio / Quinto / Veces Matriculado', uso: 'Datos del alumno' },
  { col: 'Nombre + Apellidos Apoderado', uso: 'Crea el apoderado y su cuenta' },
  { col: 'Tipo/Banco/Código/Fecha/Monto de Cuota', uso: 'Registra la cuota del alumno' },
]

/* ─── Paso 1: subida ─────────────────────────────────────────────── */
function StepUpload({ onFile, error }: { onFile: (f: File) => void; error?: string | null }) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handle(f: File) {
    if (!f.name.match(/\.csv$/i)) { alert('Solo se aceptan archivos .csv'); return }
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
            {dragging ? 'Suelta el archivo aquí' : 'Arrastra el CSV de matrícula aquí'}
          </div>
          <div className="text-[12.5px] text-text-mute mt-1">o haz clic para seleccionar  ·  .csv</div>
        </div>
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-danger-light border border-danger-light/60 rounded-2 text-[12.5px] text-danger">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Qué hará el import */}
      <div className="rounded-2 border border-border bg-surface2/50 px-4 py-3 flex flex-col gap-1.5">
        <span className="text-[11.5px] font-semibold text-text-mute uppercase tracking-wide">
          Qué hace este import
        </span>
        <ul className="text-[12.5px] text-text list-disc pl-4 flex flex-col gap-1">
          <li>Da de alta a los alumnos nuevos y <strong>re-matricula</strong> a los que ya existían (por DNI).</li>
          <li>Reparte a cada alumno en una sección del <strong>ciclo activo</strong> según su área y turno (C-001, L-001, M-001…), respetando el cupo de 40.</li>
          <li>Usa el <strong>Código de Inscripción</strong> como código de barras del carnet.</li>
          <li>Crea la carrera si no existe, el <strong>apoderado</strong> con su cuenta y registra la <strong>cuota</strong>.</li>
        </ul>
      </div>

      {/* Guía de columnas */}
      <div className="rounded-2 border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-surface2 border-b border-border">
          <span className="text-[11.5px] font-semibold text-text-mute uppercase tracking-wide">
            Columnas que se usan del CSV oficial
          </span>
        </div>
        <div className="overflow-x-auto max-h-[190px] overflow-y-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <tbody>
              {COLUMNAS.map((c, i) => (
                <tr key={c.col} className={cn('border-b border-border-s last:border-0', i % 2 === 1 && 'bg-surface2/40')}>
                  <td className="px-3 py-2 font-semibold text-text whitespace-nowrap align-top">{c.col}</td>
                  <td className="px-3 py-2 text-text-mute">{c.uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Paso 2: confirmación ───────────────────────────────────────── */
function StepConfirm({
  file, onBack, onImport, importing,
}: {
  file: File; onBack: () => void; onImport: () => void; importing: boolean
}) {
  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-3 border border-border bg-surface2/40 px-4 py-3.5">
        <div className="w-10 h-10 rounded-2 bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{file.name}</div>
          <div className="text-[11.5px] text-text-mute mt-0.5">
            {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-warning-light/40 border border-warning-light rounded-2 text-[12.5px] text-text">
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-warning" />
        <span>
          El archivo se procesa en el servidor y los alumnos se matriculan en el <strong>ciclo activo</strong>.
          Si el archivo es grande puede tardar; no cierres esta ventana.
        </span>
      </div>

      <div className="flex justify-between">
        <Btn variant="secondary" onClick={onBack} disabled={importing}>Cambiar archivo</Btn>
        <Btn onClick={onImport} disabled={importing}>
          {importing ? 'Importando…' : 'Importar alumnos →'}
        </Btn>
      </div>
    </div>
  )
}

/* ─── Paso 3: resultado ──────────────────────────────────────────── */
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex-1 rounded-2 border border-border bg-surface px-3 py-2.5 text-center">
      <div className="text-[19px] font-bold leading-none text-text">{n}</div>
      <div className="text-[10.5px] text-text-mute uppercase tracking-wide mt-1">{label}</div>
    </div>
  )
}

function StepResult({ result, onClose }: { result: SemestreImportResult; onClose: () => void }) {
  const success = result.ok > 0

  return (
    <div className="p-6 flex flex-col gap-5">
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
            ? `alumno${result.ok !== 1 ? 's' : ''} procesado${result.ok !== 1 ? 's' : ''} correctamente`
            : 'No se pudo importar ningún alumno'}
        </div>
        {success && result.creados > 0 && (
          <div className="text-[12.5px] text-text-mute">
            La contraseña inicial del alumno es su DNI. El apoderado ingresa con <strong>9 + DNI del alumno</strong> y la misma contraseña.
          </div>
        )}
      </div>

      {/* Desglose */}
      <div className="flex gap-2.5">
        <Stat n={result.creados}      label="Nuevos" />
        <Stat n={result.actualizados} label="Re-matriculados" />
        <Stat n={result.apoderados}   label="Apoderados" />
        <Stat n={result.pagos}        label="Cuotas" />
      </div>

      {/* Errores */}
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
                  <tr key={`${e.fila}-${i}`} className={cn('border-b border-border-s last:border-0', i % 2 === 0 && 'bg-danger-light/10')}>
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

/* ─── Modal ──────────────────────────────────────────────────────── */
export function ImportSemestreModal({ onClose }: { onClose: () => void }) {
  const [file,   setFile]   = React.useState<File | null>(null)
  const [result, setResult] = React.useState<SemestreImportResult | null>(null)
  const [error,  setError]  = React.useState<string | null>(null)
  const importar = useImportarSemestre()

  async function handleImport() {
    if (!file) return
    setError(null)
    try {
      const res = await importar.mutateAsync(file)
      setResult(res)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Error al importar. Intenta nuevamente.')
      setFile(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,20,35,.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !importar.isPending) onClose() }}
    >
      <div className="w-[660px] max-h-[90vh] flex flex-col bg-surface rounded-4 shadow-3 border border-border overflow-hidden">

        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="m-0 font-serif text-[19px] font-semibold tracking-tight text-text">
              Importar matrícula del semestre
            </h2>
            <p className="text-[12px] text-text-mute mt-0.5">
              Sube el CSV oficial de matrícula: alumnos, aulas, carreras, apoderados y cuotas
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={importar.isPending}
            className="p-1.5 rounded-2 text-text-mute hover:text-text hover:bg-surface2 transition-colors bg-transparent border-none cursor-pointer disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {result
            ? <StepResult result={result} onClose={onClose} />
            : importar.isPending
              ? (
                <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3 text-text-mute">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px]">Importando alumnos…</span>
                  <span className="text-[11.5px]">Puede tardar en archivos grandes</span>
                </div>
              )
              : file
                ? <StepConfirm file={file} onBack={() => setFile(null)} onImport={handleImport} importing={importar.isPending} />
                : <StepUpload onFile={setFile} error={error} />}
        </div>
      </div>
    </div>
  )
}
