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
  // HSL en vez de oklch: se renderiza bien en Chrome viejo (el kiosco puede
  // correr en hardware antiguo). Fondo cálido claro + texto cálido oscuro.
  const bg  = `hsl(${hue}, 55%, 82%)`
  const fg  = `hsl(${hue}, 45%, 28%)`

  return (
    <div
      className={cn('shrink-0 rounded-full overflow-hidden flex items-center justify-center border border-border-s relative', className)}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38, fontWeight: 600, lineHeight: 1 }}
    >
      <span>{initials || '?'}</span>
      {src && (
        <img
          src={src}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}
    </div>
  )
}
