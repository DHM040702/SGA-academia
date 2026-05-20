// screens-admin.jsx — Admin dashboards, Alumnos, Docentes, Ciclos

// Shared sample data
const ALUMNOS = [
  { cod: '100245', name: 'Lucía Mendoza Quiroz',     dni: '76543210', seccion: 'A-Ing', ciclo: '2026-I', pct: 96, est: 'activo' },
  { cod: '100246', name: 'Diego Salazar Romero',     dni: '76112233', seccion: 'A-Ing', ciclo: '2026-I', pct: 88, est: 'activo' },
  { cod: '100247', name: 'Camila Vásquez Trujillo',  dni: '75998877', seccion: 'B-Bio', ciclo: '2026-I', pct: 100,est: 'activo' },
  { cod: '100248', name: 'Bruno Carrillo Alva',      dni: '77001122', seccion: 'B-Bio', ciclo: '2026-I', pct: 72, est: 'observado' },
  { cod: '100249', name: 'Renata Quispe Huamán',     dni: '76554433', seccion: 'C-Letras', ciclo: '2026-I', pct: 92, est: 'activo' },
  { cod: '100250', name: 'Tomás Figueroa Pinto',     dni: '76889900', seccion: 'A-Ing', ciclo: '2026-I', pct: 64, est: 'riesgo' },
  { cod: '100251', name: 'Valeria Núñez Tello',      dni: '76334455', seccion: 'C-Letras', ciclo: '2026-I', pct: 98, est: 'activo' },
  { cod: '100252', name: 'Mateo Rivera Castillo',    dni: '76667788', seccion: 'B-Bio', ciclo: '2026-I', pct: 84, est: 'activo' },
  { cod: '100253', name: 'Isabela Cárdenas Soto',    dni: '76223344', seccion: 'A-Ing', ciclo: '2026-I', pct: 90, est: 'activo' },
  { cod: '100254', name: 'Joaquín Paredes Villar',   dni: '76991122', seccion: 'C-Letras', ciclo: '2026-I', pct: 56, est: 'riesgo' },
];

const DOCENTES = [
  { dni: '40221558', name: 'Dr. Eduardo Tafur Castillo',  curso: 'Matemática',   sec: 'A, B', asist: 100 },
  { dni: '40334221', name: 'Mg. Patricia León Mejía',     curso: 'Razonamiento', sec: 'A, C', asist: 98 },
  { dni: '41112233', name: 'Lic. Hugo Bermúdez Olano',    curso: 'Biología',     sec: 'B',    asist: 96 },
  { dni: '40998877', name: 'Mg. Sandra Cabrera Pinedo',   curso: 'Física',       sec: 'A',    asist: 100 },
  { dni: '40556677', name: 'Dr. Javier Aguilar Morales',  curso: 'Química',      sec: 'A, B', asist: 92 },
  { dni: '41223344', name: 'Lic. Karen Espinoza Loayza',  curso: 'Literatura',   sec: 'C',    asist: 100 },
  { dni: '40887766', name: 'Mg. Roberto Cárdenas Velez',  curso: 'Historia',     sec: 'C',    asist: 94 },
];

// ─── KPI ──────────────────────────────────────────────────────
function KPI({ label, value, sub, trend, accent, icon }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3,
      padding: 18, boxShadow: T.sh1, position: 'relative', overflow: 'hidden',
    }}>
      {accent && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }}/>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, color: T.textMute, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {icon && <span style={{ color: T.textSoft }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
        {trend && (
          <span style={{ fontSize: 11.5, color: trend > 0 ? T.success : T.danger, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <div style={{ marginTop: 4, fontSize: 12, color: T.textMute }}>{sub}</div>}
    </div>
  );
}

// ─── Bar chart for weekly attendance ──────────────────────────
function WeeklyAttendance({ data, h = 180 }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: h, paddingTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
            <div style={{
              width: '100%', height: `${(d.v / max) * 100}%`,
              background: d.today ? T.primary : T.primaryL,
              border: d.today ? 'none' : `1px solid ${T.primary}`,
              borderRadius: '4px 4px 0 0', position: 'relative',
            }}>
              {d.today && (
                <div style={{
                  position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 11, fontWeight: 700, color: T.primary, fontFamily: T.mono,
                }}>{d.v}%</div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 11, color: d.today ? T.primary : T.textMute, fontWeight: d.today ? 600 : 500 }}>{d.day}</div>
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD V1 — Classic executive ─────────────────────────
function DashboardV1() {
  return (
    <DesktopFrame role="admin" active="inicio">
      <PageHeader
        title="Buenas tardes, Ana"
        crumbs={['Administración', 'Inicio']}
        action={<>
          <Btn variant="secondary" icon={I.Download} size="sm">Exportar resumen</Btn>
          <Btn icon={I.Plus} size="sm">Comunicado rápido</Btn>
        </>}
      />
      <div style={{ padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 12.5, color: T.textMute }}>
          <span style={{ color: T.text, fontWeight: 500 }}>Lunes, 19 de mayo de 2026</span>
          {' · '}Ciclo 2026-I, semana 5 de 16
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <KPI label="Alumnos activos"    value="847" sub="de 892 matriculados" trend={+2} accent={T.primary}/>
          <KPI label="Docentes activos"   value="34"  sub="3 con licencia hoy"  accent="oklch(0.55 0.13 145)"/>
          <KPI label="Asistencia hoy"     value="91%" sub="772 presentes a las 14:00" trend={+4} accent="oklch(0.55 0.13 240)"/>
          <KPI label="Comunicados sin leer" value="3" sub="Último: hace 2 horas" accent={T.danger}/>
        </div>

        {/* Main row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Card title="Asistencia esta semana" subtitle="Promedio diario por ciclo y sección" action={<Btn variant="ghost" size="sm" icon={I.ChevR}>Ver reporte</Btn>}>
            <WeeklyAttendance data={[
              { day: 'Lun', v: 92 }, { day: 'Mar', v: 89 },
              { day: 'Mié', v: 94 }, { day: 'Jue', v: 87 },
              { day: 'Vie 19', v: 91, today: true }, { day: 'Sáb', v: 0 },
            ]}/>
            <div style={{ display: 'flex', gap: 18, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.borderS}` }}>
              <Stat label="Promedio semana"   value="91%" tone="success"/>
              <Stat label="Vs. semana pasada" value="+3.2pts" tone="primary"/>
              <Stat label="Sección con menor" value="C-Letras" sub="86%" tone="warning"/>
              <Stat label="Sección con mayor" value="B-Bio" sub="95%" tone="success"/>
            </div>
          </Card>

          <Card title="Próximas clases" subtitle="Hoy · 14:00 – 19:00" action={<Btn variant="ghost" size="sm" icon={I.Calendar}>Horario</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { h: '14:00', d: 'Matemática · A-Ing',  doc: 'Dr. Tafur',   aula: 'Aula 201', live: true },
                { h: '14:00', d: 'Biología · B-Bio',    doc: 'Lic. Bermúdez', aula: 'Aula 202' },
                { h: '15:30', d: 'Razonamiento · A-Ing',doc: 'Mg. León',    aula: 'Aula 201' },
                { h: '15:30', d: 'Literatura · C-Letras', doc: 'Lic. Espinoza', aula: 'Aula 204' },
                { h: '17:00', d: 'Física · A-Ing',      doc: 'Mg. Cabrera', aula: 'Aula 305 · Lab' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: c.live ? T.primary : T.text, width: 44 }}>{c.h}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{c.d}</div>
                    <div style={{ fontSize: 11.5, color: T.textMute }}>{c.doc} · {c.aula}</div>
                  </div>
                  {c.live && <Pill tone="success" style={{ fontSize: 10 }}><Dot tone="success" size={6}/>En curso</Pill>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Card title="Alumnos en riesgo" subtitle="Asistencia bajo 75%" action={<Btn variant="ghost" size="sm">Ver todos</Btn>}>
            {ALUMNOS.filter(a => a.pct < 80).slice(0, 4).map(a => (
              <div key={a.cod} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.borderS}` }}>
                <Avatar name={a.name} size={30}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>{a.cod} · {a.seccion}</div>
                </div>
                <Pill tone={a.pct < 70 ? 'danger' : 'warning'}>{a.pct}%</Pill>
              </div>
            ))}
          </Card>

          <Card title="Últimos comunicados" subtitle="Panel + WhatsApp/SMS" action={<Btn variant="ghost" size="sm">Nuevo</Btn>}>
            {[
              { t: 'Suspensión clases sábado 24', ch: ['Panel','WhatsApp'], tone: 'warning', when: 'hace 2h' },
              { t: 'Recordatorio simulacro general', ch: ['Panel','SMS'], tone: 'info', when: 'ayer' },
              { t: 'Cambio de aula Sec. B miércoles', ch: ['Panel'], tone: 'neutral', when: 'hace 2 días' },
            ].map((c, i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, flex: 1 }}>{c.t}</div>
                  <span style={{ fontSize: 10.5, color: T.textSoft, whiteSpace: 'nowrap' }}>{c.when}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                  {c.ch.map(x => <Pill key={x} tone={c.tone === 'neutral' ? 'neutral' : 'primary'} style={{ fontSize: 10 }}>{x}</Pill>)}
                </div>
              </div>
            ))}
          </Card>

          <Card title="Estado del sistema" subtitle="Servicios y dispositivos">
            {[
              { l: 'Lectores de barras', s: '4/4 activos', t: 'success' },
              { l: 'Cola de WhatsApp',   s: '0 en espera', t: 'success' },
              { l: 'Cola de SMS (Twilio)', s: '2 reintentos', t: 'warning' },
              { l: 'Almacenamiento biblioteca', s: '64% usado', t: 'neutral' },
              { l: 'Backup nocturno',    s: 'OK · 03:02', t: 'success' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <Dot tone={r.t}/>
                <span style={{ fontSize: 12.5, color: T.text, flex: 1 }}>{r.l}</span>
                <span style={{ fontSize: 11.5, color: T.textMute, fontFamily: T.mono }}>{r.s}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DesktopFrame>
  );
}

function Stat({ label, value, sub, tone = 'neutral' }) {
  const colors = { success: T.success, primary: T.primary, warning: T.warning, danger: T.danger, neutral: T.text };
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: colors[tone] }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── DASHBOARD V2 — Modular "command center" ──────────────────
function DashboardV2() {
  return (
    <DesktopFrame role="admin" active="inicio">
      <div style={{ padding: 28 }}>
        {/* Hero */}
        <div style={{
          background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryD} 100%)`,
          color: '#fff', borderRadius: T.r3, padding: '28px 30px', display: 'flex', gap: 32,
          alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
        }}>
          <svg width="400" height="200" viewBox="0 0 400 200" style={{ position: 'absolute', right: -40, top: -30, opacity: .12 }}>
            <circle cx="200" cy="100" r="90" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="200" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="200" cy="100" r="30" fill="none" stroke="#fff" strokeWidth="1"/>
          </svg>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, opacity: .75, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Resumen · Ciclo 2026-I · Semana 5</div>
            <h1 style={{ margin: 0, fontFamily: T.serif, fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              847 alumnos activos. 91% de asistencia hoy.
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: .8 }}>Todo opera con normalidad. 3 alertas requieren su atención.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
            <Btn variant="secondary" icon={I.Megaphone} size="md" style={{ background: 'rgba(255,255,255,.95)' }}>Nuevo comunicado</Btn>
            <Btn variant="secondary" icon={I.Chart} size="md" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>Reportes</Btn>
          </div>
        </div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, marginTop: 18 }}>
          {/* Big asistencia */}
          <Card style={{ gridColumn: 'span 7' }} title="Asistencia en vivo" subtitle="Actualizado hace 12s" action={<Pill tone="success"><Dot tone="success" size={6}/> En vivo</Pill>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontFamily: T.serif, fontSize: 56, fontWeight: 600, color: T.primary, letterSpacing: '-0.03em', lineHeight: 1 }}>91<span style={{ fontSize: 28 }}>%</span></span>
                  <div>
                    <div style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>↑ 4 pts vs. ayer</div>
                    <div style={{ fontSize: 12, color: T.textMute }}>772 / 847</div>
                  </div>
                </div>
                <WeeklyAttendance h={130} data={[
                  { day: 'L', v: 92 }, { day: 'M', v: 89 }, { day: 'X', v: 94 },
                  { day: 'J', v: 87 }, { day: 'V', v: 91, today: true }, { day: 'S', v: 0 },
                ]}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 20, borderLeft: `1px solid ${T.borderS}` }}>
                <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por sección · hoy</div>
                {[
                  { s: 'A-Ing', v: 93, n: '280/302' },
                  { s: 'B-Bio', v: 95, n: '241/253' },
                  { s: 'C-Letras', v: 86, n: '251/292' },
                ].map(s => (
                  <div key={s.s}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{s.s}</span>
                      <span style={{ color: T.textMute, fontFamily: T.mono }}>{s.n}</span>
                    </div>
                    <div style={{ height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${s.v}%`, height: '100%', background: s.v < 90 ? T.warning : T.primary }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Tareas pendientes */}
          <Card style={{ gridColumn: 'span 5' }} title="Pendientes" subtitle="3 requieren atención" action={<Btn variant="ghost" size="sm">Filtrar</Btn>}>
            {[
              { t: 'Aprobar horario de Sec. C-Letras', d: 'Conflicto aula 204 · jueves 16:00', tone: 'danger', icon: I.Warn },
              { t: 'Revisar 12 correcciones de asistencia', d: 'Solicitadas por docentes', tone: 'warning', icon: I.Check },
              { t: 'Confirmar envío comunicado simulacro', d: '892 destinatarios · WhatsApp', tone: 'info', icon: I.Megaphone },
              { t: 'Generar carnets nuevos ingresantes', d: '14 alumnos sin código', tone: 'neutral', icon: I.Users },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: T.r2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: { danger: T.dangerL, warning: T.warningL, info: T.infoL, neutral: T.surface3 }[p.tone],
                  color: { danger: T.danger, warning: 'oklch(0.45 0.12 70)', info: T.info, neutral: T.textMute }[p.tone],
                  flexShrink: 0,
                }}>{p.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.t}</div>
                  <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{p.d}</div>
                </div>
                <Btn variant="ghost" size="sm" icon={I.ChevR} style={{ padding: 4 }}/>
              </div>
            ))}
          </Card>

          {/* Atajos */}
          <Card style={{ gridColumn: 'span 4' }} title="Atajos rápidos">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { i: I.Plus,      l: 'Matricular alumno' },
                { i: I.Upload,    l: 'Importar Excel' },
                { i: I.Megaphone, l: 'Enviar aviso' },
                { i: I.Scan,      l: 'Generar carnets' },
                { i: I.Book,      l: 'Subir recurso' },
                { i: I.Calendar,  l: 'Editar horarios' },
              ].map((a, i) => (
                <button key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                  background: T.surface2, border: `1px solid ${T.borderS}`, borderRadius: T.r2,
                  color: T.text, fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                  textAlign: 'left',
                }}>
                  <span style={{ color: T.primary, display: 'flex' }}>{a.i}</span>
                  {a.l}
                </button>
              ))}
            </div>
          </Card>

          {/* Actividad */}
          <Card style={{ gridColumn: 'span 5' }} title="Actividad reciente" action={<Btn variant="ghost" size="sm">Ver todo</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { who: 'Vigilante J. Ríos', what: 'registró asistencia de', target: '14 alumnos', when: 'hace 1m', dot: 'success' },
                { who: 'Mg. Patricia León', what: 'corrigió asistencia de', target: 'Diego Salazar', when: 'hace 8m', dot: 'warning' },
                { who: 'Director C. Vega', what: 'aprobó comunicado', target: '"Simulacro general"', when: 'hace 22m', dot: 'info' },
                { who: 'Sistema', what: 'generó carnet para', target: 'Lucía Mendoza', when: 'hace 45m', dot: 'neutral' },
                { who: 'Ana Ramírez', what: 'matriculó a', target: '14 alumnos vía Excel', when: 'hace 1h', dot: 'success' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none', alignItems: 'center' }}>
                  <Dot tone={a.dot}/>
                  <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600 }}>{a.who}</span>
                    <span style={{ color: T.textMute }}> {a.what} </span>
                    <span style={{ fontWeight: 500 }}>{a.target}</span>
                  </div>
                  <span style={{ fontSize: 11, color: T.textSoft, whiteSpace: 'nowrap' }}>{a.when}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Calendario */}
          <Card style={{ gridColumn: 'span 3' }} title="Próximo">
            <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Mayo 2026</div>
            <MiniCalendar/>
            <div style={{ marginTop: 14, fontSize: 11.5, color: T.textMute, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><Dot tone="warning" size={6}/> 24 may · Simulacro</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><Dot tone="primary" size={6}/> 28 may · Examen parcial</div>
            </div>
          </Card>
        </div>
      </div>
    </DesktopFrame>
  );
}

function MiniCalendar() {
  const days = ['L','M','X','J','V','S','D'];
  const dates = Array.from({ length: 35 }, (_, i) => i - 3);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.textSoft, fontWeight: 600 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {dates.map((d, i) => {
          const inMonth = d > 0 && d <= 31;
          const isToday = d === 19;
          const hasEvent = [24, 28].includes(d);
          return (
            <div key={i} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: !inMonth ? T.textSoft : isToday ? '#fff' : T.text,
              background: isToday ? T.primary : 'transparent',
              borderRadius: 4, fontWeight: isToday ? 600 : 500, position: 'relative',
            }}>
              {inMonth ? d : (d <= 0 ? 27 + d : d - 31)}
              {hasEvent && <span style={{ position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: 999, background: d === 24 ? T.warning : T.primary }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ALUMNOS — Lista ──────────────────────────────────────────
function AlumnosLista() {
  const tw = React.useContext(TweaksCtx);
  const compact = tw.density === 'compact';
  const rowPad = compact ? '7px 14px' : '12px 14px';

  return (
    <DesktopFrame role="admin" active="alumnos">
      <PageHeader
        title="Alumnos"
        crumbs={['Administración', 'Alumnos']}
        action={<>
          <Btn variant="secondary" icon={I.Upload} size="sm">Importar Excel</Btn>
          <Btn variant="secondary" icon={I.Scan} size="sm">Generar carnets</Btn>
          <Btn icon={I.Plus} size="sm">Nuevo alumno</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 12, boxShadow: T.sh1,
        }}>
          <div style={{ flex: 1, maxWidth: 340 }}>
            <Input icon={I.Search} placeholder="Buscar por nombre, código o DNI..."/>
          </div>
          <Select label="Ciclo" value="2026-I"/>
          <Select label="Sección" value="Todas"/>
          <Select label="Estado" value="Activos"/>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: T.textMute }}>892 alumnos · 847 activos</span>
          <Btn variant="ghost" size="sm" icon={I.Filter}>Más filtros</Btn>
        </div>

        {/* Table */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, boxShadow: T.sh1, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                <Th style={{ width: 40, padding: rowPad }}><input type="checkbox"/></Th>
                <Th style={{ padding: rowPad }}>Alumno</Th>
                <Th style={{ padding: rowPad }}>Código</Th>
                <Th style={{ padding: rowPad }}>DNI</Th>
                <Th style={{ padding: rowPad }}>Sección</Th>
                <Th style={{ padding: rowPad }}>Asistencia</Th>
                <Th style={{ padding: rowPad }}>Estado</Th>
                <Th style={{ padding: rowPad, width: 60, textAlign: 'right' }}></Th>
              </tr>
            </thead>
            <tbody>
              {ALUMNOS.map((a, i) => (
                <tr key={a.cod} style={{ borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <td style={{ padding: rowPad }}><input type="checkbox"/></td>
                  <td style={{ padding: rowPad }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={a.name} size={compact ? 26 : 32}/>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                        {!compact && <div style={{ fontSize: 11.5, color: T.textMute }}>alumno{a.cod}@cepre.unasam.edu.pe</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: rowPad, fontFamily: T.mono, fontSize: 12.5, color: T.text, letterSpacing: '0.05em' }}>{a.cod}</td>
                  <td style={{ padding: rowPad, fontFamily: T.mono, fontSize: 12, color: T.textMute }}>{a.dni}</td>
                  <td style={{ padding: rowPad }}><Pill tone="neutral">{a.seccion}</Pill></td>
                  <td style={{ padding: rowPad }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${a.pct}%`, height: '100%', background: a.pct < 70 ? T.danger : a.pct < 85 ? T.warning : T.success }}/>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, width: 32 }}>{a.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: rowPad }}>
                    <Pill tone={a.est === 'activo' ? 'success' : a.est === 'riesgo' ? 'danger' : 'warning'} style={{ textTransform: 'capitalize' }}>
                      <Dot tone={a.est === 'activo' ? 'success' : a.est === 'riesgo' ? 'danger' : 'warning'} size={6}/>{a.est}
                    </Pill>
                  </td>
                  <td style={{ padding: rowPad, textAlign: 'right' }}>
                    <Btn variant="ghost" size="sm" icon={I.More} style={{ padding: 4 }}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${T.borderS}`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.surface2 }}>
            <div style={{ fontSize: 12, color: T.textMute }}>Mostrando 1–10 de 892 alumnos</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Btn variant="ghost" size="sm" icon={I.ChevL}/>
              {[1, 2, 3, '…', 90].map((p, i) => (
                <button key={i} style={{
                  minWidth: 28, height: 28, padding: '0 8px', fontSize: 12, fontWeight: p === 1 ? 600 : 500,
                  background: p === 1 ? T.primaryL : 'transparent', color: p === 1 ? T.primary : T.text,
                  border: 'none', borderRadius: T.r2, cursor: 'pointer', fontFamily: T.sans,
                }}>{p}</button>
              ))}
              <Btn variant="ghost" size="sm" icon={I.ChevR}/>
            </div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

function Th({ children, style }) {
  return (
    <th style={{
      textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMute,
      textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', ...style,
    }}>{children}</th>
  );
}
function Select({ label, value }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 12px',
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r2, fontSize: 12.5,
      cursor: 'pointer', minWidth: 130,
    }}>
      <span style={{ color: T.textMute }}>{label}:</span>
      <span style={{ fontWeight: 600, flex: 1 }}>{value}</span>
      {I.ChevD}
    </div>
  );
}

// ─── ALUMNO — Detalle (con carnet) ────────────────────────────
function AlumnoDetalle() {
  const a = ALUMNOS[0];
  return (
    <DesktopFrame role="admin" active="alumnos">
      <PageHeader
        title={a.name}
        crumbs={['Administración', 'Alumnos', a.cod]}
        action={<>
          <Btn variant="secondary" icon={I.Download} size="sm">Descargar carnet PDF</Btn>
          <Btn variant="secondary" icon={I.Edit} size="sm">Editar</Btn>
          <Btn variant="ghost" icon={I.More} size="sm" style={{ padding: 6 }}/>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        {/* Left: profile + carnet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad={20}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Avatar name={a.name} size={80}/>
              <h3 style={{ margin: '14px 0 4px', fontFamily: T.serif, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>{a.name}</h3>
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute }}>{a.cod} · DNI {a.dni}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Pill tone="success"><Dot tone="success" size={6}/>Activo</Pill>
                <Pill tone="neutral">{a.seccion}</Pill>
                <Pill tone="primary">Ciclo {a.ciclo}</Pill>
              </div>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.borderS}`, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5 }}>
              <Row icon={I.Mail}  label="Correo" value="lucia.mendoza@cepre.unasam.edu.pe"/>
              <Row icon={I.Phone} label="Teléfono" value="+51 943 221 887"/>
              <Row icon={I.Pin}   label="Dirección" value="Av. Centenario 480, Huaraz"/>
              <Row icon={I.Clock} label="Matriculada" value="14 abr 2026"/>
            </div>
          </Card>

          {/* Carnet preview */}
          <Card title="Carnet" subtitle="6 dígitos · vigente" pad={14}>
            <div style={{
              background: T.primary, color: '#fff', borderRadius: T.r2, padding: '14px 14px 12px',
              position: 'relative', overflow: 'hidden',
            }}>
              <svg width="100" height="60" viewBox="0 0 100 60" style={{ position: 'absolute', right: -10, top: -10, opacity: .15 }}><circle cx="50" cy="30" r="28" fill="none" stroke="#fff" strokeWidth="1"/></svg>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', opacity: .8 }}>CEPREUNASAM · 2026-I</div>
              <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, marginTop: 4, lineHeight: 1.2 }}>{a.name}</div>
              <div style={{ fontSize: 10, opacity: .8, marginTop: 2 }}>Sección {a.seccion} · DNI {a.dni}</div>
            </div>
            <div style={{ marginTop: 10, padding: '12px 0', background: '#fff', display: 'flex', justifyContent: 'center' }}>
              <Barcode value={a.cod} w={220} h={56}/>
            </div>
          </Card>
        </div>

        {/* Right: tabs + content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}` }}>
            {['Resumen','Asistencia','Apoderados','Calificaciones','Comunicados','Auditoría'].map((t, i) => (
              <button key={t} style={{
                padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: T.sans, fontWeight: i === 0 ? 600 : 500,
                color: i === 0 ? T.primary : T.textMute,
                borderBottom: `2px solid ${i === 0 ? T.primary : 'transparent'}`,
                marginBottom: -1,
              }}>{t}</button>
            ))}
          </div>

          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <KPI label="Asistencia ciclo" value="96%" sub="48 de 50 sesiones" accent={T.success}/>
            <KPI label="Puntualidad"      value="92%" sub="4 tardanzas registradas" accent={T.primary}/>
            <KPI label="Posición"         value="14°" sub="de 302 en A-Ing" accent={T.warning}/>
          </div>

          <Card title="Asistencia por curso" subtitle="Ciclo actual" pad={16}>
            {[
              { c: 'Matemática',    p: 100, t: '12/12' },
              { c: 'Razonamiento',  p: 92,  t: '11/12' },
              { c: 'Física',        p: 100, t: '8/8' },
              { c: 'Química',       p: 87,  t: '7/8' },
              { c: 'Comunicación',  p: 100, t: '10/10' },
            ].map((c, i) => (
              <div key={c.c} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <div style={{ width: 160, fontSize: 13, fontWeight: 500 }}>{c.c}</div>
                <div style={{ flex: 1, height: 7, background: T.surface3, borderRadius: 4 }}>
                  <div style={{ width: `${c.p}%`, height: '100%', background: c.p < 90 ? T.warning : T.success, borderRadius: 4 }}/>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 12.5, width: 60, textAlign: 'right', color: T.textMute }}>{c.t}</div>
                <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, width: 42, textAlign: 'right', color: c.p < 90 ? T.warning : T.success }}>{c.p}%</div>
              </div>
            ))}
          </Card>

          <Card title="Últimos registros" pad={16}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Esta semana</div>
                {[
                  { d: 'Lun 13', t: '07:42', s: 'Puntual' },
                  { d: 'Mar 14', t: '07:58', s: 'Puntual' },
                  { d: 'Mié 15', t: '08:11', s: 'Tardanza' },
                  { d: 'Jue 16', t: '—',     s: 'Justificada' },
                  { d: 'Vie 17', t: '07:39', s: 'Puntual' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none', fontSize: 12.5 }}>
                    <div style={{ width: 64, color: T.textMute }}>{r.d}</div>
                    <div style={{ fontFamily: T.mono, width: 50 }}>{r.t}</div>
                    <div style={{ flex: 1 }}>
                      <Pill tone={r.s === 'Puntual' ? 'success' : r.s === 'Tardanza' ? 'warning' : 'info'}>{r.s}</Pill>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Apoderados</div>
                {[
                  { n: 'Rosa Quiroz de Mendoza', r: 'Madre', t: '+51 987 654 321' },
                  { n: 'Ernesto Mendoza Velez',  r: 'Padre', t: '+51 945 112 887' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                    <Avatar name={p.n} size={32}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.n}</div>
                      <div style={{ fontSize: 11, color: T.textMute }}>{p.r} · {p.t}</div>
                    </div>
                  </div>
                ))}
                <Btn variant="ghost" size="sm" icon={I.Plus} style={{ marginTop: 4 }}>Vincular apoderado</Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DesktopFrame>
  );
}
function Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: T.text }}>
      <span style={{ color: T.textSoft, display: 'flex' }}>{React.cloneElement(icon, { size: 14 })}</span>
      <span style={{ flex: 1, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// ─── IMPORT EXCEL (modal overlay over Alumnos) ────────────────
function ImportExcel() {
  return (
    <DesktopFrame role="admin" active="alumnos">
      <div style={{ position: 'relative', height: '100%' }}>
        {/* Backdrop content (faded) */}
        <div style={{ opacity: .3, pointerEvents: 'none' }}>
          <PageHeader title="Alumnos" crumbs={['Administración', 'Alumnos']}/>
          <div style={{ padding: 28 }}>
            <div style={{ height: 60, background: T.surface, borderRadius: T.r3, marginBottom: 14, border: `1px solid ${T.border}` }}/>
            <div style={{ height: 400, background: T.surface, borderRadius: T.r3, border: `1px solid ${T.border}` }}/>
          </div>
        </div>
        {/* Modal */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(30,22,14,.45)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 640, maxHeight: '88%', overflow: 'auto', background: T.surface,
            borderRadius: T.r4, boxShadow: T.sh3, border: `1px solid ${T.border}`,
          }}>
            <header style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>Importar alumnos desde Excel</h2>
                <div style={{ marginTop: 4, fontSize: 12.5, color: T.textMute }}>Paso 2 de 3 · Validación de datos</div>
              </div>
              <Btn variant="ghost" icon={I.X} size="sm" style={{ padding: 6 }}/>
            </header>

            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', gap: 4, borderBottom: `1px solid ${T.borderS}`, background: T.surface2 }}>
              {['Subir archivo','Validar datos','Confirmar'].map((s, i) => (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: i < 2 ? T.primary : T.surface3, color: i < 2 ? '#fff' : T.textMute,
                      fontSize: 11, fontWeight: 700, border: i === 1 ? `2px solid ${T.primaryD}` : 'none',
                    }}>{i < 1 ? '✓' : i + 1}</div>
                    <span style={{ fontSize: 12.5, fontWeight: i === 1 ? 600 : 500, color: i <= 1 ? T.text : T.textMute }}>{s}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: i === 0 ? T.primary : T.border, margin: '0 8px' }}/>}
                </React.Fragment>
              ))}
            </div>

            <div style={{ padding: '18px 22px' }}>
              {/* File summary */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: T.surface2,
                border: `1px solid ${T.borderS}`, borderRadius: T.r2, marginBottom: 14,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: T.r2, background: T.successL, color: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.File}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>matricula_2026_I.xlsx</div>
                  <div style={{ fontSize: 11.5, color: T.textMute }}>892 filas · 18 columnas · 124 KB</div>
                </div>
                <Pill tone="success"><Dot tone="success" size={6}/>Validado</Pill>
              </div>

              {/* Validation summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <ValBox tone="success" n="878" l="Listos para importar"/>
                <ValBox tone="warning" n="11"  l="Avisos (revisar)"/>
                <ValBox tone="danger"  n="3"   l="Errores (no se importan)"/>
              </div>

              {/* Preview */}
              <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Vista previa · primeras 5 filas</div>
              <div style={{ border: `1px solid ${T.border}`, borderRadius: T.r2, overflow: 'hidden', fontSize: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.surface2 }}>
                      {['#', 'DNI', 'Nombres', 'Apellidos', 'Sección', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10.5, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: 1, dni: '76543210', nm: 'Lucía',  ap: 'Mendoza Quiroz',    s: 'A-Ing',   ok: 'ok' },
                      { n: 2, dni: '76112233', nm: 'Diego',   ap: 'Salazar Romero',    s: 'A-Ing',   ok: 'ok' },
                      { n: 3, dni: '7611223',  nm: 'Camila',  ap: 'Vásquez Trujillo',  s: 'B-Bio',   ok: 'err', msg: 'DNI debe tener 8 dígitos' },
                      { n: 4, dni: '77001122', nm: 'Bruno',   ap: 'Carrillo Alva',     s: 'D-X',     ok: 'warn', msg: 'Sección "D-X" no existe' },
                      { n: 5, dni: '76554433', nm: 'Renata',  ap: 'Quispe Huamán',     s: 'C-Letras',ok: 'ok' },
                    ].map(r => (
                      <tr key={r.n} style={{ borderTop: `1px solid ${T.borderS}`, background: r.ok === 'err' ? T.dangerL : r.ok === 'warn' ? T.warningL : 'transparent' }}>
                        <td style={{ padding: '6px 10px', color: T.textMute, fontFamily: T.mono }}>{r.n}</td>
                        <td style={{ padding: '6px 10px', fontFamily: T.mono }}>{r.dni}</td>
                        <td style={{ padding: '6px 10px' }}>{r.nm}</td>
                        <td style={{ padding: '6px 10px' }}>{r.ap}</td>
                        <td style={{ padding: '6px 10px' }}>{r.s}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          {r.ok === 'ok'   && <Pill tone="success" style={{ fontSize: 10 }}>✓</Pill>}
                          {r.ok === 'warn' && <Pill tone="warning" style={{ fontSize: 10 }}>{r.msg}</Pill>}
                          {r.ok === 'err'  && <Pill tone="danger"  style={{ fontSize: 10 }}>{r.msg}</Pill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <footer style={{ borderTop: `1px solid ${T.border}`, padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.surface2 }}>
              <Btn variant="ghost" size="sm">Descargar reporte de errores</Btn>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="secondary" size="sm">Atrás</Btn>
                <Btn size="sm">Importar 878 alumnos →</Btn>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}
function ValBox({ tone, n, l }) {
  const c = { success: { bg: T.successL, fg: T.success }, warning: { bg: T.warningL, fg: 'oklch(0.45 0.12 70)' }, danger: { bg: T.dangerL, fg: T.danger } }[tone];
  return (
    <div style={{ background: c.bg, borderRadius: T.r2, padding: '12px 14px' }}>
      <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: c.fg, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: c.fg, marginTop: 4, fontWeight: 500 }}>{l}</div>
    </div>
  );
}

// ─── DOCENTES — Lista ─────────────────────────────────────────
function DocentesLista() {
  const tw = React.useContext(TweaksCtx);
  const compact = tw.density === 'compact';
  const rowPad = compact ? '7px 14px' : '12px 14px';

  return (
    <DesktopFrame role="admin" active="docentes">
      <PageHeader
        title="Docentes"
        crumbs={['Administración', 'Docentes']}
        action={<>
          <Btn variant="secondary" icon={I.Download} size="sm">Reporte de asistencia</Btn>
          <Btn icon={I.Plus} size="sm">Nuevo docente</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <KPI label="Docentes activos" value="34" sub="3 con licencia hoy" accent={T.primary}/>
          <KPI label="Puntualidad media" value="97%" trend={+1} accent={T.success}/>
          <KPI label="Asistencia ciclo"  value="98%" accent={T.primary}/>
          <KPI label="Cursos cubiertos"  value="12/12" accent={T.success}/>
        </div>

        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 12, boxShadow: T.sh1,
        }}>
          <div style={{ flex: 1, maxWidth: 340 }}>
            <Input icon={I.Search} placeholder="Buscar docente, curso o DNI..."/>
          </div>
          <Select label="Curso" value="Todos"/>
          <Select label="Estado" value="Activos"/>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: T.textMute }}>34 docentes</span>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, boxShadow: T.sh1, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                <Th style={{ padding: rowPad }}>Docente</Th>
                <Th style={{ padding: rowPad }}>DNI / código asistencia</Th>
                <Th style={{ padding: rowPad }}>Curso</Th>
                <Th style={{ padding: rowPad }}>Secciones</Th>
                <Th style={{ padding: rowPad }}>Asistencia ciclo</Th>
                <Th style={{ padding: rowPad }}>Última marca</Th>
                <Th style={{ padding: rowPad, width: 60 }}></Th>
              </tr>
            </thead>
            <tbody>
              {DOCENTES.map((d, i) => (
                <tr key={d.dni} style={{ borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <td style={{ padding: rowPad }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={d.name} size={compact ? 26 : 32}/>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                        {!compact && <div style={{ fontSize: 11.5, color: T.textMute }}>{d.name.split(' ')[1].toLowerCase()}@unasam.edu.pe</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: rowPad }}>
                    <div style={{ fontFamily: T.mono, fontSize: 12.5 }}>{d.dni}</div>
                    <div style={{ fontSize: 11, color: T.textSoft, fontFamily: T.mono }}>DNI = código de asistencia</div>
                  </td>
                  <td style={{ padding: rowPad }}><Pill tone="primary">{d.curso}</Pill></td>
                  <td style={{ padding: rowPad, fontFamily: T.mono, fontSize: 12.5 }}>{d.sec}</td>
                  <td style={{ padding: rowPad }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${d.asist}%`, height: '100%', background: d.asist < 95 ? T.warning : T.success }}/>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>{d.asist}%</span>
                    </div>
                  </td>
                  <td style={{ padding: rowPad, fontFamily: T.mono, fontSize: 12, color: T.textMute }}>Hoy · 13:58</td>
                  <td style={{ padding: rowPad, textAlign: 'right' }}><Btn variant="ghost" size="sm" icon={I.More} style={{ padding: 4 }}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── CICLOS Y SECCIONES ───────────────────────────────────────
function CiclosSecciones() {
  return (
    <DesktopFrame role="admin" active="ciclos">
      <PageHeader
        title="Ciclos y secciones"
        crumbs={['Administración', 'Ciclos y secciones']}
        action={<>
          <Btn variant="secondary" icon={I.Plus} size="sm">Nueva sección</Btn>
          <Btn icon={I.Plus} size="sm">Nuevo ciclo</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Ciclo activo */}
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Ciclo 2026-I</h2>
                <Pill tone="success"><Dot tone="success" size={6}/>En curso</Pill>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: T.textMute }}>14 abr 2026 → 02 ago 2026 · semana 5 de 16</div>
            </div>
            <div style={{ display: 'flex', gap: 22 }}>
              <Stat label="Alumnos"  value="847" sub="892 matriculados"/>
              <Stat label="Docentes" value="34"/>
              <Stat label="Cursos"   value="12" sub="3 secciones"/>
              <Stat label="Aulas"    value="8"/>
            </div>
          </div>
          <div style={{ height: 8, background: T.surface3, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '31%', height: '100%', background: `linear-gradient(90deg, ${T.primary}, ${T.primaryD})` }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: T.textMute, fontFamily: T.mono }}>
            <span>14 ABR</span><span style={{ color: T.primary, fontWeight: 600 }}>HOY · 31% completado</span><span>02 AGO</span>
          </div>
        </Card>

        {/* Secciones */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { id: 'A-Ing',    n: 'Ingeniería',    al: 302, doc: 12, c: 'oklch(0.55 0.13 240)' },
            { id: 'B-Bio',    n: 'Biomédicas',    al: 253, doc: 11, c: 'oklch(0.55 0.13 145)' },
            { id: 'C-Letras', n: 'Letras y Hum.', al: 292, doc: 11, c: 'oklch(0.55 0.13 30)' },
          ].map(s => (
            <Card key={s.id} pad={18}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: s.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.serif, fontWeight: 700, fontSize: 13 }}>{s.id[0]}</div>
                    <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>{s.id}</h3>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: T.textMute }}>{s.n}</div>
                </div>
                <Btn variant="ghost" size="sm" icon={I.More} style={{ padding: 4 }}/>
              </div>
              <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: `1px solid ${T.borderS}` }}>
                <Stat label="Alumnos"  value={s.al}/>
                <Stat label="Docentes" value={s.doc}/>
                <Stat label="Turno"    value="Tarde" sub="14:00–19:00"/>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                <Btn variant="secondary" size="sm" style={{ flex: 1 }} icon={I.Eye}>Detalle</Btn>
                <Btn variant="ghost" size="sm" style={{ flex: 1 }} icon={I.Calendar}>Horario</Btn>
              </div>
            </Card>
          ))}
        </div>

        {/* Histórico */}
        <Card title="Ciclos anteriores" pad={16}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <Th>Ciclo</Th><Th>Periodo</Th><Th>Alumnos</Th><Th>Asistencia media</Th><Th>Estado</Th><Th style={{ textAlign: 'right' }}></Th>
              </tr>
            </thead>
            <tbody>
              {[
                { c: '2025-II', p: '07 oct 2025 → 31 ene 2026', a: 856, m: 89, e: 'cerrado' },
                { c: '2025-I',  p: '15 abr 2025 → 02 ago 2025', a: 812, m: 91, e: 'cerrado' },
                { c: '2024-II', p: '08 oct 2024 → 01 feb 2025', a: 780, m: 87, e: 'archivado' },
              ].map((r, i) => (
                <tr key={r.c} style={{ borderTop: `1px solid ${T.borderS}` }}>
                  <td style={{ padding: '10px 14px', fontFamily: T.serif, fontWeight: 600, fontSize: 14 }}>{r.c}</td>
                  <td style={{ padding: '10px 14px', color: T.textMute, fontSize: 12.5 }}>{r.p}</td>
                  <td style={{ padding: '10px 14px', fontFamily: T.mono }}>{r.a}</td>
                  <td style={{ padding: '10px 14px' }}><Pill tone={r.m >= 90 ? 'success' : 'warning'}>{r.m}%</Pill></td>
                  <td style={{ padding: '10px 14px' }}><Pill tone="neutral" style={{ textTransform: 'capitalize' }}>{r.e}</Pill></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}><Btn variant="ghost" size="sm">Ver reportes</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, {
  DashboardV1, DashboardV2, AlumnosLista, AlumnoDetalle, ImportExcel,
  DocentesLista, CiclosSecciones, ALUMNOS, DOCENTES, KPI, Stat,
});
