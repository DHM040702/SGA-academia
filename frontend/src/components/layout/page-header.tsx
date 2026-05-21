import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Crumb = string | { label: string; href?: string }

interface PageHeaderProps {
  title: React.ReactNode
  crumbs?: Crumb[]
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, crumbs, action, children, className }: PageHeaderProps) {
  return (
    <div className={cn('px-7 pt-[22px]', className)}>
      {crumbs && crumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-[11.5px] text-text-mute mb-2">
          {crumbs.map((c, i) => {
            const label = typeof c === 'string' ? c : c.label
            const href  = typeof c === 'string' ? undefined : c.href
            const isLast = i === crumbs.length - 1
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="opacity-50">/</span>}
                {href ? (
                  <Link href={href} className={cn('hover:text-primary transition-colors', isLast ? 'text-text' : '')}>
                    {label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-text' : ''}>{label}</span>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="m-0 font-serif font-semibold text-[28px] text-text tracking-[-0.02em] leading-[1.1]">
          {title}
        </h1>
        {action && <div className="flex gap-2 shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
