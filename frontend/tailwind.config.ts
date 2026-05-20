import type { Config } from 'tailwindcss'

// Design tokens from system.jsx
// These values are the single source of truth for the SGA design system.
// The same values are exposed as CSS variables via @theme in globals.css.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ─── Typography ───────────────────────────────────────────
      fontFamily: {
        serif: ["'Crimson Pro'", 'Iowan Old Style', 'Georgia', 'serif'],
        sans:  ["'Inter'", '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono:  ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },

      // ─── Colors ───────────────────────────────────────────────
      colors: {
        // Brand
        primary:    { DEFAULT: 'oklch(0.36 0.10 255)', dark: 'oklch(0.28 0.11 255)', light: 'oklch(0.94 0.025 255)' },
        // Surfaces (warm paper-like neutrals)
        bg:         'oklch(0.985 0.006 80)',
        surface:    '#ffffff',
        surface2:   'oklch(0.97 0.008 80)',
        surface3:   'oklch(0.95 0.010 80)',
        // Borders
        border:     'oklch(0.90 0.008 80)',
        'border-s': 'oklch(0.93 0.008 80)',
        divider:    'oklch(0.88 0.008 80)',
        // Text
        text:       { DEFAULT: 'oklch(0.22 0.012 60)', mute: 'oklch(0.45 0.012 60)', soft: 'oklch(0.58 0.010 60)', inv: 'oklch(0.97 0.006 80)' },
        // Status
        success:    { DEFAULT: 'oklch(0.55 0.13 145)',  light: 'oklch(0.94 0.04 145)' },
        warning:    { DEFAULT: 'oklch(0.68 0.14 70)',   light: 'oklch(0.95 0.05 70)' },
        danger:     { DEFAULT: 'oklch(0.55 0.16 25)',   light: 'oklch(0.94 0.04 25)' },
        info:       { DEFAULT: 'oklch(0.55 0.13 240)',  light: 'oklch(0.94 0.03 240)' },
      },

      // ─── Border radius ────────────────────────────────────────
      borderRadius: {
        '1': '4px',
        '2': '6px',
        '3': '10px',
        '4': '14px',
      },

      // ─── Shadows ──────────────────────────────────────────────
      boxShadow: {
        '1': '0 1px 2px rgba(20,15,10,.05)',
        '2': '0 2px 8px rgba(20,15,10,.06), 0 1px 2px rgba(20,15,10,.04)',
        '3': '0 12px 32px rgba(20,15,10,.10), 0 2px 8px rgba(20,15,10,.05)',
      },
    },
  },
}

export default config
