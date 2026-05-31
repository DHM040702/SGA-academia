"""
Genera seed.sql con el dataset completo:
  1. Limpieza de datos anteriores
  2. Ciclo 2026-I (13/04/2026 – 17/07/2026)
  3. Aulas (22 secciones del Excel de alumnos)
  4. Cursos (18 materias del Excel de docentes)
  5. Usuarios + Alumnos (969 únicos del Excel de alumnos)
  6. Usuarios + Docentes (76 únicos del Excel de docentes)

Ejecutar:
  python gen_seed.py
  docker cp seed.sql sga-academia-postgres-1:/tmp/seed.sql
  docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -f /tmp/seed.sql
"""
import pandas as pd
import uuid
import re
import unicodedata

# ── Contraseña por defecto (bcrypt de "Matricula2026") ──────────────────────
DEFAULT_HASH = "$2b$10$Kt1WXnRsFi4Ux.r1r8SQD.Ps1ksMrVyIVlHWg9o3Z/3N8hWuZV/3G"

ALUMNOS_XLS  = r"C:\Users\Diego\Desktop\CPU\Documentos\Estudiantes completos.xlsx"
DOCENTES_XLS = r"C:\Users\Diego\Desktop\CPU\Documentos\DOCENTES .xlsx"

def q(s):
    return "'" + str(s).replace("'", "''") + "'"


# ════════════════════════════════════════════════════════════════════════════
# ALUMNOS
# ════════════════════════════════════════════════════════════════════════════
df_a = pd.read_excel(ALUMNOS_XLS, header=0, dtype=str)
df_a.columns = ['codigo','dni','ap_paterno','ap_materno','nombres','area','turno','aula','obs']
df_a = df_a.dropna(subset=['codigo','dni'])
df_a['codigo'] = df_a['codigo'].str.strip().str.zfill(6)
df_a['dni']    = df_a['dni'].str.strip().str.zfill(8)

def normalize_aula(s):
    s = str(s).strip().upper()
    m = re.match(r'^([A-Z])(\d{3})$', s)
    return f"{m.group(1)}-{m.group(2)}" if m else s

def aula_area(nombre):
    return {'C':'ciencias','L':'letras','M':'medicas'}.get(nombre[0],'ciencias')

def normalize_turno(s):
    return 'tarde' if 'TARDE' in str(s).upper() else 'manana'

def title_name(s):
    return ' '.join(w.capitalize() for w in str(s).strip().split())

seen_c, seen_d = set(), set()
alumnos = []
for _, r in df_a.iterrows():
    c = str(r['codigo']); d = str(r['dni'])
    if not c.isdigit() or len(c)!=6 or not d.isdigit() or len(d)!=8: continue
    if c in seen_c or d in seen_d: continue
    seen_c.add(c); seen_d.add(d)
    aula   = normalize_aula(r['aula'])
    turno  = normalize_turno(r['turno'])
    nombre = title_name(r['nombres'])
    apell  = (title_name(r['ap_paterno']) + ' ' + title_name(r['ap_materno'])).strip()
    alumnos.append(dict(codigo=c, dni=d, nombre=nombre, apellidos=apell,
                        aula=aula, turno=turno))

aula_keys = {}
for r in alumnos:
    k = (r['aula'], r['turno'])
    if k not in aula_keys:
        aula_keys[k] = str(uuid.uuid4())


# ════════════════════════════════════════════════════════════════════════════
# DOCENTES
# ════════════════════════════════════════════════════════════════════════════
df_d = pd.read_excel(DOCENTES_XLS, sheet_name='Docentes', header=0, dtype=str)
df_d.columns = ['dni','curso','docente','celular','aula']
df_d = df_d.dropna(subset=['dni','docente'])
df_d['dni']     = df_d['dni'].str.strip()
df_d['docente'] = df_d['docente'].str.strip()
df_d = df_d[df_d['dni'].str.match(r'^\d{8}$')]
df_d_uniq = df_d.drop_duplicates(subset='dni', keep='first').reset_index(drop=True)

def parse_docente_name(full):
    full = re.sub(r'[,]', ' ', full)
    full = re.sub(r'\s+', ' ', full).strip()
    w = full.split()
    if not w:       return ('', '')
    if len(w) == 1: return (w[0].title(), '')
    if len(w) == 2: return (w[1].title(), w[0].title())
    if len(w) == 3: return (w[2].title(), f'{w[0]} {w[1]}'.title())
    return (f'{w[-2]} {w[-1]}'.title(), ' '.join(w[:-2]).title())

docentes = []
for _, r in df_d_uniq.iterrows():
    nombre, apell = parse_docente_name(r['docente'])
    curso   = str(r['curso']).strip() if pd.notna(r['curso'])   else ''
    celular = str(r['celular']).strip() if pd.notna(r['celular']) else ''
    docentes.append(dict(dni=r['dni'], nombre=nombre, apellidos=apell,
                         especialidad=curso, celular=celular))


# ════════════════════════════════════════════════════════════════════════════
# CURSOS (deduplican por nombre normalizado)
# ════════════════════════════════════════════════════════════════════════════
def normalize_key(s):
    s = str(s).strip()
    s = re.sub(r'\s*[-–]\s*$', '', s)
    s = re.sub(r'\s*[-–]\s*BIOLOG[IÍ]A\s*$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s+', ' ', s).strip().upper()
    nfkd = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))

MANUAL_CODES = {
    'ALGEBRA':'ALG','ARITMETICA':'ARI','ANATOMIA':'ANA','BIOLOGIA':'BIO',
    'COMUNICACION':'COM','CIVICA':'CIV','ECONOMIA':'ECO','EDUCACION CIVICA':'EDC',
    'ESTADISTICA':'EST','FISICA':'FIS','GEOGRAFIA':'GEO','GEOMETRIA':'GEM',
    'HISTORIA':'HIS','PSICOLOGIA':'PSI','QUIMICA':'QUI',
    'RAZONAMIENTO MATEMATICO':'RMA','RAZONAMIENTO VERBAL':'RVE',
    'TRIGONOMETRIA':'TRI',
}

seen_keys, used_codes = {}, set()
for raw in df_d['curso'].dropna().unique():
    k = normalize_key(raw)
    if k and k not in seen_keys:
        clean = re.sub(r'\s*[-–]\s*$', '', str(raw).strip())
        clean = re.sub(r'\s*[-–]\s*BIOLOG[IÍ]A\s*$', '', clean, flags=re.IGNORECASE).strip()
        seen_keys[k] = clean

cursos = []
for key, nombre in sorted(seen_keys.items(), key=lambda x: x[1]):
    code = MANUAL_CODES.get(key)
    if not code:
        words = nombre.split()
        code = ''.join(w[0] for w in words)[:3].upper()
    base, n = code, 2
    while code in used_codes:
        code = base[:2] + str(n); n += 1
    used_codes.add(code)
    cursos.append({'id': str(uuid.uuid4()), 'nombre': nombre, 'codigo': code})


# ════════════════════════════════════════════════════════════════════════════
# GENERAR SQL
# ════════════════════════════════════════════════════════════════════════════
ciclo_id = str(uuid.uuid4())
lines = [
    "BEGIN;",
    "",
    "-- -------------------------------------------------------",
    "-- LIMPIEZA",
    "-- -------------------------------------------------------",
    "DELETE FROM asistencias;",
    "DELETE FROM alumnos_apoderados;",
    "DELETE FROM horarios;",
    "DELETE FROM alumnos;",
    "DELETE FROM apoderados;",
    "DELETE FROM docentes;",
    "DELETE FROM recursos_biblioteca;",
    "DELETE FROM comunicados_envios;",
    "DELETE FROM comunicados;",
    "DELETE FROM cursos;",
    "DELETE FROM aulas;",
    "DELETE FROM ciclos;",
    "DELETE FROM usuarios WHERE rol IN ('alumno','docente','apoderado');",
    "",
    "-- -------------------------------------------------------",
    "-- CICLO 2026-I",
    "-- -------------------------------------------------------",
    f"INSERT INTO ciclos (id, nombre, fecha_inicio, fecha_fin, activo) VALUES "
    f"({q(ciclo_id)}, '2026-I', '2026-04-13', '2026-07-17', true);",
    "",
    "-- -------------------------------------------------------",
    f"-- AULAS ({len(aula_keys)} secciones)",
    "-- -------------------------------------------------------",
]

for (nombre, turno), aid in sorted(aula_keys.items()):
    area = aula_area(nombre)
    lines.append(
        f"INSERT INTO aulas (id, ciclo_id, nombre, turno, area, cupo_maximo) VALUES "
        f"({q(aid)}, {q(ciclo_id)}, {q(nombre)}, {q(turno)}, {q(area)}, 50);"
    )

lines += [
    "",
    "-- -------------------------------------------------------",
    f"-- CURSOS ({len(cursos)} materias)",
    "-- -------------------------------------------------------",
]
for c in cursos:
    lines.append(
        f"INSERT INTO cursos (id, nombre, codigo, activo) VALUES "
        f"({q(c['id'])}, {q(c['nombre'])}, {q(c['codigo'])}, true);"
    )

lines += [
    "",
    "-- -------------------------------------------------------",
    f"-- ALUMNOS ({len(alumnos)} unicos)",
    "-- -------------------------------------------------------",
]
for r in alumnos:
    uid  = str(uuid.uuid4())
    alid = str(uuid.uuid4())
    aid  = aula_keys[(r['aula'], r['turno'])]
    email = f"{r['codigo']}@academia.edu"
    lines.append(
        f"INSERT INTO usuarios (id, email, password_hash, rol, nombre, apellidos, dni, activo) VALUES "
        f"({q(uid)}, {q(email)}, {q(DEFAULT_HASH)}, 'alumno', "
        f"{q(r['nombre'])}, {q(r['apellidos'])}, {q(r['dni'])}, true);"
    )
    lines.append(
        f"INSERT INTO alumnos (id, usuario_id, dni, nombre, apellidos, codigo_barras, aula_id) VALUES "
        f"({q(alid)}, {q(uid)}, {q(r['dni'])}, {q(r['nombre'])}, {q(r['apellidos'])}, "
        f"{q(r['codigo'])}, {q(aid)});"
    )

lines += [
    "",
    "-- -------------------------------------------------------",
    f"-- DOCENTES ({len(docentes)} unicos)",
    "-- -------------------------------------------------------",
]
for r in docentes:
    uid = str(uuid.uuid4())
    did = str(uuid.uuid4())
    email = f"{r['dni']}@docente.academia.edu"
    lines.append(
        f"INSERT INTO usuarios (id, email, password_hash, rol, nombre, apellidos, dni, activo) VALUES "
        f"({q(uid)}, {q(email)}, {q(DEFAULT_HASH)}, 'docente', "
        f"{q(r['nombre'])}, {q(r['apellidos'])}, {q(r['dni'])}, true);"
    )
    lines.append(
        f"INSERT INTO docentes (id, usuario_id, dni, nombre, apellidos, especialidad, telefono_whatsapp) VALUES "
        f"({q(did)}, {q(uid)}, {q(r['dni'])}, {q(r['nombre'])}, {q(r['apellidos'])}, "
        f"{'NULL' if not r['especialidad'] else q(r['especialidad'][:100])}, "
        f"{'NULL' if not r['celular'] else q(r['celular'][:20])});"
    )

lines += [
    "",
    "COMMIT;",
    "",
    f"-- Resumen: ciclo 1 | aulas {len(aula_keys)} | cursos {len(cursos)} "
    f"| alumnos {len(alumnos)} | docentes {len(docentes)}",
]

sql = "\n".join(lines)
with open("seed.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print(f"seed.sql generado:")
print(f"  Ciclo  : 1  (2026-I, 13/04 – 17/07)")
print(f"  Aulas  : {len(aula_keys)}")
print(f"  Cursos : {len(cursos)}")
print(f"  Alumnos: {len(alumnos)}")
print(f"  Docentes: {len(docentes)}")
print()
print("Aplicar con:")
print("  docker cp seed.sql sga-academia-postgres-1:/tmp/seed.sql")
print("  docker exec sga-academia-postgres-1 psql -U sga_user -d sga_db -f /tmp/seed.sql")
