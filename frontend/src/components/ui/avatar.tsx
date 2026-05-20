import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string
  src?: string
  size?: number
  className?: string
}

/** Deterministic warm hue from name — mirrors system.jsx Avatar logic. */
function nameHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0)
  return (h % 60) + 20 // warm 20–80 range
}

export function Avatar({ name = '', src, size = 32, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(s => s[0] ?? '')
    .join('')
    .toUpperCase()

  const hue = nameHue(name)
  const bg  = `oklch(0.88 0.04 ${hue})`
  const fg  = `oklch(0.30 0.08 ${hue})`

  return (
    <div
      className={cn('shrink-0 rounded-full overflow-hidden flex items-center justify-center border border-border-s', className)}
      style={{ width: size, height: size, background: src ? 'transparent' : bg, color: fg, fontSize: size * 0.38, fontWeight: 600 }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <span style={{ fontFamily: 'var(--font-sans)' }}>{initials}</span>
      }
    </div>
  )
}
