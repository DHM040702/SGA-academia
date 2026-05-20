// system.jsx — Design tokens, atoms, icons
// Academic classic: serif headings + sans UI + warm neutrals + deep academic blue.

const T = /* tokens */ {
  // Brand
  primary:   'oklch(0.36 0.10 255)',   // deep academic blue
  primaryD:  'oklch(0.28 0.11 255)',
  primaryL:  'oklch(0.94 0.025 255)',
  primaryFg: '#ffffff',

  // Warm neutrals (paper-like)
  bg:        'oklch(0.985 0.006 80)',  // page background, warm white
  surface:   '#ffffff',
  surface2:  'oklch(0.97 0.008 80)',
  surface3:  'oklch(0.95 0.010 80)',
  border:    'oklch(0.90 0.008 80)',
  borderS:   'oklch(0.93 0.008 80)',
  divider:   'oklch(0.88 0.008 80)',

  // Text
  text:      'oklch(0.22 0.012 60)',
  textMute:  'oklch(0.45 0.012 60)',
  textSoft:  'oklch(0.58 0.010 60)',
  textInv:   'oklch(0.97 0.006 80)',

  // Status — share chroma/lightness
  success:   'oklch(0.55 0.13 145)',
  successL:  'oklch(0.94 0.04 145)',
  warning:   'oklch(0.68 0.14 70)',
  warningL:  'oklch(0.95 0.05 70)',
  danger:    'oklch(0.55 0.16 25)',
  dangerL:   'oklch(0.94 0.04 25)',
  info:      'oklch(0.55 0.13 240)',
  infoL:     'oklch(0.94 0.03 240)',

  // Type
  serif:     "'Crimson Pro', 'Iowan Old Style', Georgia, serif",
  sans:      "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono:      "'JetBrains Mono', ui-monospace, monospace",

  // Radius / shadow
  r1: '4px', r2: '6px', r3: '10px', r4: '14px',
  sh1: '0 1px 2px rgba(20,15,10,.05)',
  sh2: '0 2px 8px rgba(20,15,10,.06), 0 1px 2px rgba(20,15,10,.04)',
  sh3: '0 12px 32px rgba(20,15,10,.10), 0 2px 8px rgba(20,15,10,.05)',
};

// ─── Icons (line) ──────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = 1.7, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       style={{ flexShrink: 0, ...style }}>{d}</svg>
);
const I = {
  Home:     <Icon d={<><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>} />,
  Users:    <Icon d={<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5 6.5-5s6 1.5 6.5 5"/><path d="M16 11.5a3 3 0 1 0 0-6"/><path d="M17.5 20c-.2-2-1.2-3.5-2.5-4.5"/></>} />,
  Teacher:  <Icon d={<><rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/><path d="M7 13h4M7 16h6"/></>} />,
  Calendar: <Icon d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></>} />,
  Grid:     <Icon d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} />,
  Check:    <Icon d={<><path d="M20 6L9 17l-5-5"/></>} />,
  Scan:     <Icon d={<><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M16 8v8"/></>} />,
  Megaphone:<Icon d={<><path d="M3 11v2a2 2 0 0 0 2 2h2l9 5V4l-9 5H5a2 2 0 0 0-2 2z"/><path d="M19 9a4 4 0 0 1 0 6"/></>} />,
  Book:     <Icon d={<><path d="M4 4v16a2 2 0 0 0 2 2h14V4"/><path d="M6 4h14a0 0 0 0 1 0 0v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></>} />,
  Chart:    <Icon d={<><path d="M3 21h18"/><rect x="6" y="11" width="3" height="8"/><rect x="11" y="6" width="3" height="13"/><rect x="16" y="14" width="3" height="5"/></>} />,
  Search:   <Icon d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>} />,
  Bell:     <Icon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 9H3c0-1 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>} />,
  Settings: <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>} />,
  Plus:     <Icon d={<><path d="M12 5v14M5 12h14"/></>} />,
  Filter:   <Icon d={<><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>} />,
  Download: <Icon d={<><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>} />,
  Upload:   <Icon d={<><path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/></>} />,
  More:     <Icon d={<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>} />,
  ChevD:    <Icon d={<><path d="M6 9l6 6 6-6"/></>} />,
  ChevR:    <Icon d={<><path d="M9 6l6 6-6 6"/></>} />,
  ChevL:    <Icon d={<><path d="M15 6l-6 6 6 6"/></>} />,
  X:        <Icon d={<><path d="M18 6L6 18M6 6l12 12"/></>} />,
  Mail:     <Icon d={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>} />,
  Phone:    <Icon d={<><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z"/></>} />,
  Clock:    <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  Pin:      <Icon d={<><path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></>} />,
  Logout:   <Icon d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>} />,
  File:     <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>} />,
  Play:     <Icon d={<><path d="M5 3l14 9-14 9z" fill="currentColor" stroke="none"/></>} />,
  Link:     <Icon d={<><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>} />,
  Eye:      <Icon d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>} />,
  Edit:     <Icon d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  Trash:    <Icon d={<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></>} />,
  Lock:     <Icon d={<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>} />,
  Warn:     <Icon d={<><path d="M10.3 3.9L2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17v.01"/></>} />,
  Shield:   <Icon d={<><path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z"/></>} />,
  ArrowUp:  <Icon d={<><path d="M12 19V5M5 12l7-7 7 7"/></>} />,
  ArrowDn:  <Icon d={<><path d="M12 5v14M19 12l-7 7-7-7"/></>} />,
  Image:    <Icon d={<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></>} />,
};

// ─── UI atoms ─────────────────────────────────────────────────
function Brand({ size = 32, mono }) {
  // Original mark: open-book wedge inside a roundel — academic feel, no real crest.
  const c = mono ? 'currentColor' : T.primary;
  const g = mono ? 'currentColor' : 'rgba(255,255,255,.85)';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="19" fill={c}/>
      <path d="M11 14 L20 17 L29 14 L29 27 L20 30 L11 27 Z" fill={g}/>
      <path d="M20 17 L20 30" stroke={c} strokeWidth="1.4"/>
      <path d="M11 14 L20 17 M29 14 L20 17" stroke={c} strokeWidth="1.2" fill="none"/>
    </svg>
  );
}

function Wordmark({ subtitle = 'Centro Preuniversitario', light }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Brand size={32} mono={light}/>
      <div style={{ lineHeight: 1, color: light ? '#fff' : T.text }}>
        <div style={{ fontFamily: T.serif, fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em' }}>
          SGA <span style={{ opacity: .7 }}>·</span> UNASAM
        </div>
        <div style={{ fontFamily: T.sans, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: .65, marginTop: 3 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Btn({ variant = 'primary', size = 'md', icon, children, style, ...p }) {
  const pad = size === 'sm' ? '6px 10px' : size === 'lg' ? '10px 18px' : '8px 14px';
  const fs = size === 'sm' ? 12.5 : size === 'lg' ? 14 : 13;
  const variants = {
    primary: { background: T.primary, color: T.primaryFg, border: `1px solid ${T.primaryD}`, boxShadow: T.sh1 },
    secondary: { background: T.surface, color: T.text, border: `1px solid ${T.border}`, boxShadow: T.sh1 },
    ghost: { background: 'transparent', color: T.text, border: '1px solid transparent' },
    danger: { background: T.surface, color: T.danger, border: `1px solid ${T.dangerL}` },
  };
  return (
    <button {...p} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad, fontSize: fs,
      fontWeight: 500, fontFamily: T.sans, borderRadius: T.r2, cursor: 'pointer',
      lineHeight: 1.2, whiteSpace: 'nowrap',
      ...variants[variant], ...style,
    }}>{icon}{children}</button>
  );
}

function Pill({ tone = 'neutral', children, style }) {
  const tones = {
    neutral: { bg: T.surface3, fg: T.textMute, border: T.border },
    primary: { bg: T.primaryL,  fg: T.primaryD, border: 'transparent' },
    success: { bg: T.successL,  fg: T.success,  border: 'transparent' },
    warning: { bg: T.warningL,  fg: 'oklch(0.45 0.10 70)',  border: 'transparent' },
    danger:  { bg: T.dangerL,   fg: T.danger,   border: 'transparent' },
    info:    { bg: T.infoL,     fg: T.info,     border: 'transparent' },
  };
  const c = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', fontSize: 11, fontWeight: 500,
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
      borderRadius: 999, letterSpacing: '0.01em', whiteSpace: 'nowrap',
      ...style,
    }}>{children}</span>
  );
}

function Dot({ tone = 'success', size = 8 }) {
  const colors = { success: T.success, warning: T.warning, danger: T.danger, neutral: T.textSoft, info: T.info };
  return <span style={{ width: size, height: size, borderRadius: 999, background: colors[tone], display: 'inline-block', flexShrink: 0 }}/>;
}

function Avatar({ name = '', size = 32, src }) {
  const initials = name.split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  // deterministic warm hue from name
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = (h % 60) + 20; // warm range
  const bg = `oklch(0.88 0.04 ${hue})`;
  const fg = `oklch(0.30 0.08 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: src ? 'transparent' : bg,
      color: fg, fontSize: size * 0.38, fontWeight: 600, fontFamily: T.sans,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      overflow: 'hidden', border: `1px solid ${T.borderS}`,
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initials}
    </div>
  );
}

function Card({ pad = 18, children, style, title, action, subtitle }) {
  return (
    <section style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3,
      boxShadow: T.sh1, ...style,
    }}>
      {(title || action) && (
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                         gap: 12, padding: `${pad}px ${pad}px ${subtitle ? 0 : pad}px` }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{title}</h3>
            {subtitle && <div style={{ marginTop: 3, fontSize: 12, color: T.textMute }}>{subtitle}</div>}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: title ? `${pad - 4}px ${pad}px ${pad}px` : pad }}>{children}</div>
    </section>
  );
}

function Field({ label, hint, children, required, style }) {
  return (
    <label style={{ display: 'block', ...style }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: T.text, marginBottom: 6 }}>
        {label}{required && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textMute, marginTop: 5 }}>{hint}</div>}
    </label>
  );
}

function Input({ placeholder, defaultValue, value, style, icon, ...p }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: 10, color: T.textSoft, display: 'flex' }}>{icon}</span>}
      <input {...p} placeholder={placeholder} defaultValue={defaultValue} value={value}
        style={{
          width: '100%', padding: icon ? '8px 10px 8px 32px' : '8px 10px', fontSize: 13,
          fontFamily: T.sans, color: T.text, background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: T.r2, outline: 'none', ...style,
        }}/>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span style={{
      fontFamily: T.mono, fontSize: 10.5, padding: '1px 6px',
      background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 4,
      color: T.textMute, lineHeight: 1.4,
    }}>{children}</span>
  );
}

// Sparkline + tiny chart helpers
function Sparkline({ points, w = 120, h = 36, color = T.primary, fill = true }) {
  const max = Math.max(...points), min = Math.min(...points);
  const norm = (v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 10);
  const step = w / (points.length - 1);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${i * step},${norm(v)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity="0.10"/>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// Barcode-ish placeholder
function Barcode({ value, w = 240, h = 60 }) {
  // deterministic widths from value
  let seed = 0; for (const ch of String(value)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const bars = [];
  let x = 0;
  while (x < w - 2) {
    const bw = 1 + Math.floor(rand() * 3);
    const isBlack = rand() > 0.45;
    if (isBlack) bars.push(<rect key={x} x={x} y={0} width={bw} height={h - 14} fill="#111"/>);
    x += bw + 1;
  }
  return (
    <div style={{ width: w }}>
      <svg width={w} height={h - 14} style={{ display: 'block' }}>{bars}</svg>
      <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.4em', color: '#111', textAlign: 'center', marginTop: 3 }}>{value}</div>
    </div>
  );
}

// Placeholder image
function PH({ w = '100%', h = 120, label = 'imagen', style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: T.r2,
      background: `repeating-linear-gradient(135deg, ${T.surface3} 0 6px, ${T.surface2} 6px 12px)`,
      border: `1px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: T.textMute, fontSize: 10.5, fontFamily: T.mono, letterSpacing: '0.06em', textTransform: 'uppercase',
      ...style,
    }}>{label}</div>
  );
}

// Tweaks context (set by app.jsx)
const TweaksCtx = React.createContext({ density: 'comfortable', dark: false, sidebar: 'expanded' });

Object.assign(window, {
  T, Icon, I, Brand, Wordmark, Btn, Pill, Dot, Avatar, Card, Field, Input, Kbd,
  Sparkline, Barcode, PH, TweaksCtx,
});
