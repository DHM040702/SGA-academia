// screens-portal.jsx — Versiones web (desktop) para alumno y apoderado

// ─── Layout compartido para portales ──────────────────────────
const PORTAL_NAV = {
  alumno: [
    { id: 'inicio',     icon: I.Home,      label: 'Inicio' },
    { id: 'horario',    icon: I.Calendar,  label: 'Mi horario' },
    { id: 'asistencia', icon: I.Check,     label: 'Mi asistencia' },
    { id: 'biblioteca', icon: I.Book,      label: 'Biblioteca' },
    { id: 'comunicados',icon: I.Megaphone, label: 'Avisos' },
    { id: 'perfil',     icon: I.Users,     label: 'Mi perfil' },
  ],
  apoderado: [
    { id: 'inicio',     icon: I.Home,      label: 'Inicio' },
    { id: 'asistencia', icon: I.Check,     label: 'Asistencia' },
    { id: 'horario',    icon: I.Calendar,  label: 'Horario' },
    { id: 'comunicados',icon: I.Megaphone, label: 'Avisos' },
    { id: 'pagos',      icon: I.File,      label: 'Pagos y boletas' },
    { id: 'perfil',     icon: I.Users,     label: 'Mi perfil' },
  ],
};

function PortalFrame({ role = 'alumno', active = 'inicio', user, children, hero }) {
  const tw = React.useContext(TweaksCtx);
  const items = PORTAL_NAV[role];
  return (
    <div style={{
      width: '100%', height: '100%', display: 'grid',
      gridTemplateColumns: `${tw.sidebar === 'compact' ? 64 : 240}px 1fr`,
      background: T.bg, color: T.text, fontFamily: T.sans, fontSize: 13,
      overflow: 'hidden', borderRadius: T.r3,
    }}>
      {/* Sidebar */}
      <aside style={{ background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: tw.sidebar === 'compact' ? '0 12px' : '0 18px', borderBottom: `1px solid ${T.borderS}` }}>
          {tw.sidebar === 'compact' ? <Brand size={28}/> : <Wordmark subtitle={role === 'alumno' ? 'Portal del alumno' : 'Portal del apoderado'}/>}
        </div>
        <nav style={{ flex: 1, padding: tw.sidebar === 'compact' ? '14px 8px' : '14px 12px' }}>
          {tw.sidebar !== 'compact' && (
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textSoft, padding: '4px 8px 8px', fontWeight: 600 }}>
              {role === 'alumno' ? 'Mi cuenta' : 'Seguimiento'}
            </div>
          )}
          {items.map(it => {
            const isActive = it.id === active;
            return (
              <a key={it.id} href="#" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: tw.sidebar === 'compact' ? '9px 8px' : '8px 10px', marginBottom: 1,
                borderRadius: T.r2, textDecoration: 'none',
                color: isActive ? T.primary : T.text,
                background: isActive ? T.primaryL : 'transparent',
                fontWeight: isActive ? 600 : 500, fontSize: 13,
                justifyContent: tw.sidebar === 'compact' ? 'center' : 'flex-start',
              }}>
                <span style={{ color: isActive ? T.primary : T.textMute, display: 'flex' }}>{it.icon}</span>
                {tw.sidebar !== 'compact' && <span style={{ flex: 1 }}>{it.label}</span>}
                {tw.sidebar !== 'compact' && it.id === 'comunicados' && <Pill tone="danger" style={{ fontSize: 10, padding: '1px 6px' }}>3</Pill>}
              </a>
            );
          })}
        </nav>

        {/* Mini carnet en sidebar (solo alumno, no compacto) */}
        {role === 'alumno' && tw.sidebar !== 'compact' && (
          <div style={{ padding: 12, borderTop: `1px solid ${T.borderS}` }}>
            <div style={{ background: T.primary, color: '#fff', borderRadius: T.r2, padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', opacity: .8 }}>MI CÓDIGO</div>
              <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 600, letterSpacing: '0.18em', marginTop: 4 }}>100245</div>
              <div style={{ fontSize: 10, opacity: .75, marginTop: 2 }}>Sección A-Ing · 2026-I</div>
            </div>
          </div>
        )}

        <div style={{ padding: tw.sidebar === 'compact' ? '12px 8px' : '12px 14px', borderTop: `1px solid ${T.borderS}`, display: 'flex', alignItems: 'center', gap: 10, background: T.surface2 }}>
          <Avatar name={user.name} size={32}/>
          {tw.sidebar !== 'compact' && (
            <>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: T.textMute }}>{user.role}</div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: T.textMute, cursor: 'pointer', padding: 4, display: 'flex' }}>{React.cloneElement(I.Logout, { size: 15 })}</button>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ height: 60, borderBottom: `1px solid ${T.border}`, background: T.surface, display: 'flex', alignItems: 'center', gap: 16, padding: '0 26px', flexShrink: 0 }}>
          <div style={{ flex: 1, maxWidth: 380 }}>
            <Input icon={I.Search} placeholder={role === 'alumno' ? 'Buscar curso, recurso, aviso...' : 'Buscar avisos, comunicados...'} style={{ background: T.surface2, border: `1px solid ${T.borderS}` }}/>
          </div>
          <div style={{ flex: 1 }}/>
          <Pill tone="primary"><Dot tone="primary" size={6}/>Ciclo 2026-I · semana 5</Pill>
          <button style={{ position: 'relative', background: 'transparent', border: 'none', color: T.textMute, cursor: 'pointer', padding: 6, display: 'flex' }}>
            {I.Bell}
            <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, background: T.danger, borderRadius: 999, border: `1.5px solid ${T.surface}` }}/>
          </button>
        </header>

        <main style={{ flex: 1, overflow: 'auto', background: T.bg }}>
          {hero}
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── ALUMNO · Portal web · Inicio ─────────────────────────────
function AlumnoWebInicio() {
  return (
    <PortalFrame role="alumno" active="inicio" user={{ name: 'Lucía Mendoza Quiroz', role: 'Alumna · A-Ing' }}
      hero={
        <div style={{ padding: '28px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11.5, color: T.textMute, marginBottom: 4 }}>Lunes, 19 de mayo · semana 5 de 16</div>
              <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em', color: T.text }}>
                Bienvenida, Lucía.
              </h1>
              <div style={{ marginTop: 6, fontSize: 13.5, color: T.textMute }}>Hoy tienes <strong style={{ color: T.text }}>3 clases</strong> · próxima en <strong style={{ color: T.primary }}>15 min</strong>.</div>
            </div>
            <Btn variant="secondary" icon={I.Download} size="sm">Descargar carnet</Btn>
          </div>
        </div>
      }
    >
      <div style={{ padding: '20px 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* KPIs */}
        <KPI label="Asistencia ciclo" value="96%" sub="48 / 50 sesiones" accent={T.success}/>
        <KPI label="Puntualidad"      value="92%" sub="4 tardanzas registradas" accent={T.primary}/>
        <KPI label="Posición"         value="14°" sub="de 302 en tu sección" accent={T.warning}/>

        {/* Próximas clases */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Hoy" subtitle="Lunes 19 de mayo · 14:00 – 19:00" pad={18}>
            {[
              { h: '14:00', dur: '1h 30', c: 'Matemática',   d: 'Dr. Eduardo Tafur',     a: 'Aula 201', col: 'oklch(0.55 0.13 240)', live: true },
              { h: '15:30', dur: '1h 30', c: 'Razonamiento', d: 'Mg. Patricia León',     a: 'Aula 201', col: 'oklch(0.55 0.13 280)' },
              { h: '17:00', dur: '2h',    c: 'Física',       d: 'Mg. Sandra Cabrera',    a: 'Aula 305 · Lab', col: 'oklch(0.55 0.13 200)' },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none', alignItems: 'center' }}>
                <div style={{ width: 60, lineHeight: 1.2 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: c.live ? T.primary : T.text }}>{c.h}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute }}>{c.dur}</div>
                </div>
                <div style={{ width: 4, height: 44, borderRadius: 2, background: c.col }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{c.c}</div>
                  <div style={{ fontSize: 12.5, color: T.textMute, marginTop: 2 }}>{c.d} · {c.a}</div>
                </div>
                {c.live && <Pill tone="success"><Dot tone="success" size={6}/>En 15 min</Pill>}
                <Btn variant="ghost" size="sm" icon={I.ChevR} style={{ padding: 4 }}/>
              </div>
            ))}
          </Card>

          <Card title="Mi asistencia" subtitle="Últimas 3 semanas" pad={18}
            action={<Btn variant="ghost" size="sm">Ver detalle</Btn>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 14 }}>
              <div>
                <span style={{ fontFamily: T.serif, fontSize: 44, fontWeight: 600, color: T.success, letterSpacing: '-0.02em', lineHeight: 1 }}>96<span style={{ fontSize: 22 }}>%</span></span>
                <div style={{ fontSize: 12, color: T.textMute, marginTop: 4 }}>48 sesiones puntuales · 1 tardanza · 1 justificada</div>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                {Array.from({ length: 15 }, (_, i) => {
                  const status = [0,0,0,0,0, 0,0,1,2,0, 0,0,0,0,0][i];
                  const col = status === 0 ? T.success : status === 1 ? T.warning : T.info;
                  return (
                    <div key={i} style={{ flex: 1 }}>
                      <div style={{ height: 30, borderRadius: 3, background: col, opacity: i === 14 ? 1 : 0.85 }}/>
                      <div style={{ fontSize: 9, color: T.textMute, textAlign: 'center', marginTop: 4, fontFamily: T.mono }}>{['L','M','X','J','V'][i % 5]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: `1px solid ${T.borderS}`, fontSize: 11.5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.success }}/>Puntual</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.warning }}/>Tardanza</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.info }}/>Justificada</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textMute }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.surface3 }}/>Próximo</span>
            </div>
          </Card>
        </div>

        {/* Carnet + avisos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <div style={{ background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryD} 100%)`, color: '#fff', padding: '16px 18px 14px', position: 'relative' }}>
              <svg width="200" height="120" viewBox="0 0 200 120" style={{ position: 'absolute', right: -40, top: -20, opacity: .12 }}>
                <circle cx="100" cy="60" r="50" fill="none" stroke="#fff" strokeWidth="1"/>
                <circle cx="100" cy="60" r="32" fill="none" stroke="#fff" strokeWidth="1"/>
              </svg>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <Avatar name="Lucía Mendoza Quiroz" size={44}/>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: .8 }}>Mi carnet · 2026-I</div>
                  <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, marginTop: 2 }}>Lucía Mendoza Q.</div>
                  <div style={{ fontSize: 11, opacity: .85 }}>Sección A-Ing · DNI 76543210</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px', display: 'flex', justifyContent: 'center', background: '#fff' }}>
              <Barcode value="100245" w={220} h={56}/>
            </div>
          </Card>

          <Card title="Avisos" subtitle="3 sin leer" pad={14} action={<Btn variant="ghost" size="sm">Ver todos</Btn>}>
            {[
              { t: 'Suspensión clases sábado 24', s: 'Dirección Académica', when: '2h', tone: 'warning', unread: true },
              { t: 'Examen parcial 28 de mayo',    s: 'Coordinación',        when: '4d', tone: 'primary', unread: true },
              { t: 'Nuevo material · Física',      s: 'Mg. Cabrera',         when: '5d', tone: 'info' },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '9px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none', alignItems: 'flex-start' }}>
                <div style={{ paddingTop: 4 }}><Dot tone={c.tone}/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: c.unread ? 600 : 500 }}>{c.t}</div>
                  <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{c.s} · {c.when}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Recursos recientes */}
        <Card title="Continuar estudiando" subtitle="Recursos donde lo dejaste" style={{ gridColumn: 'span 3' }} pad={18}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { t: 'pdf',   n: 'Cuadernillo Mat. · Bloque 3',  s: '48 pág · 2.4 MB',  p: 45, col: T.danger },
              { t: 'video', n: 'Clase: Trigonometría I',        s: '1h 22m',           p: 28, col: T.primary },
              { t: 'pdf',   n: 'Práctica dirigida Bio N°5',     s: '12 pág · 820 KB',  p: 65, col: T.danger },
              { t: 'link',  n: 'Banco de problemas UNMSM',      s: 'unmsm.edu.pe',     p: 0,  col: T.info },
            ].map((r, i) => (
              <div key={i} style={{ border: `1px solid ${T.border}`, borderRadius: T.r3, overflow: 'hidden', cursor: 'pointer', background: T.surface }}>
                <div style={{ height: 90, background: T.surface2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 700, color: r.col, opacity: .3, textTransform: 'uppercase' }}>{r.t}</span>
                  {r.p > 0 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: T.surface3 }}>
                      <div style={{ width: `${r.p}%`, height: '100%', background: r.col }}/>
                    </div>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.n}</div>
                  <div style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono, marginTop: 3 }}>{r.s}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PortalFrame>
  );
}

// ─── ALUMNO · Portal web · Horario semanal ────────────────────
function AlumnoWebHorario() {
  return (
    <PortalFrame role="alumno" active="horario" user={{ name: 'Lucía Mendoza Quiroz', role: 'Alumna · A-Ing' }}
      hero={
        <div style={{ padding: '28px 32px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11.5, color: T.textMute, marginBottom: 4 }}>Sección A-Ing · Ciclo 2026-I</div>
            <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em' }}>Mi horario</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" icon={I.Download} size="sm">PDF</Btn>
            <Btn variant="secondary" icon={I.Calendar} size="sm">Añadir a calendario</Btn>
          </div>
        </div>
      }
    >
      <div style={{ padding: '20px 32px 32px' }}>
        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Btn variant="secondary" size="sm" icon={I.ChevL}/>
          <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>Semana del 19 al 24 de mayo</div>
          <Btn variant="secondary" size="sm" icon={I.ChevR}/>
          <Pill tone="primary">Semana actual</Pill>
          <div style={{ flex: 1 }}/>
          <Select label="Vista" value="Semanal"/>
        </div>

        {/* Grid */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, boxShadow: T.sh1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, 1fr)', borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
            <div style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hora</div>
            {['Lun 19','Mar 20','Mié 21','Jue 22','Vie 23','Sáb 24'].map((d, i) => (
              <div key={d} style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? T.primary : T.text }}>{d.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: i === 0 ? T.primary : T.textMute, fontFamily: T.mono, marginTop: 1 }}>{d.split(' ')[1]} may</div>
              </div>
            ))}
          </div>
          {HOUR_BLOCKS.map(h => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, 1fr)', borderTop: `1px solid ${T.borderS}`, minHeight: 92 }}>
              <div style={{ padding: '10px 8px', fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.textMute, borderRight: `1px solid ${T.borderS}` }}>{h}</div>
              {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((d) => {
                const cls = SCHEDULE[`${d}-${h}`];
                return (
                  <div key={d} style={{ padding: 4, borderRight: `1px solid ${T.borderS}`, position: 'relative' }}>
                    {cls && cls.sec === 'A-Ing' && (
                      <div style={{
                        background: `color-mix(in oklch, ${cls.col} 10%, white)`,
                        border: `1px solid ${cls.col}`,
                        borderLeft: `3px solid ${cls.col}`,
                        borderRadius: T.r2, padding: '7px 8px', height: '100%',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{cls.c}</div>
                        <div style={{ fontSize: 10.5, color: T.textMute }}>{cls.d}</div>
                        <div style={{ marginTop: 'auto', fontSize: 10, fontFamily: T.mono, color: cls.col, fontWeight: 600 }}>{cls.a}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title="Mis docentes" pad={16}>
            {DOCENTES.slice(0, 5).map((d, i) => (
              <div key={d.dni} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <Avatar name={d.name} size={32}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: T.textMute }}>{d.curso}</div>
                </div>
                <Btn variant="ghost" size="sm" icon={I.Mail} style={{ padding: 6 }}/>
              </div>
            ))}
          </Card>
          <Card title="Próximas evaluaciones" pad={16}>
            {[
              { d: '28 may', c: 'Matemática',   t: 'Examen parcial', dur: '2 horas' },
              { d: '30 may', c: 'Biología',     t: 'Práctica calif. N°6', dur: '1 hora' },
              { d: '04 jun', c: 'Razonamiento', t: 'Simulacro N°2', dur: '2 horas' },
              { d: '11 jun', c: 'Física',       t: 'Examen parcial', dur: '2 horas' },
            ].map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <div style={{ width: 56, textAlign: 'center', padding: '6px 8px', background: T.primaryL, borderRadius: T.r2 }}>
                  <div style={{ fontSize: 10, color: T.primary, fontWeight: 600, textTransform: 'uppercase' }}>{e.d.split(' ')[1]}</div>
                  <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.primary, lineHeight: 1 }}>{e.d.split(' ')[0]}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</div>
                  <div style={{ fontSize: 11.5, color: T.textMute }}>{e.c} · {e.dur}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </PortalFrame>
  );
}

// ─── APODERADO · Portal web · Inicio ──────────────────────────
function ApoderadoWebInicio() {
  return (
    <PortalFrame role="apoderado" active="inicio" user={{ name: 'Rosa Quiroz de Mendoza', role: 'Apoderada' }}
      hero={
        <div style={{ padding: '28px 32px 0' }}>
          <div style={{ fontSize: 11.5, color: T.textMute, marginBottom: 4 }}>Lunes, 19 de mayo · ciclo 2026-I</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em' }}>Buenas tardes, señora Rosa.</h1>
              <div style={{ marginTop: 6, fontSize: 13.5, color: T.textMute }}>Su hija <strong style={{ color: T.text }}>Lucía</strong> ingresó hoy a las <strong style={{ color: T.success }}>13:58</strong>.</div>
            </div>
            <Btn variant="secondary" icon={I.Download} size="sm">Reporte del ciclo</Btn>
          </div>
        </div>
      }
    >
      <div style={{ padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Child selector + status */}
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Avatar name="Lucía Mendoza Quiroz" size={64}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.textSoft, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Estás viendo a</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Lucía Mendoza Quiroz</h2>
                <Btn variant="ghost" size="sm" icon={I.ChevD}>Cambiar</Btn>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: T.textMute }}>Código 100245 · DNI 76543210 · Sección A-Ing</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ padding: '12px 18px', background: T.successL, borderRadius: T.r3, textAlign: 'center', minWidth: 130 }}>
                <div style={{ fontSize: 10.5, color: T.success, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Estado hoy</div>
                <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.success, marginTop: 2 }}>Presente</div>
                <div style={{ fontSize: 11, color: T.success, opacity: .8, marginTop: 2, fontFamily: T.mono }}>Ingreso 13:58 ✓</div>
              </div>
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <KPI label="Asistencia ciclo" value="96%" sub="48 / 50 sesiones" trend={+2} accent={T.success}/>
          <KPI label="Puntualidad"      value="92%" sub="4 tardanzas registradas" accent={T.primary}/>
          <KPI label="Ausencias"        value="1"   sub="1 justificada" accent={T.info}/>
          <KPI label="Avisos sin leer"  value="2"   sub="Reunión + simulacro" accent={T.warning}/>
        </div>

        {/* Asistencia + avisos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <Card title="Asistencia esta semana" subtitle="Detalle día por día" pad={18}
            action={<Btn variant="ghost" size="sm" icon={I.Calendar}>Calendario completo</Btn>}>
            {[
              { d: 'Lunes 19',     ent: '13:58', sal: 'en curso', s: 'Puntual', tone: 'success', cur: 'Matemática · Razonamiento · Física' },
              { d: 'Viernes 17',   ent: '13:50', sal: '19:05',     s: 'Puntual', tone: 'success', cur: '3 clases' },
              { d: 'Jueves 16',    ent: '—',     sal: '—',         s: 'Justificada · cita médica', tone: 'info', cur: 'Adjuntó certificado' },
              { d: 'Miércoles 15', ent: '14:08', sal: '19:02',     s: 'Tardanza · 8 min', tone: 'warning', cur: '3 clases' },
              { d: 'Martes 14',    ent: '13:58', sal: '19:00',     s: 'Puntual', tone: 'success', cur: '2 clases' },
              { d: 'Lunes 13',     ent: '13:42', sal: '19:01',     s: 'Puntual', tone: 'success', cur: '3 clases' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <Dot tone={r.tone}/>
                <div style={{ width: 110, fontSize: 13, fontWeight: 500 }}>{r.d}</div>
                <div style={{ width: 140, display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 12 }}>{r.ent}</span>
                  <span style={{ color: T.textSoft }}>→</span>
                  <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute }}>{r.sal}</span>
                </div>
                <div style={{ flex: 1, fontSize: 11.5, color: T.textMute }}>{r.cur}</div>
                <Pill tone={r.tone}>{r.s}</Pill>
              </div>
            ))}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Avisos para apoderados" pad={16} action={<Pill tone="danger">2 nuevos</Pill>}>
              {[
                { t: 'Reunión de padres 31 de mayo', s: '10:00 AM · Auditorio principal', when: '2h', tone: 'primary', unread: true },
                { t: 'Suspensión clases sábado 24',   s: 'Por simulacro regional',         when: '2h', tone: 'warning', unread: true },
                { t: 'Pago de segunda cuota',          s: 'Fecha límite 30 de mayo',         when: '4d', tone: 'neutral' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '10px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Dot tone={c.tone}/>
                    <div style={{ fontSize: 12.5, fontWeight: c.unread ? 600 : 500, flex: 1 }}>{c.t}</div>
                    <span style={{ fontSize: 10.5, color: T.textSoft }}>{c.when}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMute, marginLeft: 16 }}>{c.s}</div>
                </div>
              ))}
            </Card>

            <Card title="Contacto rápido" pad={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: T.primaryL, color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.Users}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Mg. Patricia León</div>
                  <div style={{ fontSize: 11, color: T.textMute }}>Tutora de A-Ing</div>
                </div>
                <Btn size="sm" variant="secondary" icon={I.Mail} style={{ padding: 6 }}/>
                <Btn size="sm" variant="secondary" icon={I.Phone} style={{ padding: 6 }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.borderS}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: T.surface3, color: T.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.Phone}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Secretaría</div>
                  <div style={{ fontSize: 11, color: T.textMute }}>L–V 09:00–17:00 · (043) 421-887</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Performance per course */}
        <Card title="Desempeño por curso" subtitle="Asistencia · ciclo 2026-I" pad={18}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { c: 'Matemática',   p: 100, col: 'oklch(0.55 0.13 240)' },
              { c: 'Razonamiento', p: 92,  col: 'oklch(0.55 0.13 280)' },
              { c: 'Física',       p: 100, col: 'oklch(0.55 0.13 200)' },
              { c: 'Química',      p: 87,  col: 'oklch(0.55 0.13 110)' },
              { c: 'Comunicación', p: 100, col: 'oklch(0.55 0.13 30)' },
            ].map(c => (
              <div key={c.c} style={{ padding: 14, background: T.surface2, border: `1px solid ${T.borderS}`, borderRadius: T.r2 }}>
                <div style={{ fontSize: 11.5, color: T.textMute, marginBottom: 6 }}>{c.c}</div>
                <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: c.col, lineHeight: 1 }}>{c.p}%</div>
                <div style={{ height: 4, background: T.surface3, borderRadius: 2, marginTop: 8 }}>
                  <div style={{ width: `${c.p}%`, height: '100%', background: c.col, borderRadius: 2 }}/>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PortalFrame>
  );
}

Object.assign(window, { AlumnoWebInicio, AlumnoWebHorario, ApoderadoWebInicio });
