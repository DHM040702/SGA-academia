// screens-admin2.jsx — Horarios, Comunicados, Biblioteca, Reportes, Asistencia

// ─── HORARIOS — Grid semanal con conflictos ───────────────────
const HOUR_BLOCKS = ['14:00','15:30','17:00','18:30'];
const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const SCHEDULE = {
  'Lunes-14:00':    { c: 'Matemática',   d: 'Dr. Tafur',     a: 'Aula 201', sec: 'A-Ing', col: 'oklch(0.55 0.13 240)' },
  'Lunes-15:30':    { c: 'Razonamiento', d: 'Mg. León',      a: 'Aula 201', sec: 'A-Ing', col: 'oklch(0.55 0.13 280)' },
  'Lunes-17:00':    { c: 'Física',       d: 'Mg. Cabrera',   a: 'Aula 305', sec: 'A-Ing', col: 'oklch(0.55 0.13 200)' },
  'Martes-14:00':   { c: 'Biología',     d: 'Lic. Bermúdez', a: 'Aula 202', sec: 'B-Bio', col: 'oklch(0.55 0.13 145)' },
  'Martes-15:30':   { c: 'Química',      d: 'Dr. Aguilar',   a: 'Aula 305', sec: 'B-Bio', col: 'oklch(0.55 0.13 110)' },
  'Martes-17:00':   { c: 'Literatura',   d: 'Lic. Espinoza', a: 'Aula 204', sec: 'C-Letras', col: 'oklch(0.55 0.13 30)' },
  'Miércoles-14:00':{ c: 'Matemática',   d: 'Dr. Tafur',     a: 'Aula 202', sec: 'B-Bio', col: 'oklch(0.55 0.13 240)' },
  'Miércoles-15:30':{ c: 'Razonamiento', d: 'Mg. León',      a: 'Aula 204', sec: 'C-Letras', col: 'oklch(0.55 0.13 280)' },
  'Miércoles-17:00':{ c: 'Historia',     d: 'Mg. Cárdenas',  a: 'Aula 204', sec: 'C-Letras', col: 'oklch(0.55 0.13 60)', conflict: true },
  'Jueves-14:00':   { c: 'Química',      d: 'Dr. Aguilar',   a: 'Aula 305', sec: 'A-Ing', col: 'oklch(0.55 0.13 110)' },
  'Jueves-15:30':   { c: 'Biología',     d: 'Lic. Bermúdez', a: 'Aula 202', sec: 'B-Bio', col: 'oklch(0.55 0.13 145)' },
  'Viernes-14:00':  { c: 'Física',       d: 'Mg. Cabrera',   a: 'Aula 305', sec: 'A-Ing', col: 'oklch(0.55 0.13 200)' },
  'Viernes-15:30':  { c: 'Literatura',   d: 'Lic. Espinoza', a: 'Aula 204', sec: 'C-Letras', col: 'oklch(0.55 0.13 30)' },
  'Viernes-17:00':  { c: 'Matemática',   d: 'Dr. Tafur',     a: 'Aula 201', sec: 'A-Ing', col: 'oklch(0.55 0.13 240)' },
};

function Horarios() {
  return (
    <DesktopFrame role="admin" active="horarios">
      <PageHeader
        title="Horarios"
        crumbs={['Administración', 'Horarios']}
        action={<>
          <Btn variant="secondary" icon={I.Download} size="sm">Exportar PDF</Btn>
          <Btn icon={I.Plus} size="sm">Asignar clase</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
        {/* Grid + filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r2, padding: 2, boxShadow: T.sh1 }}>
              {['Por sección','Por docente','Por aula'].map((v, i) => (
                <button key={v} style={{
                  padding: '7px 14px', border: 'none', cursor: 'pointer', fontFamily: T.sans, fontSize: 12.5,
                  background: i === 0 ? T.primaryL : 'transparent', color: i === 0 ? T.primary : T.text,
                  fontWeight: i === 0 ? 600 : 500, borderRadius: 4,
                }}>{v}</button>
              ))}
            </div>
            <Select label="Sección" value="A-Ing"/>
            <Select label="Semana"  value="Semana 5"/>
            <div style={{ flex: 1 }}/>
            <Pill tone="danger"><Dot tone="danger" size={6}/>1 conflicto detectado</Pill>
          </div>

          {/* Conflict alert */}
          <div style={{
            display: 'flex', gap: 12, padding: '12px 14px', background: T.dangerL,
            border: `1px solid ${T.danger}`, borderRadius: T.r2, alignItems: 'center',
          }}>
            <div style={{ color: T.danger, display: 'flex' }}>{I.Warn}</div>
            <div style={{ flex: 1, fontSize: 12.5 }}>
              <strong style={{ color: T.danger }}>Conflicto de aula:</strong>{' '}
              <span style={{ color: T.text }}>Miércoles 17:00 — Aula 204 está asignada simultáneamente a "Historia · C-Letras" (Mg. Cárdenas) y "Razonamiento · C-Letras". Reasigne aula o cambie el horario.</span>
            </div>
            <Btn variant="secondary" size="sm" style={{ borderColor: T.danger, color: T.danger }}>Resolver</Btn>
          </div>

          {/* Grid */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, boxShadow: T.sh1, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, 1fr)', borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
              <div style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hora</div>
              {DAYS.map(d => (
                <div key={d} style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: T.text, textAlign: 'center' }}>{d}<div style={{ fontSize: 10, color: T.textMute, fontFamily: T.mono, fontWeight: 400, marginTop: 2 }}>{18 + DAYS.indexOf(d)} may</div></div>
              ))}
            </div>
            {HOUR_BLOCKS.map(h => (
              <div key={h} style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, 1fr)', borderTop: `1px solid ${T.borderS}`, minHeight: 96 }}>
                <div style={{ padding: '10px 8px', fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.textMute, borderRight: `1px solid ${T.borderS}` }}>{h}</div>
                {DAYS.map(d => {
                  const cls = SCHEDULE[`${d}-${h}`];
                  return (
                    <div key={d} style={{ padding: 4, borderRight: `1px solid ${T.borderS}`, position: 'relative' }}>
                      {cls && (
                        <div style={{
                          background: cls.conflict ? T.dangerL : `color-mix(in oklch, ${cls.col} 12%, white)`,
                          border: `1px solid ${cls.conflict ? T.danger : cls.col}`,
                          borderLeft: `3px solid ${cls.conflict ? T.danger : cls.col}`,
                          borderRadius: T.r2, padding: '7px 8px', height: '100%',
                          display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>{cls.c}</div>
                          <div style={{ fontSize: 10.5, color: T.textMute, lineHeight: 1.3 }}>{cls.d}</div>
                          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            <span style={{ fontSize: 10, fontFamily: T.mono, color: cls.conflict ? T.danger : cls.col, fontWeight: 600 }}>{cls.a}</span>
                            {cls.conflict && <span style={{ color: T.danger, display: 'flex' }}>{React.cloneElement(I.Warn, { size: 12 })}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card title="Aulas" subtitle="Ocupación de hoy" pad={16}>
            {[
              { n: 'Aula 201', cap: 60, ocu: 56, t: 'success' },
              { n: 'Aula 202', cap: 60, ocu: 52, t: 'success' },
              { n: 'Aula 203', cap: 50, ocu: 0,  t: 'neutral' },
              { n: 'Aula 204', cap: 50, ocu: 50, t: 'warning' },
              { n: 'Aula 305 (Lab)', cap: 30, ocu: 28, t: 'success' },
            ].map((a, i) => (
              <div key={a.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <Dot tone={a.t}/>
                <div style={{ flex: 1, fontSize: 12.5 }}>{a.n}</div>
                <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMute }}>{a.ocu}/{a.cap}</div>
              </div>
            ))}
          </Card>

          <Card title="Docentes disponibles" subtitle="Esta semana" pad={16}>
            {DOCENTES.slice(0, 4).map(d => (
              <div key={d.dni} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.borderS}` }}>
                <Avatar name={d.name} size={28}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: T.textMute }}>{d.curso}</div>
                </div>
                <Btn variant="ghost" size="sm" icon={I.Plus} style={{ padding: 4 }}/>
              </div>
            ))}
          </Card>

          <Card title="Leyenda" pad={14}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
              {[
                { c: 'oklch(0.55 0.13 240)', l: 'Matemática' },
                { c: 'oklch(0.55 0.13 145)', l: 'Biología' },
                { c: 'oklch(0.55 0.13 110)', l: 'Química' },
                { c: 'oklch(0.55 0.13 200)', l: 'Física' },
                { c: 'oklch(0.55 0.13 280)', l: 'Razonamiento' },
                { c: 'oklch(0.55 0.13 30)',  l: 'Literatura' },
                { c: 'oklch(0.55 0.13 60)',  l: 'Historia' },
              ].map(x => (
                <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: x.c }}/> {x.l}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── ASISTENCIA — Panel director (no vigilante) ───────────────
function AsistenciaPanel() {
  const tw = React.useContext(TweaksCtx);
  const rowPad = tw.density === 'compact' ? '7px 14px' : '11px 14px';
  return (
    <DesktopFrame role="admin" active="asistencia">
      <PageHeader
        title="Asistencia"
        crumbs={['Administración', 'Asistencia']}
        action={<>
          <Btn variant="secondary" icon={I.Download} size="sm">Exportar</Btn>
          <Btn variant="secondary" icon={I.Edit} size="sm">Corregir manualmente</Btn>
          <Btn icon={I.Scan} size="sm">Abrir pantalla vigilante</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <KPI label="Presentes ahora" value="772" sub="91% de 847" trend={+4} accent={T.success}/>
          <KPI label="Tardanzas hoy"   value="38"  sub="4.5% del total" accent={T.warning}/>
          <KPI label="Ausentes hoy"    value="37"  sub="4 con justificación" accent={T.danger}/>
          <KPI label="Correcciones pendientes" value="12" sub="solicitadas por docentes" accent={T.primary}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
          <Card title="Registros de hoy" subtitle="Lunes 19 may 2026" action={
            <div style={{ display: 'flex', gap: 6 }}>
              <Select label="Sección" value="Todas"/>
              <Select label="Estado" value="Todos"/>
            </div>
          }>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.surface2 }}>
                  <Th style={{ padding: rowPad }}>Hora</Th>
                  <Th style={{ padding: rowPad }}>Alumno</Th>
                  <Th style={{ padding: rowPad }}>Sección</Th>
                  <Th style={{ padding: rowPad }}>Curso esperado</Th>
                  <Th style={{ padding: rowPad }}>Estado</Th>
                  <Th style={{ padding: rowPad, width: 60 }}></Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { t: '13:58', a: 'Lucía Mendoza Quiroz',    s: 'A-Ing', c: 'Matemática',  e: 'Puntual' },
                  { t: '13:59', a: 'Diego Salazar Romero',    s: 'A-Ing', c: 'Matemática',  e: 'Puntual' },
                  { t: '14:00', a: 'Camila Vásquez Trujillo', s: 'B-Bio', c: 'Biología',    e: 'Puntual' },
                  { t: '14:08', a: 'Bruno Carrillo Alva',     s: 'B-Bio', c: 'Biología',    e: 'Tardanza' },
                  { t: '14:12', a: 'Renata Quispe Huamán',    s: 'C-Letras', c: 'Literatura', e: 'Tardanza' },
                  { t: '—',     a: 'Tomás Figueroa Pinto',    s: 'A-Ing', c: 'Matemática',  e: 'Ausente' },
                  { t: '14:01', a: 'Valeria Núñez Tello',     s: 'C-Letras', c: 'Literatura', e: 'Puntual' },
                  { t: '13:54', a: 'Mateo Rivera Castillo',   s: 'B-Bio', c: 'Biología',    e: 'Puntual' },
                ].map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.borderS}` }}>
                    <td style={{ padding: rowPad, fontFamily: T.mono, fontSize: 12.5, color: r.e === 'Ausente' ? T.danger : T.text }}>{r.t}</td>
                    <td style={{ padding: rowPad }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar name={r.a} size={28}/>
                        <span style={{ fontWeight: 500 }}>{r.a}</span>
                      </div>
                    </td>
                    <td style={{ padding: rowPad }}><Pill tone="neutral">{r.s}</Pill></td>
                    <td style={{ padding: rowPad, color: T.textMute, fontSize: 12.5 }}>{r.c}</td>
                    <td style={{ padding: rowPad }}>
                      <Pill tone={r.e === 'Puntual' ? 'success' : r.e === 'Tardanza' ? 'warning' : 'danger'}>
                        <Dot tone={r.e === 'Puntual' ? 'success' : r.e === 'Tardanza' ? 'warning' : 'danger'} size={6}/>{r.e}
                      </Pill>
                    </td>
                    <td style={{ padding: rowPad, textAlign: 'right' }}><Btn variant="ghost" size="sm" icon={I.More} style={{ padding: 4 }}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card title="Correcciones pendientes" subtitle="Solicitadas por docentes" pad={16}>
              {[
                { n: 'Diego Salazar Romero', d: 'Mg. León', m: 'Marcar tardanza como justificada', t: 'hace 8m' },
                { n: 'Bruno Carrillo Alva',  d: 'Lic. Bermúdez', m: 'Cambiar ausencia por presente', t: 'hace 1h' },
                { n: 'Tomás Figueroa Pinto', d: 'Dr. Tafur', m: 'Justificar ausencia (cita médica)', t: 'hace 2h' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '10px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar name={c.n} size={28}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.n}</div>
                      <div style={{ fontSize: 11, color: T.textMute }}>{c.d} · {c.t}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, padding: '6px 9px', background: T.surface2, borderRadius: T.r2, fontSize: 12, color: T.text }}>{c.m}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
                    <Btn size="sm" style={{ flex: 1 }}>Aprobar</Btn>
                    <Btn variant="secondary" size="sm" style={{ flex: 1 }}>Rechazar</Btn>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Asistencia docente · hoy" pad={16}>
              {DOCENTES.slice(0, 4).map((d, i) => (
                <div key={d.dni} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <Avatar name={d.name} size={26}/>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{d.name}</div>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMute }}>13:5{i}</span>
                  <Pill tone="success" style={{ fontSize: 10 }}>Puntual</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── COMUNICADOS ──────────────────────────────────────────────
function Comunicados() {
  return (
    <DesktopFrame role="admin" active="comunicados">
      <PageHeader
        title="Comunicados"
        crumbs={['Administración', 'Comunicados']}
        action={<><Btn icon={I.Plus} size="sm">Nuevo comunicado</Btn></>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
        {/* Left: list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, overflow: 'hidden', boxShadow: T.sh1 }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${T.borderS}` }}>
            <Input icon={I.Search} placeholder="Buscar comunicados..."/>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {['Todos','Enviados','Borradores'].map((t, i) => (
                <button key={t} style={{
                  padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: i === 0 ? T.primaryL : 'transparent', color: i === 0 ? T.primary : T.textMute,
                  fontFamily: T.sans, fontSize: 12, fontWeight: i === 0 ? 600 : 500,
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {[
              { t: 'Suspensión de clases sábado 24', s: 'Por simulacro sismo regional', ch: ['Panel','WhatsApp'], when: 'hace 2h', sent: 892, read: 612, active: true, tone: 'warning' },
              { t: 'Recordatorio simulacro general',  s: 'Viernes 23 a las 10:00 AM',    ch: ['Panel','SMS'],      when: 'ayer',   sent: 892, read: 780, tone: 'info' },
              { t: 'Cambio de aula Sec. B miércoles', s: 'Aula 202 → Aula 305',          ch: ['Panel'],            when: '2 días', sent: 253, read: 240, tone: 'neutral' },
              { t: 'Examen parcial 28 de mayo',       s: 'Cronograma adjunto',           ch: ['Panel','WhatsApp'], when: '4 días', sent: 892, read: 856, tone: 'primary' },
              { t: 'Inscripciones simulacro UNI',     s: 'Hasta el viernes 22',          ch: ['Panel'],            when: '1 sem',  sent: 302, read: 280, tone: 'neutral' },
            ].map((c, i) => (
              <div key={i} style={{
                padding: 14, cursor: 'pointer',
                background: c.active ? T.primaryL : 'transparent',
                borderLeft: `3px solid ${c.active ? T.primary : 'transparent'}`,
                borderBottom: `1px solid ${T.borderS}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Dot tone={c.tone}/>
                  <div style={{ fontSize: 13, fontWeight: 600, flex: 1, color: T.text }}>{c.t}</div>
                  <span style={{ fontSize: 10.5, color: T.textSoft }}>{c.when}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.textMute, marginBottom: 6 }}>{c.s}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  {c.ch.map(x => <span key={x} style={{ padding: '1px 6px', background: T.surface3, borderRadius: 4, color: T.textMute }}>{x}</span>)}
                  <span style={{ flex: 1 }}/>
                  <span style={{ color: T.textMute, fontFamily: T.mono }}>{c.read}/{c.sent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: editor / detail */}
        <Card pad={0}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.borderS}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill tone="warning"><Dot tone="warning" size={6}/>Enviado · activo</Pill>
                <span style={{ fontSize: 11.5, color: T.textMute }}>Programado para el 23 may a las 08:00</span>
              </div>
              <h2 style={{ margin: '8px 0 4px', fontFamily: T.serif, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>Suspensión de clases sábado 24</h2>
              <div style={{ fontSize: 12, color: T.textMute }}>Ana Ramírez · hace 2 horas</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" icon={I.Edit} size="sm">Editar</Btn>
              <Btn variant="ghost" icon={I.More} size="sm" style={{ padding: 6 }}/>
            </div>
          </div>

          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
            {/* Body */}
            <div>
              <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Mensaje</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: T.text }}>
                <p style={{ margin: '0 0 12px' }}>Estimados estudiantes y apoderados:</p>
                <p style={{ margin: '0 0 12px' }}>Se comunica que las clases del <strong>sábado 24 de mayo</strong> quedan suspendidas debido al simulacro regional de sismo programado por INDECI. Las clases se recuperarán el sábado 31 de mayo en el mismo horario.</p>
                <p style={{ margin: '0 0 12px' }}>Agradecemos su comprensión.</p>
                <p style={{ margin: 0 }}>—<br/>Dirección Académica · CEPREUNASAM</p>
              </div>

              <div style={{ marginTop: 22, padding: 14, background: T.surface2, borderRadius: T.r2, border: `1px solid ${T.borderS}` }}>
                <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Vista previa WhatsApp</div>
                <div style={{ background: '#dcf8c6', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, maxWidth: 320 }}>
                  *CEPREUNASAM* — Clases suspendidas sábado 24 may por simulacro regional. Se recuperan el sábado 31. Dirección Académica.
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destinatarios y canales</div>
              <div style={{ background: T.surface2, padding: 12, borderRadius: T.r2, border: `1px solid ${T.borderS}` }}>
                <div style={{ fontSize: 12, color: T.textMute, marginBottom: 4 }}>Audiencia</div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Todos los alumnos y apoderados</div>
                <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>892 alumnos · 1.140 apoderados</div>
              </div>

              {[
                { ch: 'Panel interno', i: I.Bell,  s: 892, r: 612, pct: 69, tone: T.primary },
                { ch: 'WhatsApp',      i: I.Phone, s: 1140, r: 1080, pct: 95, tone: T.success },
                { ch: 'SMS (Twilio)',  i: I.Phone, s: 0,   r: 0,    pct: 0, tone: T.textSoft, disabled: true },
              ].map(ch => (
                <div key={ch.ch} style={{ padding: 12, border: `1px solid ${T.borderS}`, borderRadius: T.r2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: ch.tone }}>{ch.i}</span>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{ch.ch}</div>
                    <Pill tone={ch.disabled ? 'neutral' : 'success'} style={{ fontSize: 10 }}>{ch.disabled ? 'No usado' : 'Enviado'}</Pill>
                  </div>
                  {!ch.disabled && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textMute, marginBottom: 4 }}>
                        <span>Entregados / Enviados</span>
                        <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>{ch.r}/{ch.s}</span>
                      </div>
                      <div style={{ height: 5, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${ch.pct}%`, height: '100%', background: ch.tone }}/>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </DesktopFrame>
  );
}

// ─── BIBLIOTECA ──────────────────────────────────────────────
function Biblioteca() {
  return (
    <DesktopFrame role="admin" active="biblioteca">
      <PageHeader
        title="Biblioteca digital"
        crumbs={['Administración', 'Biblioteca']}
        action={<>
          <Btn variant="secondary" icon={I.Plus} size="sm">Nueva carpeta</Btn>
          <Btn icon={I.Upload} size="sm">Subir recurso</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Sidebar */}
        <div>
          <Card pad={12}>
            <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px 8px' }}>Carpetas</div>
            {[
              { n: 'Todo',         c: 1842, a: true },
              { n: 'Matemática',   c: 412 },
              { n: 'Razonamiento', c: 286 },
              { n: 'Biología',     c: 198 },
              { n: 'Física',       c: 224 },
              { n: 'Química',      c: 187 },
              { n: 'Comunicación', c: 152 },
              { n: 'Historia',     c: 142 },
              { n: 'Simulacros',   c: 38 },
            ].map(f => (
              <div key={f.n} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 8px', borderRadius: T.r1, cursor: 'pointer',
                background: f.a ? T.primaryL : 'transparent', color: f.a ? T.primary : T.text,
                fontSize: 13, fontWeight: f.a ? 600 : 500,
              }}>
                <span>{f.n}</span>
                <span style={{ fontSize: 11, color: f.a ? T.primary : T.textMute, fontFamily: T.mono }}>{f.c}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${T.borderS}`, marginTop: 8, paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: T.textSoft, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px' }}>Tipos</div>
              {[
                { i: I.File, n: 'PDF',     c: 1240 },
                { i: I.Play, n: 'Videos',  c: 286 },
                { i: I.Link, n: 'Enlaces', c: 198 },
                { i: I.Image,n: 'Imágenes',c: 118 },
              ].map(t => (
                <div key={t.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 13, color: T.text, cursor: 'pointer' }}>
                  <span style={{ color: T.textMute }}>{t.i}</span>
                  <span style={{ flex: 1 }}>{t.n}</span>
                  <span style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>{t.c}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, maxWidth: 380 }}>
              <Input icon={I.Search} placeholder="Buscar recursos..."/>
            </div>
            <Select label="Ordenar" value="Recientes"/>
            <div style={{ flex: 1 }}/>
            <div style={{ display: 'inline-flex', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r2, padding: 2 }}>
              {[I.Grid, I.More].map((ic, i) => (
                <button key={i} style={{ padding: 6, border: 'none', background: i === 0 ? T.primaryL : 'transparent', color: i === 0 ? T.primary : T.textMute, cursor: 'pointer', borderRadius: 4 }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { t: 'pdf',   n: 'Cuadernillo Matemática · Bloque 3', s: '2.4 MB · 48 pág', c: 'Matemática', a: 'Dr. Tafur', when: 'hoy' },
              { t: 'video', n: 'Clase grabada: Trigonometría I',     s: '1h 22m',          c: 'Matemática', a: 'Dr. Tafur', when: 'ayer' },
              { t: 'pdf',   n: 'Práctica dirigida Biología N°5',     s: '820 KB · 12 pág', c: 'Biología',   a: 'Lic. Bermúdez', when: 'ayer' },
              { t: 'link',  n: 'PhET Simulador electromagnetismo',   s: 'phet.colorado.edu', c: 'Física',    a: 'Mg. Cabrera', when: '2 días' },
              { t: 'pdf',   n: 'Solucionario simulacro UNI 2025-II', s: '5.2 MB · 124 pág',c: 'Simulacros', a: 'Dirección',  when: '3 días' },
              { t: 'video', n: 'Repaso Química orgánica',             s: '54m',             c: 'Química',    a: 'Dr. Aguilar', when: '4 días' },
              { t: 'pdf',   n: 'Antología literaria · siglo XX',     s: '1.8 MB · 64 pág', c: 'Literatura', a: 'Lic. Espinoza', when: '5 días' },
              { t: 'link',  n: 'Banco de problemas UNMSM',           s: 'unmsm.edu.pe',    c: 'Razonamiento', a: 'Mg. León',    when: '1 sem' },
            ].map((r, i) => (
              <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, boxShadow: T.sh1, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{
                  height: 110, background: T.surface2, position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.t === 'pdf' && (
                    <div style={{ fontFamily: T.serif, fontSize: 42, fontWeight: 600, color: T.danger, opacity: .25 }}>PDF</div>
                  )}
                  {r.t === 'video' && (
                    <>
                      <PH w="100%" h="100%" label="" style={{ border: 'none', borderRadius: 0 }}/>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(0,0,0,.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 }}>{I.Play}</div>
                      </div>
                    </>
                  )}
                  {r.t === 'link' && (
                    <div style={{ color: T.info, opacity: .7 }}>{React.cloneElement(I.Link, { size: 36 })}</div>
                  )}
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Pill tone={r.t === 'pdf' ? 'danger' : r.t === 'video' ? 'primary' : 'info'} style={{ textTransform: 'uppercase', fontSize: 9, fontWeight: 700 }}>{r.t}</Pill>
                  </div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, color: T.text }}>{r.n}</div>
                  <div style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>{r.s}</div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.borderS}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pill tone="neutral" style={{ fontSize: 10 }}>{r.c}</Pill>
                    <span style={{ flex: 1 }}/>
                    <span style={{ fontSize: 10.5, color: T.textSoft }}>{r.when}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── REPORTES ─────────────────────────────────────────────────
function Reportes() {
  return (
    <DesktopFrame role="admin" active="reportes">
      <PageHeader
        title="Reportes"
        crumbs={['Administración', 'Reportes']}
        action={<>
          <Btn variant="secondary" icon={I.Download} size="sm">Excel</Btn>
          <Btn icon={I.Download} size="sm">PDF</Btn>
        </>}
      />
      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Filters */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 12, boxShadow: T.sh1,
        }}>
          <Select label="Reporte"  value="Asistencia general"/>
          <Select label="Ciclo"    value="2026-I"/>
          <Select label="Periodo"  value="Últimos 30 días"/>
          <Select label="Sección"  value="Todas"/>
          <div style={{ flex: 1 }}/>
          <Btn variant="ghost" size="sm" icon={I.Filter}>Filtros avanzados</Btn>
          <Btn size="sm">Generar</Btn>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <KPI label="Asistencia media" value="91.4%" trend={+2.1} sub="ciclo 2026-I" accent={T.success}/>
          <KPI label="Tardanzas"        value="4.5%"  trend={-0.8} sub="del total registrado" accent={T.warning}/>
          <KPI label="Puntualidad doc."  value="97.2%" trend={+1.4} accent={T.primary}/>
          <KPI label="Sesiones dictadas" value="318/320" sub="2 reprogramadas" accent={T.info}/>
        </div>

        {/* Chart card */}
        <Card title="Tendencia de asistencia" subtitle="Últimos 30 días — todas las secciones" pad={20}>
          <BigChart/>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <Card title="Ranking de puntualidad docente" subtitle="Ciclo 2026-I" pad={16}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <Th>#</Th><Th>Docente</Th><Th>Curso</Th><Th>Asist.</Th><Th>Punt.</Th>
              </tr></thead>
              <tbody>
                {DOCENTES.map((d, i) => (
                  <tr key={d.dni} style={{ borderTop: `1px solid ${T.borderS}` }}>
                    <td style={{ padding: '8px 14px', fontFamily: T.serif, fontWeight: 700, fontSize: 14, color: i < 3 ? T.primary : T.textMute, width: 30 }}>{i + 1}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={d.name} size={26}/><span style={{ fontSize: 12.5, fontWeight: 500 }}>{d.name}</span></div>
                    </td>
                    <td style={{ padding: '8px 14px', color: T.textMute }}>{d.curso}</td>
                    <td style={{ padding: '8px 14px', fontFamily: T.mono, fontSize: 12 }}>{d.asist}%</td>
                    <td style={{ padding: '8px 14px' }}><Pill tone={i < 3 ? 'success' : 'neutral'}>{98 - i}%</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Distribución de asistencia" subtitle="Por sección" pad={16}>
            {[
              { s: 'A-Ing',    p: 93, n: 302, c: 'oklch(0.55 0.13 240)' },
              { s: 'B-Bio',    p: 95, n: 253, c: 'oklch(0.55 0.13 145)' },
              { s: 'C-Letras', p: 86, n: 292, c: 'oklch(0.55 0.13 30)' },
            ].map((s, i) => (
              <div key={s.s} style={{ padding: '12px 0', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{s.s} <span style={{ color: T.textMute, fontWeight: 400 }}>· {s.n} alumnos</span></span>
                  <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: s.c }}>{s.p}%</span>
                </div>
                <div style={{ height: 8, background: T.surface3, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${s.p}%`, height: '100%', background: s.c }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: T.textMute }}>
                  <span>Puntual {s.p - 5}%</span><span>Tard. 4%</span><span>Aus. {100 - s.p}%</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DesktopFrame>
  );
}

function BigChart() {
  // synthetic line chart
  const days = 30;
  const data = Array.from({ length: days }, (_, i) => 86 + Math.sin(i * 0.4) * 4 + Math.cos(i * 0.2) * 2 + (i / days) * 3);
  const w = 800, h = 220, pad = 24;
  const max = Math.max(...data) + 3, min = Math.min(...data) - 3;
  const px = (i) => pad + (i / (days - 1)) * (w - pad * 2);
  const py = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${px(i)},${py(v)}`).join(' ');
  const area = `${line} L${px(days - 1)},${h - pad} L${px(0)},${h - pad} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = pad + t * (h - pad * 2);
          const v = Math.round(max - t * (max - min));
          return (
            <g key={t}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke={T.borderS} strokeWidth="1" strokeDasharray="3 3"/>
              <text x={pad - 6} y={y + 3} fill={T.textSoft} fontSize="10" fontFamily={T.mono} textAnchor="end">{v}%</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={T.primary} stopOpacity="0.25"/>
            <stop offset="1" stopColor={T.primary} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g1)"/>
        <path d={line} fill="none" stroke={T.primary} strokeWidth="2.2" strokeLinecap="round"/>
        {data.map((v, i) => i % 5 === 0 && (
          <circle key={i} cx={px(i)} cy={py(v)} r="3" fill={T.primary}/>
        ))}
        {/* x labels */}
        {[0, 7, 14, 21, 29].map(i => (
          <text key={i} x={px(i)} y={h - 6} fill={T.textSoft} fontSize="10" fontFamily={T.mono} textAnchor="middle">{i + 1} may</text>
        ))}
      </svg>
    </div>
  );
}

Object.assign(window, { Horarios, AsistenciaPanel, Comunicados, Biblioteca, Reportes });
