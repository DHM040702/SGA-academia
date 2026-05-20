import * as React from 'react'
import { cn } from '@/lib/utils'

interface KPIProps {
  label: string
  value: string | number
  /** Secondary line below value, e.g. "de 892 matriculados" */
  sub?: string
  /** Numeric delta, e.g. +4 renders "↑ 4%" in green, -2 renders "↓ 2%" in red */
  trend?: number
  /** Left accent bar color, e.g. T.primary or a status color */
  accent?: string
  icon?: React.ReactNode
  className?: string
}

export function KPI({ label, value, sub, trend, accent, icon, className }: KPIProps) {
  return (
    <div className={cn('relative overflow-hidden bg-surface border border-border rounded-3 shadow-1 p-[18px]', className)}>
      {/* Left accent bar */}
      {accent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: accent }}
        />
      )}

      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11.5px] font-medium text-text-mute uppercase tracking-[0.05em]">
          {label}
        </span>
        {icon && <span className="text-text-soft flex">{icon}</span>}
      </div>

      {/* Value + trend */}
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[32px] font-semibold text-text tracking-[-0.02em] leading-none">
          {value}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11.5px] font-semibold',
              trend > 0 ? 'text-success' : 'text-danger',
            )}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Sub-label */}
      {sub && <div className="mt-1 text-[12px] text-text-mute">{sub}</div>}
    </div>
  )
}
