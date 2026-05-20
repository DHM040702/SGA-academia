// screens-vigilante.jsx — Pantalla kiosko + feed lateral

function VigilanteKiosko() {
  // Recent scan in-focus + live feed sidebar
  const recent = [
    { t: '14:02', n: 'Lucía Mendoza Quiroz',    cod: '100245', sec: 'A-Ing',   curso: 'Matemática', s: 'Puntual' },
    { t: '14:01', n: 'Diego Salazar Romero',    cod: '100246', sec: 'A-Ing',   curso: 'Matemática', s: 'Puntual' },
    { t: '14:01', n: 'Camila Vásquez Trujillo', cod: '100247', sec: 'B-Bio',   curso: 'Biología',   s: 'Puntual' },
    { t: '14:00', n: 'Valeria Núñez Tello',     cod: '100251', sec: 'C-Letras',curso: 'Literatura', s: 'Puntual' },
    { t: '13:59', n: 'Mateo Rivera Castillo',   cod: '100252', sec: 'B-Bio',   curso: 'Biología',   s: 'Puntual' },
    { t: '13:58', n: 'Isabela Cárdenas Soto',   cod: '100253', sec: 'A-Ing',   curso: 'Matemática', s: 'Puntual' },
    { t: '13:57', n: 'Joaquín Paredes Villar',  cod: '100254', sec: 'C-Letras',curso: 'Literatura', s: 'Puntual' },
    { t: '13:55', n: 'Renata Quispe Huamán',    cod: '100249', sec: 'C-Letras',curso: 'Literatura', s: 'Puntual' },
    { t: '13:50', n: 'Bruno Carrillo Alva',     cod: '100248', sec: 'B-Bio',   curso: 'Biología',   s: 'Puntual' },
  ];
  const focus = recent[0];

  return (
    <div style={{
      width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 360px',
      background: T.text, color: '#fff', fontFamily: T.sans, overflow: 'hidden', borderRadius: T.r3,
    }}>
      {/* Main kiosko */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '14px 26px',
          background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Wordmark light/>
          <div style={{ flex: 1 }}/>
          <Pill tone="success" style={{ background: 'rgba(80,170,90,.15)', color: '#7be087', border: '1px solid rgba(80,170,90,.3)' }}>
            <Dot tone="success" size={6}/> Lector conectado
          </Pill>
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)', margin: '0 14px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name="Jorge Ríos" size={28}/>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Jorge Ríos</div>
              <div style={{ fontSize: 10.5, opacity: .7 }}>Vigilante · Entrada principal</div>
            </div>
          </div>
        </div>

        {/* Center */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, position: 'relative' }}>
          {/* Ambient ring */}
          <svg width="600" height="600" viewBox="0 0 600 600" style={{ position: 'absolute', opacity: .04 }}>
            <circle cx="300" cy="300" r="280" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="300" cy="300" r="200" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="300" cy="300" r="120" fill="none" stroke="#fff" strokeWidth="1"/>
          </svg>

          <div style={{ position: 'relative', textAlign: 'center', maxWidth: 720 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: .55, marginBottom: 10 }}>Último ingreso registrado</div>
            <div style={{
              width: 180, height: 180, borderRadius: 999, margin: '0 auto 24px',
              background: 'rgba(255,255,255,.06)', border: '4px solid rgba(255,255,255,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 60px rgba(125,165,255,.25)`,
            }}>
              <Avatar name={focus.n} size={160}/>
            </div>
            <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 44, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ✓ {focus.n}
            </h1>
            <div style={{ marginTop: 12, fontSize: 16, opacity: .75 }}>
              <span style={{ fontFamily: T.mono, color: '#fff' }}>{focus.cod}</span>
              <span style={{ margin: '0 10px', opacity: .4 }}>·</span>
              <span>Sección {focus.sec}</span>
              <span style={{ margin: '0 10px', opacity: .4 }}>·</span>
              <span>{focus.curso} · Aula 201</span>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 26,
              padding: '12px 22px', background: 'rgba(80,170,90,.15)', color: '#7be087',
              border: '1px solid rgba(80,170,90,.3)', borderRadius: 999, fontSize: 16, fontWeight: 600,
            }}>
              <Dot tone="success" size={10}/> Asistencia registrada · 14:02
            </div>

            <div style={{
              marginTop: 40, padding: '16px 22px', background: 'rgba(255,255,255,.05)',
              border: '1px dashed rgba(255,255,255,.15)', borderRadius: T.r3,
              display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, opacity: .8, width: 'fit-content', marginLeft: 'auto', marginRight: 'auto',
            }}>
              <div style={{ display: 'flex', color: '#fff' }}>{React.cloneElement(I.Scan, { size: 22 })}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>Escanee el siguiente código de barras…</div>
                <div style={{ marginTop: 2, fontSize: 12, opacity: .8 }}>El lector HID funciona como teclado. No se requiere acción adicional.</div>
              </div>
              <Kbd>↵</Kbd>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '14px 26px', borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 22,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 11, opacity: .6, letterSpacing: '0.05em' }}>HOY · LUNES 19 MAY</div>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>14:02</div>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,.12)' }}/>
          <KioskoStat n="772" l="Presentes"/>
          <KioskoStat n="38"  l="Tardanzas"/>
          <KioskoStat n="37"  l="Pendientes"/>
          <KioskoStat n="91%" l="Asistencia" highlight/>
          <div style={{ flex: 1 }}/>
          <Btn variant="secondary" icon={I.Edit} size="sm" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>Registro manual</Btn>
          <Btn variant="secondary" icon={I.Logout} size="sm" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>Salir</Btn>
        </div>
      </div>

      {/* Feed sidebar */}
      <aside style={{
        background: 'rgba(255,255,255,.04)', borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontFamily: T.serif, fontSize: 17, fontWeight: 600 }}>En vivo</h3>
            <Pill tone="success" style={{ background: 'rgba(80,170,90,.15)', color: '#7be087', border: '1px solid rgba(80,170,90,.25)' }}>
              <Dot tone="success" size={6}/>actualizando
            </Pill>
          </div>
          <div style={{ fontSize: 12, opacity: .6 }}>Últimos ingresos · {recent.length} en los últimos 12 min</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {recent.map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'center', padding: '12px 18px',
              background: i === 0 ? 'rgba(125,165,255,.08)' : 'transparent',
              borderLeft: i === 0 ? '3px solid #8aa8ff' : '3px solid transparent',
            }}>
              <div style={{ fontFamily: T.mono, fontSize: 12, opacity: .7, width: 38 }}>{r.t}</div>
              <Avatar name={r.n} size={34}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.n}</div>
                <div style={{ fontSize: 11, opacity: .65, fontFamily: T.mono }}>{r.cod} · {r.sec}</div>
              </div>
              <div style={{ color: '#7be087' }}>{React.cloneElement(I.Check, { size: 16 })}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,.15)' }}>
          <div style={{ fontSize: 11, opacity: .55, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Atajos de teclado</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', fontSize: 12 }}>
            <Kbd>F2</Kbd><span style={{ opacity: .85 }}>Registro manual por DNI</span>
            <Kbd>F4</Kbd><span style={{ opacity: .85 }}>Ver último escaneo</span>
            <Kbd>Esc</Kbd><span style={{ opacity: .85 }}>Limpiar pantalla</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function KioskoStat({ n, l, highlight }) {
  return (
    <div>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: highlight ? '#a3c7ff' : '#fff', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 10.5, opacity: .65, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
    </div>
  );
}

// ─── Variant: error scan ──────────────────────────────────────
function VigilanteError() {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.text, color: '#fff', fontFamily: T.sans, borderRadius: T.r3, overflow: 'hidden',
      flexDirection: 'column', padding: 40, gap: 24, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', padding: '0 26px', background: 'rgba(255,255,255,.04)' }}>
        <Wordmark light/>
      </div>
      <div style={{
        width: 180, height: 180, borderRadius: 999, background: 'rgba(220,80,80,.12)',
        border: '4px solid rgba(220,80,80,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ff8a8a',
      }}>
        {React.cloneElement(I.X, { size: 90, stroke: 2 })}
      </div>
      <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 600, fontSize: 42, letterSpacing: '-0.02em' }}>Código no reconocido</h1>
      <div style={{ fontSize: 15, opacity: .75, textAlign: 'center', maxWidth: 480, lineHeight: 1.5 }}>
        El código escaneado <span style={{ fontFamily: T.mono, background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 4 }}>900871</span> no corresponde a ningún alumno o docente activo.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" size="md" icon={I.Edit} style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>Registrar manualmente</Btn>
        <Btn size="md" icon={I.Scan}>Volver a escanear</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { VigilanteKiosko, VigilanteError });
