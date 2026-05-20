'use client'

import * as React from 'react'

interface BarcodeProps {
  value: string | number
  w?: number
  h?: number
  className?: string
}

/** Deterministic bar pattern from value — mirrors system.jsx Barcode logic. */
function buildBars(value: string, w: number, barH: number): { x: number; width: number }[] {
  let seed = 0
  for (const ch of value) seed = ((seed * 31 + ch.charCodeAt(0)) >>> 0)

  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  const bars: { x: number; width: number }[] = []
  let x = 0
  while (x < w - 2) {
    const bw = 1 + Math.floor(rand() * 3)
    const isBlack = rand() > 0.45
    if (isBlack) bars.push({ x, width: bw })
    x += bw + 1
  }
  return bars
}

export function Barcode({ value, w = 240, h = 60, className }: BarcodeProps) {
  const str  = String(value)
  const barH = h - 14
  const bars = React.useMemo(() => buildBars(str, w, barH), [str, w, barH])

  return (
    <div className={className} style={{ width: w }}>
      <svg width={w} height={barH} style={{ display: 'block' }}>
        {bars.map(b => (
          <rect key={b.x} x={b.x} y={0} width={b.width} height={barH} fill="#111" />
        ))}
      </svg>
      <div
        className="mt-[3px] text-center text-[11px] text-[#111]"
        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.4em' }}
      >
        {str}
      </div>
    </div>
  )
}
