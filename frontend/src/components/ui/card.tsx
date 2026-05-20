import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  pad?: number
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Card({ title, subtitle, action, pad = 18, children, className, style }: CardProps) {
  const hasHeader = Boolean(title || action)
  const headerPb  = subtitle ? 0 : pad

  return (
    <section
      className={cn('bg-surface border border-border rounded-3 shadow-1', className)}
      style={style}
    >
      {hasHeader && (
        <header
          className="flex items-start justify-between gap-3"
          style={{ padding: `${pad}px ${pad}px ${headerPb}px` }}
        >
          <div>
            <h3 className="m-0 font-serif text-[17px] font-semibold text-text tracking-[-0.01em] leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-[12px] text-text-mute">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div style={{ padding: hasHeader ? `${pad - 4}px ${pad}px ${pad}px` : pad }}>
        {children}
      </div>
    </section>
  )
}
