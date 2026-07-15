'use client'

import * as React from 'react'
import { Btn } from '@/components/ui/btn'
import { X, Upload, FileText, Check, AlertTriangle } from '@/components/icons'
import { useImportarFotos, type FotosImportResult } from '@/hooks/use-alumnos'
import { cn } from '@/lib/utils'

/* ─── Paso 1: subida ─────────────────────────────────────────────── */
function StepUpload({ onFile, error }: { onFile: (f: File) => void; error?: string | null }) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handle(f: File) {
    if (!f.name.match(/\.zip$/i)) { alert('Solo se acepta un archivo .zip'); return }
    onFile(f)
  }

  return (
    <div className="p-6 flex flex-col gap-5">
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
            {dragging ? 'Suelta el archivo aquí' : 'Arrastra el ZIP de fotos aquí'}
          </div>
          <div className="text-[12.5px] text-text-mute mt-1">o haz clic para seleccionar  ·  .zip</div>
        </div>
        <input ref={inputRef} type="file" accept=".zip" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-danger-light border border-danger-light/60 rounded-2 text-[12.5px] text-danger">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-2 border border-border bg-surface2/50 px-4 py-3 flex flex-col gap-1.5">
        <span className="text-[11.5px] font-semibold text-text-mute uppercase tracking-wide">
          Cómo se asignan las fotos
        </span>
        <ul className="text-[12.5px] text-text list-disc pl-4 flex flex-col gap-1">
          <li>Cada imagen se asigna a su alumno por el <strong>DNI que aparece en el nombre del archivo</strong> (ej. <code className="font-mono text-[11.5px]">0309<strong>60522696</strong>432026-I29.jpg</code>).</li>
          <li>Formatos aceptados dentro del ZIP: <strong>.jpg</strong>, <strong>.jpeg</strong> y <strong>.png</strong>.</li>
          <li>Si una foto ya existía, se <strong>reemplaza</strong>.</li>
          <li>Los archivos que no casen con ningún DNI (o casen con varios) se listan al final sin aplicarse.</li>
        </ul>
      </div>
    </div>
  )
}

/* ─── Paso 2: confirmación ───────────────────────────────────────── */
function StepConfirm({ file, onBack, onImport }: { file: File; onBack: () => void; onImport: () => void }) {
  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-3 border border-border bg-surface2/40 px-4 py-3.5">
        <div className="w-10 h-10 rounded-2 bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{file.name}</div>
          <div className="text-[11.5px] text-text-mute mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-warning-light/40 border border-warning-light rounded-2 text-[12.5px] text-text">
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-warning" />
        <span>
          Las fotos se suben una a una al almacenamiento. Con muchas imágenes puede tardar varios minutos;
          no cierres esta ventana.
        </span>
      </div>

      <div className="flex justify-between">
        <Btn variant="secondary" onClick={onBack}>Cambiar archivo</Btn>
        <Btn onClick={onImport}>Cargar fotos →</Btn>
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

function ListaArchivos({ titulo, archivos }: { titulo: string; archivos: string[] }) {
  if (!archivos.length) return null
  return (
    <div>
      <div className="text-[11.5px] font-semibold text-text-mute uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <AlertTriangle size={12} />
        {archivos.length} {titulo}
      </div>
      <div className="border border-border rounded-2 overflow-hidden max-h-[150px] overflow-y-auto">
        {archivos.map((a, i) => (
          <div key={a} className={cn('px-3 py-1.5 font-mono text-[11.5px] text-text border-b border-border-s last:border-0', i % 2 === 1 && 'bg-surface2/40')}>
            {a}
          </div>
        ))}
      </div>
    </div>
  )
}

function StepResult({ result, onClose }: { result: FotosImportResult; onClose: () => void }) {
  const success = result.actualizados > 0

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
          {result.actualizados}
        </div>
        <div className="text-[15px] font-semibold text-text">
          {success
            ? `foto${result.actualizados !== 1 ? 's' : ''} asignada${result.actualizados !== 1 ? 's' : ''}`
            : 'No se asignó ninguna foto'}
        </div>
        <div className="text-[12.5px] text-text-mute">
          {result.procesados} imagen{result.procesados !== 1 ? 'es' : ''} en el ZIP
        </div>
      </div>

      <div className="flex gap-2.5">
        <Stat n={result.procesados}             label="En el ZIP" />
        <Stat n={result.actualizados}           label="Asignadas" />
        <Stat n={result.sinCoincidencia.length} label="Sin alumno" />
        <Stat n={result.ambiguos.length}        label="Ambiguas" />
      </div>

      <ListaArchivos titulo="sin alumno coincidente" archivos={result.sinCoincidencia} />
      <ListaArchivos titulo="con DNI ambiguo (casan con varios alumnos)" archivos={result.ambiguos} />

      {result.errores.length > 0 && (
        <div>
          <div className="text-[11.5px] font-semibold text-danger uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {result.errores.length} archivo{result.errores.length > 1 ? 's' : ''} con error
          </div>
          <div className="border border-border rounded-2 overflow-hidden max-h-[160px] overflow-y-auto">
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {result.errores.map((e, i) => (
                  <tr key={`${e.archivo}-${i}`} className={cn('border-b border-border-s last:border-0', i % 2 === 0 && 'bg-danger-light/10')}>
                    <td className="px-3 py-2 font-mono text-[11.5px] text-danger">{e.archivo}</td>
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
export function ImportFotosModal({ onClose }: { onClose: () => void }) {
  const [file,   setFile]   = React.useState<File | null>(null)
  const [result, setResult] = React.useState<FotosImportResult | null>(null)
  const [error,  setError]  = React.useState<string | null>(null)
  const importar = useImportarFotos()

  async function handleImport() {
    if (!file) return
    setError(null)
    try {
      setResult(await importar.mutateAsync(file))
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Error al cargar las fotos. Intenta nuevamente.')
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
              Cargar fotos de alumnos
            </h2>
            <p className="text-[12px] text-text-mute mt-0.5">
              Sube un ZIP con las fotos; se asignan por el DNI del nombre de archivo
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
                  <span className="text-[13px]">Cargando fotos…</span>
                  <span className="text-[11.5px]">Puede tardar varios minutos</span>
                </div>
              )
              : file
                ? <StepConfirm file={file} onBack={() => setFile(null)} onImport={handleImport} />
                : <StepUpload onFile={setFile} error={error} />}
        </div>
      </div>
    </div>
  )
}
