import { cn } from '@/lib/utils'

type DotTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface DotProps {
  tone?: DotTone
  size?: number
  className?: string
}

const toneClass: Record<DotTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  neutral: 'bg-text-soft',
}

export function Dot({ tone = 'success', size = 8, className }: DotProps) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', toneClass[tone], className)}
      style={{ width: size, height: size }}
    />
  )
}
