// screens-mobile.jsx — Pantallas móviles para alumno y apoderado

// ─── ALUMNO · Inicio ──────────────────────────────────────────
function AlumnoInicio() {
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Hero card with carnet */}
        <div style={{
          background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryD} 100%)`,
          color: '#fff', padding: '8px 20px 22px', position: 'relative', overflow: 'hidden',
        }}>
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', right: -60, top: -40, opacity: .1 }}>
            <circle cx="110" cy="110" r="100" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="110" cy="110" r="70" fill="none" stroke="#fff" strokeWidth="1"/>
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, opacity: .7, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Hola</div>
              <div style={{ fontFamily: T.serif, fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em' }}>Lucía 👋</div>
            </div>
            <div style={{ position: 'relative' }}>
              <button style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.Bell}</button>
              <span style={{ position: 'absolute', top: 5, right: 5, width: 8, height: 8, background: '#ff8a8a', borderRadius: 999, border: `1.5px solid ${T.primary}` }}/>
            </div>
          </div>

          {/* Carnet */}
          <div style={{ background: '#fff', borderRadius: T.r3, padding: '12px 14px 10px', color: T.text, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Avatar name="Lucía Mendoza Quiroz" size={40}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mi carnet</div>
                <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Lucía Mendoza Q.</div>
                <div style={{ fontSize: 11, color: T.textMute }}>Sección A-Ing · 2026-I</div>
              </div>
            </div>
            <div style={{ background: T.surface2, borderRadius: T.r2, padding: '10px 12px 8px', display: 'flex', justifyContent: 'center' }}>
              <Barcode value="100245" w={260} h={50}/>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '18px 18px 80px', display: 'flex', flexDirection: 'column', gap: 16, background: T.bg }}>
          {/* Asistencia */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Mi asistencia</h3>
              <a href="#" style={{ fontSize: 12, color: T.primary, textDecoration: 'none', fontWeight: 600 }}>Ver detalle ›</a>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 16, boxShadow: T.sh1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: T.serif, fontSize: 42, fontWeight: 600, color: T.success, letterSpacing: '-0.02em', lineHeight: 1 }}>96<span style={{ fontSize: 22 }}>%</span></span>
                <span style={{ fontSize: 12, color: T.textMute }}>48 / 50 sesiones</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['L','M','M','J','V','L','M','M','J','V','L','M','M','J','V'].map((d, i) => {
                  const status = [0,0,0,0,0, 0,0,1,0,0, 0,0,0,2,0][i];
                  const c = status === 0 ? T.success : status === 1 ? T.warning : '#ddd';
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 26, borderRadius: 4, background: c, opacity: status === 2 ? 0.4 : 1 }}/>
                      <div style={{ fontSize: 9, color: T.textMute, marginTop: 4 }}>{d}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 11, color: T.textMute }}>
                <span><Dot tone="success" size={6}/> Puntual</span>
                <span><Dot tone="warning" size={6}/> Tardanza</span>
                <span><span style={{ width: 6, height: 6, borderRadius: 999, background: '#ddd', display: 'inline-block', marginRight: 4 }}/>Próximo</span>
              </div>
            </div>
          </div>

          {/* Próxima clase */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontFamily: T.serif, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Hoy</h3>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: T.sh1 }}>
              <div style={{ width: 6, height: 56, borderRadius: 4, background: 'oklch(0.55 0.13 240)' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.primary, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Próxima clase · en 15 min</div>
                <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, marginTop: 2 }}>Matemática</div>
                <div style={{ fontSize: 12, color: T.textMute, marginTop: 2 }}>Dr. Tafur · Aula 201 · 14:00–15:30</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text }}>14:00</div>
            </div>
            <div style={{ marginTop: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: T.sh1 }}>
              <div style={{ width: 6, height: 56, borderRadius: 4, background: 'oklch(0.55 0.13 280)' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.textMute, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Después</div>
                <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, marginTop: 2 }}>Razonamiento</div>
                <div style={{ fontSize: 12, color: T.textMute, marginTop: 2 }}>Mg. León · Aula 201</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 14, color: T.textMute }}>15:30</div>
            </div>
          </div>

          {/* Comunicados */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Avisos</h3>
              <Pill tone="danger">2 nuevos</Pill>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, overflow: 'hidden', boxShadow: T.sh1 }}>
              {[
                { t: 'Suspensión clases sábado 24', s: 'Por simulacro · Dirección', when: '2h', tone: 'warning', unread: true },
                { t: 'Examen parcial 28 de mayo', s: 'Cronograma adjunto', when: '4d', tone: 'primary', unread: true },
                { t: 'Cambio de aula miércoles', s: 'Aula 202 → 305', when: '1 sem', tone: 'neutral' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '12px 14px', borderBottom: i < 2 ? `1px solid ${T.borderS}` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ paddingTop: 4 }}><Dot tone={c.tone}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: c.unread ? 600 : 500, color: T.text }}>{c.t}</div>
                    <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{c.s}</div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textSoft, whiteSpace: 'nowrap' }}>{c.when}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileTabBar active="inicio" role="alumno"/>
      </div>
    </MobileFrame>
  );
}

// ─── ALUMNO · Asistencia ──────────────────────────────────────
function AlumnoAsistencia() {
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MobileHeader sub="Ciclo 2026-I" title="Mi asistencia" dark/>
        <div style={{ background: T.primary, padding: '0 18px 22px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: T.serif, fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>96<span style={{ fontSize: 28 }}>%</span></span>
            <span style={{ fontSize: 13, opacity: .8 }}>asistencia general</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <MStat n="48" l="Puntuales"/>
            <MStat n="1"  l="Tardanzas"/>
            <MStat n="1"  l="Justificadas"/>
          </div>
        </div>

        <div style={{ padding: '18px 18px 80px', background: T.bg, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Por curso */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontFamily: T.serif, fontSize: 16, fontWeight: 600 }}>Por curso</h3>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 4, boxShadow: T.sh1 }}>
              {[
                { c: 'Matemática',   p: 100, t: '12/12', col: 'oklch(0.55 0.13 240)' },
                { c: 'Razonamiento', p: 92,  t: '11/12', col: 'oklch(0.55 0.13 280)' },
                { c: 'Física',       p: 100, t: '8/8',   col: 'oklch(0.55 0.13 200)' },
                { c: 'Química',      p: 87,  t: '7/8',   col: 'oklch(0.55 0.13 110)' },
                { c: 'Comunicación', p: 100, t: '10/10', col: 'oklch(0.55 0.13 30)' },
              ].map((c, i) => (
                <div key={c.c} style={{ padding: '11px 12px', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: c.col }}/>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.c}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute }}>{c.t}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: c.p < 90 ? T.warning : T.success, minWidth: 36, textAlign: 'right' }}>{c.p}%</div>
                  </div>
                  <div style={{ height: 4, background: T.surface3, borderRadius: 2 }}>
                    <div style={{ width: `${c.p}%`, height: '100%', background: c.col, borderRadius: 2 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontFamily: T.serif, fontSize: 16, fontWeight: 600 }}>Esta semana</h3>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 4, boxShadow: T.sh1 }}>
              {[
                { d: 'Lun 13', t: '07:42', s: 'Puntual', tone: 'success' },
                { d: 'Mar 14', t: '07:58', s: 'Puntual', tone: 'success' },
                { d: 'Mié 15', t: '08:11', s: 'Tardanza · 8 min', tone: 'warning' },
                { d: 'Jue 16', t: '—',     s: 'Justificada', tone: 'info' },
                { d: 'Vie 17', t: '07:39', s: 'Puntual', tone: 'success' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, width: 60 }}>{r.d}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute, width: 48 }}>{r.t}</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <Pill tone={r.tone}><Dot tone={r.tone} size={6}/>{r.s}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileTabBar active="asist" role="alumno"/>
      </div>
    </MobileFrame>
  );
}
function MStat({ n, l }) {
  return (
    <div>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 10.5, opacity: .75, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</div>
    </div>
  );
}

// ─── ALUMNO · Horario ─────────────────────────────────────────
function AlumnoHorario() {
  const blocks = [
    { day: 'Lun', items: [
      { h: '14:00', c: 'Matemática',   d: 'Dr. Tafur',     a: '201', col: 'oklch(0.55 0.13 240)' },
      { h: '15:30', c: 'Razonamiento', d: 'Mg. León',      a: '201', col: 'oklch(0.55 0.13 280)' },
      { h: '17:00', c: 'Física',       d: 'Mg. Cabrera',   a: '305', col: 'oklch(0.55 0.13 200)' },
    ]},
    { day: 'Mar', items: [
      { h: '14:00', c: 'Química',      d: 'Dr. Aguilar',   a: '305', col: 'oklch(0.55 0.13 110)' },
      { h: '15:30', c: 'Matemática',   d: 'Dr. Tafur',     a: '201', col: 'oklch(0.55 0.13 240)' },
    ]},
    { day: 'Mié', items: [
      { h: '14:00', c: 'Razonamiento', d: 'Mg. León',      a: '201', col: 'oklch(0.55 0.13 280)' },
      { h: '15:30', c: 'Comunicación', d: 'Lic. Espinoza', a: '203', col: 'oklch(0.55 0.13 30)' },
      { h: '17:00', c: 'Física',       d: 'Mg. Cabrera',   a: '305', col: 'oklch(0.55 0.13 200)' },
    ]},
  ];
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MobileHeader sub="Sección A-Ing · 2026-I" title="Mi horario" dark
          action={<Btn size="sm" variant="secondary" icon={I.Download} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'transparent' }}>PDF</Btn>}
        />
        <div style={{ background: T.primary, padding: '0 14px 14px', display: 'flex', gap: 6 }}>
          {['Lun 19','Mar 20','Mié 21','Jue 22','Vie 23','Sáb 24'].map((d, i) => (
            <button key={d} style={{
              flex: 1, padding: '8px 0', borderRadius: T.r2, border: 'none', cursor: 'pointer',
              background: i === 0 ? '#fff' : 'rgba(255,255,255,.1)',
              color: i === 0 ? T.primary : '#fff',
              fontFamily: T.sans, fontSize: 11.5, fontWeight: i === 0 ? 700 : 500,
              opacity: i === 5 ? .5 : 1,
            }}>{d}</button>
          ))}
        </div>

        <div style={{ padding: '18px 18px 80px', background: T.bg, flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {blocks.map(b => (
            <div key={b.day}>
              <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, marginBottom: 8, color: T.text }}>{b.day === 'Lun' ? 'Hoy · Lunes' : b.day === 'Mar' ? 'Mañana · Martes' : 'Miércoles'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {b.items.map((it, i) => (
                  <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 12, display: 'flex', gap: 12, boxShadow: T.sh1, alignItems: 'center' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.textMute, width: 44, lineHeight: 1.3 }}>
                      <div>{it.h}</div>
                      <div style={{ fontSize: 10, fontWeight: 400, opacity: .7 }}>1h 30</div>
                    </div>
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: it.col }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: T.serif }}>{it.c}</div>
                      <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{it.d} · Aula {it.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <MobileTabBar active="horario" role="alumno"/>
      </div>
    </MobileFrame>
  );
}

// ─── ALUMNO · Biblioteca ──────────────────────────────────────
function AlumnoBiblioteca() {
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MobileHeader sub="Tus recursos" title="Biblioteca"
          action={<button style={{ width: 36, height: 36, borderRadius: 999, background: T.surface2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.Search}</button>}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 80px', background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 4, paddingBottom: 4 }}>
            {['Todos','Matemática','Biología','Razonamiento','Física','Química','Literatura'].map((t, i) => (
              <button key={t} style={{
                padding: '6px 12px', borderRadius: 999, border: `1px solid ${i === 0 ? T.primary : T.border}`,
                background: i === 0 ? T.primary : T.surface, color: i === 0 ? '#fff' : T.text,
                fontFamily: T.sans, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>Continuar</h3>
              <a href="#" style={{ fontSize: 12, color: T.primary, textDecoration: 'none', fontWeight: 600 }}>Ver todo ›</a>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
              {[
                { t: 'pdf',  n: 'Cuadernillo Mat. · B3', s: '48 pág', p: 45, col: T.danger },
                { t: 'video',n: 'Trigonometría I',       s: '1h 22m', p: 28, col: T.primary },
                { t: 'pdf',  n: 'Práctica Bio N°5',       s: '12 pág', p: 65, col: T.danger },
              ].map((r, i) => (
                <div key={i} style={{ minWidth: 160, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, boxShadow: T.sh1, overflow: 'hidden' }}>
                  <div style={{ height: 76, background: T.surface2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 700, color: r.col, opacity: .35, textTransform: 'uppercase' }}>{r.t}</span>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: T.surface3 }}>
                      <div style={{ width: `${r.p}%`, height: '100%', background: r.col }}/>
                    </div>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{r.n}</div>
                    <div style={{ fontSize: 10.5, color: T.textMute, fontFamily: T.mono, marginTop: 3 }}>{r.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 10px', fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>Recientes</h3>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 4, boxShadow: T.sh1 }}>
              {[
                { t: 'pdf',   n: 'Solucionario simulacro UNI 2025-II', s: '5.2 MB · 124 pág', c: 'Simulacros', when: 'hoy' },
                { t: 'video', n: 'Repaso Química orgánica',            s: '54m',              c: 'Química',    when: 'ayer' },
                { t: 'pdf',   n: 'Antología literaria · siglo XX',    s: '1.8 MB · 64 pág',  c: 'Literatura', when: '3 días' },
                { t: 'link',  n: 'Banco de problemas UNMSM',          s: 'unmsm.edu.pe',     c: 'Razonamiento', when: '5 días' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: T.r2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: r.t === 'pdf' ? T.dangerL : r.t === 'video' ? T.primaryL : T.infoL,
                    color: r.t === 'pdf' ? T.danger : r.t === 'video' ? T.primary : T.info,
                  }}>{r.t === 'pdf' ? I.File : r.t === 'video' ? I.Play : I.Link}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.n}</div>
                    <div style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>{r.s} · {r.when}</div>
                  </div>
                  <Btn variant="ghost" size="sm" icon={I.Download} style={{ padding: 6 }}/>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileTabBar active="biblio" role="alumno"/>
      </div>
    </MobileFrame>
  );
}

// ─── ALUMNO · Comunicados ─────────────────────────────────────
function AlumnoComunicados() {
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MobileHeader sub="3 nuevos" title="Avisos"/>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 80px', background: T.bg, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: 'Suspensión de clases sábado 24', s: 'Se suspenden las clases del sábado 24 de mayo por simulacro regional. Las clases se recuperarán el sábado 31.', from: 'Dirección Académica', when: 'Hoy · 12:30', tone: 'warning', unread: true },
            { t: 'Examen parcial 28 de mayo',      s: 'Adjuntamos cronograma de evaluaciones por curso y aula. Revisar con anticipación.',                              from: 'Coordinación', when: 'Vie · 09:15', tone: 'primary', unread: true },
            { t: 'Nuevo material de estudio · Física', s: 'Mg. Cabrera subió un nuevo cuadernillo a la biblioteca.', from: 'Mg. Sandra Cabrera', when: 'Jue · 18:42', tone: 'info', unread: true },
            { t: 'Cambio de aula sec. B miércoles', s: 'Aula 202 → Aula 305 por mantenimiento.',  from: 'Dirección Académica', when: '15 may', tone: 'neutral' },
            { t: 'Recordatorio · pago segunda cuota', s: 'Fecha límite: 30 de mayo.',  from: 'Tesorería', when: '12 may', tone: 'neutral' },
          ].map((c, i) => (
            <div key={i} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 14, boxShadow: T.sh1,
              borderLeft: `3px solid ${c.tone === 'warning' ? T.warning : c.tone === 'primary' ? T.primary : c.tone === 'info' ? T.info : T.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {c.unread && <Dot tone={c.tone}/>}
                <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 600 }}>{c.from}</div>
                <div style={{ flex: 1 }}/>
                <div style={{ fontSize: 11, color: T.textSoft }}>{c.when}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: c.unread ? 600 : 500, fontFamily: T.serif, letterSpacing: '-0.01em', marginBottom: 4 }}>{c.t}</div>
              <div style={{ fontSize: 12.5, color: T.textMute, lineHeight: 1.5 }}>{c.s}</div>
            </div>
          ))}
        </div>
        <MobileTabBar active="menu" role="alumno"/>
      </div>
    </MobileFrame>
  );
}

// ─── APODERADO · Inicio ───────────────────────────────────────
function ApoderadoInicio() {
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header with child selector */}
        <div style={{ background: T.primary, color: '#fff', padding: '8px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10.5, opacity: .7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Apoderado</div>
              <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600 }}>Sra. Rosa Quiroz</div>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.Bell}</button>
          </div>

          {/* Child picker */}
          <div style={{ marginTop: 14, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', borderRadius: T.r3, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name="Lucía Mendoza Quiroz" size={42}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, opacity: .7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estás viendo a</div>
              <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>Lucía Mendoza Q.</div>
              <div style={{ fontSize: 11, opacity: .8 }}>Sección A-Ing · Cód. 100245</div>
            </div>
            {I.ChevD}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 80px', background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hoy */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 14, boxShadow: T.sh1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Dot tone="success"/>
              <div style={{ fontSize: 11, color: T.success, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Asistió hoy</div>
              <div style={{ flex: 1 }}/>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute }}>13:58</span>
            </div>
            <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
              Su hija ingresó al centro a las <strong>13:58</strong>, antes del inicio de la clase de <strong>Matemática</strong> (14:00). Salida prevista: 19:00.
            </div>
          </div>

          {/* Resumen */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>Resumen del ciclo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { l: 'Asistencia', v: '96%', t: T.success, s: '48/50' },
                { l: 'Puntualidad', v: '92%', t: T.primary, s: '4 tardanzas' },
                { l: 'Tardanzas',  v: '4',   t: T.warning, s: 'este ciclo' },
                { l: 'Ausencias',  v: '1',   t: T.danger,  s: 'justificada' },
              ].map(k => (
                <div key={k.l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: '12px 14px', boxShadow: T.sh1 }}>
                  <div style={{ fontSize: 11, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.l}</div>
                  <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: k.t, lineHeight: 1.1, marginTop: 4 }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{k.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Última semana */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>Asistencia esta semana</h3>
              <a href="#" style={{ fontSize: 12, color: T.primary, textDecoration: 'none', fontWeight: 600 }}>Ver historial ›</a>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 4, boxShadow: T.sh1 }}>
              {[
                { d: 'Lunes 19', t: '13:58', s: 'Puntual', tone: 'success' },
                { d: 'Vie 17',   t: '07:39', s: 'Puntual', tone: 'success' },
                { d: 'Jue 16',   t: '—',     s: 'Justificada · cita médica', tone: 'info' },
                { d: 'Mié 15',   t: '08:11', s: 'Tardanza · 8 min', tone: 'warning' },
                { d: 'Mar 14',   t: '07:58', s: 'Puntual', tone: 'success' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: r.tone === 'success' ? T.success : r.tone === 'warning' ? T.warning : T.info, flexShrink: 0 }}/>
                  <div style={{ fontSize: 12.5, fontWeight: 500, width: 80 }}>{r.d}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMute, width: 48 }}>{r.t}</div>
                  <div style={{ flex: 1, fontSize: 12, color: T.textMute, textAlign: 'right' }}>{r.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Comunicados */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>Avisos para apoderados</h3>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, overflow: 'hidden', boxShadow: T.sh1 }}>
              {[
                { t: 'Reunión de padres 31 de mayo', s: '10:00 AM · Auditorio principal', when: '2h', tone: 'primary', unread: true },
                { t: 'Suspensión clases sábado 24',  s: 'Por simulacro regional', when: '2h', tone: 'warning', unread: true },
                { t: 'Recordatorio pago segunda cuota', s: 'Fecha límite 30 may', when: '4 días', tone: 'neutral' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: i < 2 ? `1px solid ${T.borderS}` : 'none', alignItems: 'flex-start' }}>
                  <div style={{ paddingTop: 4 }}><Dot tone={c.tone}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: c.unread ? 600 : 500 }}>{c.t}</div>
                    <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{c.s}</div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textSoft, whiteSpace: 'nowrap' }}>{c.when}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contacto */}
          <div style={{ background: T.surface2, border: `1px dashed ${T.border}`, borderRadius: T.r3, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: T.primaryL, color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{I.Phone}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>¿Necesita comunicarse?</div>
              <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>Tutor de la sección · L–V 09:00–17:00</div>
            </div>
            <Btn size="sm">Contactar</Btn>
          </div>
        </div>

        <MobileTabBar active="inicio" role="apoderado"/>
      </div>
    </MobileFrame>
  );
}

// ─── APODERADO · Asistencia hijo (detalle) ────────────────────
function ApoderadoAsistencia() {
  return (
    <MobileFrame>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ background: T.primary, color: '#fff', padding: '8px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.ChevL}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, opacity: .7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Asistencia detallada</div>
              <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600 }}>Lucía Mendoza Q.</div>
            </div>
          </div>

          {/* Calendar */}
          <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: T.r3, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600 }}>Mayo 2026</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.ChevL}</button>
                <button style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.ChevR}</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
              {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, opacity: .7, fontWeight: 600 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {Array.from({ length: 35 }, (_, i) => i - 3).map((d, i) => {
                const inMonth = d > 0 && d <= 31;
                const isToday = d === 19;
                const status = inMonth && d <= 19 ? (
                  d === 15 ? 'warning' : d === 16 ? 'info' : 'success'
                ) : null;
                return (
                  <div key={i} style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontFamily: T.mono,
                    opacity: inMonth ? 1 : .25,
                    color: '#fff', fontWeight: isToday ? 700 : 500,
                    background: isToday ? '#fff' : status === 'success' ? 'rgba(123,224,135,.3)' : status === 'warning' ? 'rgba(255,180,80,.3)' : status === 'info' ? 'rgba(120,170,255,.3)' : 'transparent',
                    borderRadius: 6, position: 'relative',
                    boxShadow: isToday ? '0 0 0 2px rgba(255,255,255,.4)' : 'none',
                    border: status ? `1px solid ${status === 'success' ? 'rgba(123,224,135,.5)' : status === 'warning' ? 'rgba(255,180,80,.5)' : 'rgba(120,170,255,.5)'}` : 'none',
                  }}>
                    <span style={{ color: isToday ? T.primary : '#fff' }}>{inMonth ? d : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, opacity: .85 }}>
            <span><Dot tone="success" size={6}/> Asistió</span>
            <span><Dot tone="warning" size={6}/> Tardanza</span>
            <span><Dot tone="info" size={6}/> Justificada</span>
            <span><Dot tone="danger" size={6}/> Ausente</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 80px', background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 16, fontWeight: 600 }}>Registros de mayo</h3>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r3, padding: 4, boxShadow: T.sh1 }}>
            {[
              { d: '19 may · Lun', t: '13:58', s: 'Puntual', tone: 'success' },
              { d: '17 may · Vie', t: '07:39', s: 'Puntual', tone: 'success' },
              { d: '16 may · Jue', t: '—',     s: 'Justificada · cita médica', tone: 'info' },
              { d: '15 may · Mié', t: '08:11', s: 'Tardanza · 8 min', tone: 'warning' },
              { d: '14 may · Mar', t: '07:58', s: 'Puntual', tone: 'success' },
              { d: '13 may · Lun', t: '07:42', s: 'Puntual', tone: 'success' },
              { d: '10 may · Vie', t: '07:55', s: 'Puntual', tone: 'success' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderTop: i ? `1px solid ${T.borderS}` : 'none' }}>
                <Dot tone={r.tone}/>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{r.d}</div>
                <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMute, width: 48 }}>{r.t}</div>
                <Pill tone={r.tone} style={{ fontSize: 10 }}>{r.s}</Pill>
              </div>
            ))}
          </div>
        </div>

        <MobileTabBar active="asist" role="apoderado"/>
      </div>
    </MobileFrame>
  );
}

Object.assign(window, {
  AlumnoInicio, AlumnoAsistencia, AlumnoHorario, AlumnoBiblioteca, AlumnoComunicados,
  ApoderadoInicio, ApoderadoAsistencia,
});
