import { cn } from '@/lib/utils'
import * as React from 'react'

type PillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface PillProps {
  tone?: PillTone
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const toneClass: Record<PillTone, string> = {
  neutral: 'bg-surface3 text-text-mute border-border',
  primary: 'bg-primary-light text-primary-dark border-transparent',
  success: 'bg-success-light text-success border-transparent',
  warning: 'bg-warning-light text-[oklch(0.45_0.10_70)] border-transparent',
  danger:  'bg-danger-light text-danger border-transparent',
  info:    'bg-info-light text-info border-transparent',
}

export function Pill({ tone = 'neutral', children, className, style }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-px',
        'rounded-full border text-[11px] font-medium leading-5 whitespace-nowrap tracking-[0.01em]',
        toneClass[tone],
        className,
      )}
      style={style}
    >
      {children}
    </span>
  )
}
