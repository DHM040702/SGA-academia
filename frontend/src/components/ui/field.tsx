import * as React from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <div className="mb-1.5 text-[12px] font-medium text-text">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </div>
      {children}
      {error && <div className="mt-1 text-[11px] text-danger">{error}</div>}
      {!error && hint && <div className="mt-1 text-[11px] text-text-mute">{hint}</div>}
    </label>
  )
}
