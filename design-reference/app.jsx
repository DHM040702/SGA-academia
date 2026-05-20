// app.jsx — Compose the design canvas + tweaks

const SCREENS_DESKTOP = { w: 1440, h: 900 };
const SCREENS_VIG = { w: 1440, h: 900 };
const SCREENS_MOBILE = { w: 380, h: 760 };

function App() {
  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "density": "comfortable",
    "dark": false,
    "sidebar": "expanded"
  }/*EDITMODE-END*/;

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply dark mode at the root by swapping CSS vars on a wrapper.
  const isDark = tweaks.dark;
  const darkVars = isDark ? {
    '--om-bg': '#1a1612',
    background: '#1a1612',
  } : {};

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: isDark ? '#1a1612' : '#efece6', ...darkVars }}>
      <TweaksCtx.Provider value={tweaks}>
        <DesignCanvas>
          {/* ─── Cover / overview ─── */}
          <DCSection id="overview" title="SGA · UNASAM CEPRE" subtitle="Sistema de Gestión Académica · vista del sistema completo">
            <DCArtboard id="cover" label="Portada" width={760} height={520}>
              <Cover/>
            </DCArtboard>
          </DCSection>

          {/* ─── Auth ─── */}
          <DCSection id="auth" title="Autenticación" subtitle="Pantalla de inicio de sesión · compartida por todos los roles">
            <DCArtboard id="login" label="Login" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <LoginScreen/>
            </DCArtboard>
          </DCSection>

          {/* ─── Admin · Inicio (2 variaciones) ─── */}
          <DCSection id="admin-inicio" title="Admin · Inicio" subtitle="2 variaciones del panel principal">
            <DCArtboard id="dash-v1" label="V1 · Ejecutivo clásico" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <DashboardV1/>
            </DCArtboard>
            <DCArtboard id="dash-v2" label="V2 · Centro de mando" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <DashboardV2/>
            </DCArtboard>
          </DCSection>

          {/* ─── Admin · Alumnos ─── */}
          <DCSection id="admin-alumnos" title="Admin · Alumnos" subtitle="CRUD, importación Excel, detalle y carnet">
            <DCArtboard id="alumnos-lista" label="Lista" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <AlumnosLista/>
            </DCArtboard>
            <DCArtboard id="alumno-detalle" label="Detalle + Carnet" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <AlumnoDetalle/>
            </DCArtboard>
            <DCArtboard id="alumno-import" label="Importar Excel · Modal" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <ImportExcel/>
            </DCArtboard>
          </DCSection>

          {/* ─── Admin · Docentes + Ciclos ─── */}
          <DCSection id="admin-docentes" title="Admin · Docentes y ciclos" subtitle="Gestión de docentes, ciclos y secciones">
            <DCArtboard id="docentes" label="Docentes" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <DocentesLista/>
            </DCArtboard>
            <DCArtboard id="ciclos" label="Ciclos y secciones" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <CiclosSecciones/>
            </DCArtboard>
          </DCSection>

          {/* ─── Admin · Horarios y asistencia ─── */}
          <DCSection id="admin-horarios" title="Admin · Horarios y asistencia" subtitle="Grid con detección de conflictos · panel de asistencia">
            <DCArtboard id="horarios" label="Horarios · con conflicto" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <Horarios/>
            </DCArtboard>
            <DCArtboard id="asist-panel" label="Asistencia · panel director" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <AsistenciaPanel/>
            </DCArtboard>
          </DCSection>

          {/* ─── Admin · Comunicados, biblioteca, reportes ─── */}
          <DCSection id="admin-comun" title="Admin · Comunicados, biblioteca, reportes" subtitle="Canales WhatsApp/SMS, recursos digitales, KPIs">
            <DCArtboard id="comun" label="Comunicados" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <Comunicados/>
            </DCArtboard>
            <DCArtboard id="biblio" label="Biblioteca" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <Biblioteca/>
            </DCArtboard>
            <DCArtboard id="reportes" label="Reportes" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}>
              <Reportes/>
            </DCArtboard>
          </DCSection>

          {/* ─── Vigilante ─── */}
          <DCSection id="vigilante" title="Vigilante · pantalla kiosko" subtitle="Lector HID de código de barras + feed en vivo">
            <DCArtboard id="vig-kiosko" label="Kiosko + feed lateral" width={SCREENS_VIG.w} height={SCREENS_VIG.h}>
              <VigilanteKiosko/>
            </DCArtboard>
            <DCArtboard id="vig-error" label="Código no reconocido" width={SCREENS_VIG.w} height={SCREENS_VIG.h}>
              <VigilanteError/>
            </DCArtboard>
          </DCSection>

          {/* ─── Alumno · móvil ─── */}
          <DCSection id="alumno" title="Alumno · móvil" subtitle="Portal personal · carnet, asistencia, horario, comunicados, biblioteca">
            <DCArtboard id="al-inicio"   label="Inicio · carnet"   width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><AlumnoInicio/></DCArtboard>
            <DCArtboard id="al-asist"    label="Asistencia"        width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><AlumnoAsistencia/></DCArtboard>
            <DCArtboard id="al-horario"  label="Horario"           width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><AlumnoHorario/></DCArtboard>
            <DCArtboard id="al-comun"    label="Avisos"            width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><AlumnoComunicados/></DCArtboard>
            <DCArtboard id="al-biblio"   label="Biblioteca"        width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><AlumnoBiblioteca/></DCArtboard>
          </DCSection>

          {/* ─── Alumno · web ─── */}
          <DCSection id="alumno-web" title="Alumno · portal web" subtitle="Versión escritorio del portal personal del alumno">
            <DCArtboard id="alw-inicio"  label="Inicio · escritorio" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}><AlumnoWebInicio/></DCArtboard>
            <DCArtboard id="alw-horario" label="Horario semanal"     width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}><AlumnoWebHorario/></DCArtboard>
          </DCSection>

          {/* ─── Apoderado · móvil ─── */}
          <DCSection id="apoderado" title="Apoderado · móvil" subtitle="Seguimiento de asistencia y comunicados">
            <DCArtboard id="ap-inicio"  label="Inicio"          width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><ApoderadoInicio/></DCArtboard>
            <DCArtboard id="ap-asist"   label="Asistencia hija" width={SCREENS_MOBILE.w} height={SCREENS_MOBILE.h}><ApoderadoAsistencia/></DCArtboard>
          </DCSection>

          {/* ─── Apoderado · web ─── */}
          <DCSection id="apoderado-web" title="Apoderado · portal web" subtitle="Versión escritorio del seguimiento del apoderado">
            <DCArtboard id="apw-inicio" label="Inicio · escritorio" width={SCREENS_DESKTOP.w} height={SCREENS_DESKTOP.h}><ApoderadoWebInicio/></DCArtboard>
          </DCSection>

          {/* ─── Postit notes about design system ─── */}
          <DCSection id="notes" title="Notas de diseño">
            <DCPostIt id="n1" width={300}>
              <strong>Sistema visual</strong><br/>
              · Tipografía: Crimson Pro (titulares) + Inter (UI) + JetBrains Mono (códigos, DNIs).<br/>
              · Color: azul académico <code>oklch(0.36 0.10 255)</code> sobre neutros cálidos (paper white).<br/>
              · Componentes basados en tablas densas, KPIs, badges de estado y status dots.
            </DCPostIt>
            <DCPostIt id="n2" width={300}>
              <strong>Convenciones</strong><br/>
              · Códigos de barras siempre en monospace.<br/>
              · Estados con punto + pill (puntual / tardanza / ausente / justificada).<br/>
              · Datos críticos (asistencia, conflictos) usan color + ícono nunca solo color.
            </DCPostIt>
            <DCPostIt id="n3" width={300}>
              <strong>Pendiente</strong><br/>
              · Reemplazar fotos placeholder por foto real del alumno (campo en BD).<br/>
              · Definir paleta dark final (revisar contraste WCAG AA).<br/>
              · Definir plantillas WhatsApp con Twilio antes de enviar al QA.
            </DCPostIt>
          </DCSection>
        </DesignCanvas>

        {/* Tweaks panel — visibility is host-driven via the toolbar */}
        <TweaksPanel title="Tweaks">
          <TweakSection label="Apariencia">
            <TweakToggle label="Modo oscuro" value={tweaks.dark}
              onChange={(v) => setTweak('dark', v)}/>
          </TweakSection>
          <TweakSection label="Densidad de tablas">
            <TweakRadio label="Filas" value={tweaks.density}
              options={[
                { value: 'comfortable', label: 'Cómoda' },
                { value: 'compact',     label: 'Compacta' },
              ]}
              onChange={(v) => setTweak('density', v)}/>
          </TweakSection>
          <TweakSection label="Barra lateral">
            <TweakRadio label="Sidebar" value={tweaks.sidebar}
              options={[
                { value: 'expanded', label: 'Icono+texto' },
                { value: 'compact',  label: 'Solo icono' },
              ]}
              onChange={(v) => setTweak('sidebar', v)}/>
          </TweakSection>
        </TweaksPanel>
      </TweaksCtx.Provider>
    </div>
  );
}

// ─── Cover artboard ───────────────────────────────────────────
function Cover() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#fff', borderRadius: T.r3,
      border: `1px solid ${T.border}`, padding: 48, fontFamily: T.sans,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, position: 'relative', overflow: 'hidden',
    }}>
      {/* watermark */}
      <svg width="500" height="500" viewBox="0 0 500 500" style={{ position: 'absolute', right: -120, bottom: -150, opacity: .05 }}>
        <circle cx="250" cy="250" r="220" fill="none" stroke={T.primary} strokeWidth="1"/>
        <circle cx="250" cy="250" r="160" fill="none" stroke={T.primary} strokeWidth="1"/>
        <circle cx="250" cy="250" r="100" fill="none" stroke={T.primary} strokeWidth="1"/>
      </svg>

      <div style={{ position: 'relative' }}>
        <Wordmark subtitle="Centro Preuniversitario"/>
        <div style={{ marginTop: 32, fontSize: 11, color: T.textSoft, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Sistema de Gestión Académica · v1.0
        </div>
        <h1 style={{
          margin: '14px 0 18px', fontFamily: T.serif, fontWeight: 500, fontSize: 48,
          lineHeight: 1.05, letterSpacing: '-0.025em', color: T.text,
        }}>
          Diseño completo del sistema para CEPREUNASAM.
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: T.textMute, lineHeight: 1.6, maxWidth: 340 }}>
          Pantallas web, móvil y kiosko para los 5 roles del SGA: administrador, director, vigilante, alumno y apoderado.
          Cubre los 9 módulos del MVP: autenticación, alumnos, docentes, ciclos, horarios, asistencia, comunicados, biblioteca y reportes.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['9 módulos','5 roles','3 dispositivos','21 pantallas'].map(p => (
            <Pill key={p} tone="primary">{p}</Pill>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, color: T.textSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Contenido</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { n: '01', t: 'Autenticación',                  d: 'Login compartido para todos los roles' },
            { n: '02', t: 'Admin · Inicio',                 d: '2 variaciones del panel principal' },
            { n: '03', t: 'Admin · Alumnos',                d: 'Lista, detalle, carnet, importación Excel' },
            { n: '04', t: 'Admin · Docentes y ciclos',      d: 'Gestión académica' },
            { n: '05', t: 'Admin · Horarios y asistencia',  d: 'Grid con detección de conflictos' },
            { n: '06', t: 'Admin · Comunicados · Biblioteca · Reportes', d: 'Canales y recursos' },
            { n: '07', t: 'Vigilante',                      d: 'Pantalla kiosko + feed en vivo' },
            { n: '08', t: 'Alumno (móvil)',                 d: 'Carnet, asistencia, horario, biblioteca' },
            { n: '09', t: 'Apoderado (móvil)',              d: 'Seguimiento del alumno' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 16, padding: '10px 0', borderTop: `1px solid ${T.borderS}` }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textSoft, fontWeight: 600, marginTop: 3 }}>{s.n}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{s.t}</div>
                <div style={{ fontSize: 12, color: T.textMute, marginTop: 1 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
