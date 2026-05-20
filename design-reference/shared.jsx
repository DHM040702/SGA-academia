// shared.jsx — Login, Sidebar, TopBar, Mobile frame, DesktopFrame wrappers

// ─── Desktop frame ─────────────────────────────────────────────
function DesktopFrame({ children, role = 'admin', active = 'inicio', search = true }) {
  const tw = React.useContext(TweaksCtx);
  return (
    <div style={{
      width: '100%', height: '100%', display: 'grid',
      gridTemplateColumns: `${tw.sidebar === 'compact' ? 64 : 240}px 1fr`,
      background: T.bg, color: T.text, fontFamily: T.sans, fontSize: 13,
      overflow: 'hidden', borderRadius: T.r3,
    }}>
      <Sidebar role={role} active={active} compact={tw.sidebar === 'compact'}/>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar search={search}/>
        <main style={{ flex: 1, overflow: 'auto', background: T.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
}

const NAV = {
  admin: [
    { id: 'inicio',      icon: I.Home,     label: 'Inicio' },
    { id: 'alumnos',     icon: I.Users,    label: 'Alumnos' },
    { id: 'docentes',    icon: I.Teacher,  label: 'Docentes' },
    { id: 'ciclos',      icon: I.Grid,     label: 'Ciclos y secciones' },
    { id: 'horarios',    icon: I.Calendar, label: 'Horarios' },
    { id: 'asistencia',  icon: I.Check,    label: 'Asistencia' },
    { id: 'comunicados', icon: I.Megaphone,label: 'Comunicados' },
    { id: 'biblioteca',  icon: I.Book,     label: 'Biblioteca' },
    { id: 'reportes',    icon: I.Chart,    label: 'Reportes' },
  ],
  director: [
    { id: 'inicio',      icon: I.Home,     label: 'Inicio' },
    { id: 'horarios',    icon: I.Calendar, label: 'Horarios' },
    { id: 'asistencia',  icon: I.Check,    label: 'Asistencia' },
    { id: 'comunicados', icon: I.Megaphone,label: 'Comunicados' },
    { id: 'reportes',    icon: I.Chart,    label: 'Reportes' },
  ],
};

function Sidebar({ role = 'admin', active, compact }) {
  const items = NAV[role] || NAV.admin;
  return (
    <aside style={{
      background: T.surface, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', padding: compact ? '0 12px' : '0 18px',
        borderBottom: `1px solid ${T.borderS}`,
      }}>
        {compact ? <Brand size={28}/> : <Wordmark/>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: compact ? '14px 8px' : '14px 12px', overflowY: 'auto' }}>
        {!compact && (
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: T.textSoft, padding: '4px 8px 8px', fontWeight: 600 }}>
            {role === 'admin' ? 'Administración' : role === 'director' ? 'Dirección' : ''}
          </div>
        )}
        {items.map(it => {
          const isActive = it.id === active;
          return (
            <a key={it.id} href="#" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: compact ? '9px 8px' : '8px 10px', marginBottom: 1,
              borderRadius: T.r2, textDecoration: 'none',
              color: isActive ? T.primary : T.text,
              background: isActive ? T.primaryL : 'transparent',
              fontWeight: isActive ? 600 : 500, fontSize: 13,
              justifyContent: compact ? 'center' : 'flex-start',
            }}>
              <span style={{ color: isActive ? T.primary : T.textMute, display: 'flex' }}>{it.icon}</span>
              {!compact && <span style={{ flex: 1 }}>{it.label}</span>}
              {!compact && it.id === 'comunicados' && <Pill tone="danger" style={{ fontSize: 10, padding: '1px 6px' }}>3</Pill>}
            </a>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: compact ? '12px 8px' : '12px 14px', borderTop: `1px solid ${T.borderS}`,
        display: 'flex', alignItems: 'center', gap: 10, background: T.surface2,
      }}>
        <Avatar name={role === 'admin' ? 'Ana Ramirez' : 'Carlos Vega'} size={32}/>
        {!compact && (
          <>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {role === 'admin' ? 'Ana Ramírez' : 'Carlos Vega'}
              </div>
              <div style={{ fontSize: 11, color: T.textMute, textTransform: 'capitalize' }}>{role}</div>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: T.textMute, cursor: 'pointer', padding: 4, display: 'flex' }}>
              <Icon d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>} size={15}/>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function TopBar({ search = true }) {
  return (
    <header style={{
      height: 60, borderBottom: `1px solid ${T.border}`, background: T.surface,
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', flexShrink: 0,
    }}>
      {search && (
        <div style={{ flex: 1, maxWidth: 480 }}>
          <Input icon={I.Search} placeholder="Buscar alumno, docente, curso, código..."
                 style={{ background: T.surface2, border: `1px solid ${T.borderS}` }}/>
        </div>
      )}
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Kbd>Ctrl K</Kbd>
        <button style={{ position: 'relative', background: 'transparent', border: 'none', color: T.textMute, cursor: 'pointer', padding: 6, display: 'flex' }}>
          {I.Bell}
          <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, background: T.danger, borderRadius: 999, border: `1.5px solid ${T.surface}` }}/>
        </button>
        <div style={{ width: 1, height: 22, background: T.border, margin: '0 4px' }}/>
        <div style={{ fontSize: 12, color: T.textMute }}>Ciclo</div>
        <select style={{
          fontSize: 12.5, fontFamily: T.sans, padding: '5px 24px 5px 10px', border: `1px solid ${T.border}`,
          borderRadius: T.r2, background: T.surface, color: T.text, fontWeight: 500,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 4l3 3 3-3' fill='none' stroke='${encodeURIComponent('#666')}' stroke-width='1.5'/></svg>")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
        }} defaultValue="2026-I">
          <option>2026-I</option><option>2025-II</option>
        </select>
      </div>
    </header>
  );
}

// ─── Page header (inside main) ────────────────────────────────
function PageHeader({ title, crumbs, action, children }) {
  return (
    <div style={{ padding: '22px 28px 0' }}>
      {crumbs && (
        <div style={{ fontSize: 11.5, color: T.textMute, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ opacity: .5 }}>/</span>}
              <span style={{ color: i === crumbs.length - 1 ? T.text : T.textMute }}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 28, letterSpacing: '-0.02em', color: T.text }}>{title}</h1>
        <div style={{ display: 'flex', gap: 8 }}>{action}</div>
      </div>
      {children}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────
function LoginScreen() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: T.bg, fontFamily: T.sans, overflow: 'hidden', borderRadius: T.r3 }}>
      {/* Left — brand panel */}
      <div style={{
        background: `linear-gradient(165deg, ${T.primary} 0%, ${T.primaryD} 100%)`,
        color: '#fff', padding: '52px 60px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
      }}>
        {/* watermark ring */}
        <svg width="520" height="520" viewBox="0 0 520 520" style={{ position: 'absolute', right: -120, bottom: -80, opacity: .08 }}>
          <circle cx="260" cy="260" r="240" fill="none" stroke="#fff" strokeWidth="1"/>
          <circle cx="260" cy="260" r="180" fill="none" stroke="#fff" strokeWidth="1"/>
          <circle cx="260" cy="260" r="120" fill="none" stroke="#fff" strokeWidth="1"/>
          <path d="M180 200 L260 224 L340 200 L340 320 L260 344 L180 320 Z" fill="#fff" opacity="0.6"/>
        </svg>
        <Wordmark light/>
        <div style={{ maxWidth: 420, position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: .7, marginBottom: 12 }}>Sistema de Gestión Académica</div>
          <h2 style={{ margin: 0, fontFamily: T.serif, fontWeight: 500, fontSize: 38, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            La administración del Centro Preuniversitario, en un solo lugar.
          </h2>
          <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, opacity: .8 }}>
            Asistencia por código de barras, horarios sin conflictos, comunicados inmediatos y reportes en tiempo real.
          </p>
        </div>
        <div style={{ fontSize: 11.5, opacity: .55, fontFamily: T.mono, letterSpacing: '0.05em' }}>
          UNASAM · CEPREUNASAM · v1.0.0
        </div>
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em', color: T.text }}>Iniciar sesión</h1>
          <p style={{ marginTop: 8, marginBottom: 32, fontSize: 13.5, color: T.textMute }}>Ingrese sus credenciales para acceder al sistema.</p>

          <Field label="Usuario o correo institucional" required style={{ marginBottom: 16 }}>
            <Input icon={I.Mail} placeholder="usuario@unasam.edu.pe" defaultValue="ana.ramirez@unasam.edu.pe"/>
          </Field>
          <Field label="Contraseña" required style={{ marginBottom: 12 }}>
            <Input icon={I.Lock} type="password" defaultValue="••••••••••"/>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: T.textMute, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: T.primary }}/> Mantener sesión iniciada
            </label>
            <a href="#" style={{ fontSize: 12.5, color: T.primary, textDecoration: 'none', fontWeight: 500 }}>¿Olvidó su contraseña?</a>
          </div>
          <Btn style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>Ingresar al sistema</Btn>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
            <span style={{ fontSize: 11, color: T.textSoft, letterSpacing: '0.05em' }}>O ACCESO RÁPIDO</span>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Btn variant="secondary" icon={I.Scan} size="sm" style={{ justifyContent: 'center' }}>Modo vigilante</Btn>
            <Btn variant="secondary" icon={I.Shield} size="sm" style={{ justifyContent: 'center' }}>Acceso SSO</Btn>
          </div>

          <div style={{ marginTop: 30, padding: 12, background: T.surface2, border: `1px solid ${T.borderS}`, borderRadius: T.r2, fontSize: 11.5, color: T.textMute, lineHeight: 1.55 }}>
            Acceso restringido a personal autorizado de CEPREUNASAM. Todos los accesos quedan registrados.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile frame ─────────────────────────────────────────────
function MobileFrame({ children, statusbar = 'light', notch = true, w = 360, h = 740 }) {
  return (
    <div style={{
      width: w, height: h, background: '#101010', borderRadius: 38, padding: 9,
      boxShadow: '0 30px 60px -20px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.6) inset, 0 0 0 2px #2a2620',
      position: 'relative',
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', background: T.bg, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {notch && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 90, height: 26, background: '#101010', borderRadius: 14, zIndex: 10 }}/>
        )}
        {/* Status bar */}
        <div style={{
          height: 42, padding: '12px 22px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          fontSize: 13, fontWeight: 600, fontFamily: T.sans, color: statusbar === 'light' ? '#fff' : T.text,
          background: statusbar === 'light' ? T.primary : 'transparent', zIndex: 5,
        }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx="0.5"/><rect x="4" y="4" width="3" height="6" rx="0.5"/><rect x="8" y="2" width="3" height="8" rx="0.5"/><rect x="12" y="0" width="3" height="10" rx="0.5"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><path d="M7 1.5C4.8 1.5 2.8 2.3 1.3 3.5L0 2.2C1.9 .8 4.4 0 7 0s5.1 .8 7 2.2L12.7 3.5C11.2 2.3 9.2 1.5 7 1.5zm0 3c-1.4 0-2.7 .5-3.7 1.3L2 4.4C3.4 3.3 5.1 2.6 7 2.6s3.6 .7 5 1.8L10.7 5.8C9.7 5 8.4 4.5 7 4.5zm0 3c-.7 0-1.3 .2-1.8 .6L4 6.7c.8-.6 1.9-1 3-1s2.2 .4 3 1L8.8 8.1C8.3 7.7 7.7 7.5 7 7.5z"/></svg>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x=".5" y=".5" width="18" height="9" rx="2"/><rect x="2" y="2" width="13" height="6" rx="0.5" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/></svg>
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>{children}</div>
        {/* Home indicator */}
        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 110, height: 4, background: T.text, borderRadius: 3, opacity: .25 }}/>
      </div>
    </div>
  );
}

// ─── Mobile tab bar ───────────────────────────────────────────
function MobileTabBar({ active = 'inicio', role = 'alumno' }) {
  const tabs = role === 'alumno' ? [
    { id: 'inicio', label: 'Inicio',     icon: I.Home },
    { id: 'horario', label: 'Horario',   icon: I.Calendar },
    { id: 'asist', label: 'Asistencia',  icon: I.Check },
    { id: 'biblio', label: 'Biblioteca', icon: I.Book },
    { id: 'menu',  label: 'Más',         icon: I.More },
  ] : [
    { id: 'inicio',  label: 'Inicio',    icon: I.Home },
    { id: 'asist',   label: 'Asistencia',icon: I.Check },
    { id: 'comun',   label: 'Avisos',    icon: I.Megaphone },
    { id: 'perfil',  label: 'Perfil',    icon: I.Users },
  ];
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
      borderTop: `1px solid ${T.border}`, background: T.surface,
      padding: '6px 4px 18px', flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button key={t.id} style={{
          flex: 1, background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: t.id === active ? T.primary : T.textMute,
          fontFamily: T.sans, fontSize: 10, fontWeight: t.id === active ? 600 : 500,
        }}>
          {React.cloneElement(t.icon, { size: 21 })}
          {t.label}
        </button>
      ))}
    </nav>
  );
}

// ─── Mobile screen header ─────────────────────────────────────
function MobileHeader({ title, sub, action, dark }) {
  return (
    <div style={{
      padding: '10px 18px 16px',
      background: dark ? T.primary : 'transparent',
      color: dark ? '#fff' : T.text,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    }}>
      <div>
        {sub && <div style={{ fontSize: 11, opacity: .75, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{sub}</div>}
        <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em' }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

Object.assign(window, {
  DesktopFrame, Sidebar, TopBar, PageHeader, LoginScreen,
  MobileFrame, MobileTabBar, MobileHeader, NAV,
});
