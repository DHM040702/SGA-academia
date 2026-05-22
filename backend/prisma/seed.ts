/**
 * prisma/seed.ts
 * Datos de ejemplo correlacionados para CEPREUNASAM SGA
 * Ejecutar: npx prisma db seed
 */

import { PrismaClient, Rol, Turno, Area, TipoPersona, TipoRecurso, TipoDestinatario } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0')
}

/** Últimos N días escolares (lun–sáb) contando hacia atrás desde refDate. */
function lastSchoolDays(refDate: Date, count: number): string[] {
  const days: string[] = []
  const d = new Date(refDate)
  while (days.length < count) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0) { // 0 = Domingo
      days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    }
  }
  return days.reverse()
}

/** Valor determinista 0-99 basado en dos índices. */
function det(a: number, b: number) {
  return (a * 7 + b * 13) % 100
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Iniciando seed…')

  // ── 0. Limpiar datos previos (orden FK inverso) ───────────────────────────
  await prisma.comunicadoEnvio.deleteMany()
  await prisma.comunicado.deleteMany()
  await prisma.recursoBiblioteca.deleteMany()
  await prisma.asistencia.deleteMany()
  await prisma.horario.deleteMany()
  await prisma.alumnoApoderado.deleteMany()
  await prisma.alumno.deleteMany()
  await prisma.apoderado.deleteMany()
  await prisma.docente.deleteMany()
  await prisma.carrera.deleteMany()
  await prisma.aula.deleteMany()
  await prisma.ciclo.deleteMany()
  await prisma.curso.deleteMany()
  await prisma.usuario.deleteMany()
  console.log('   ✓ Tablas limpiadas')

  // ── 1. Hashes ────────────────────────────────────────────────────────────
  const ROUNDS = 10
  const [hashAdmin, hashDocente, hashAlumno, hashApoderado] = await Promise.all([
    bcrypt.hash('admin123',     ROUNDS),
    bcrypt.hash('docente123',   ROUNDS),
    bcrypt.hash('alumno123',    ROUNDS),
    bcrypt.hash('apoderado123', ROUNDS),
  ])
  console.log('   ✓ Contraseñas hasheadas')

  // ── 2. Usuarios staff ────────────────────────────────────────────────────
  const [admin, director, vigilante] = await Promise.all([
    prisma.usuario.create({ data: { email: 'admin@cepreunasam.edu.pe',     passwordHash: hashAdmin, rol: Rol.admin     } }),
    prisma.usuario.create({ data: { email: 'director@cepreunasam.edu.pe',  passwordHash: hashAdmin, rol: Rol.director  } }),
    prisma.usuario.create({ data: { email: 'vigilante@cepreunasam.edu.pe', passwordHash: hashAdmin, rol: Rol.vigilante } }),
  ])
  console.log('   ✓ Staff: admin, director, vigilante')
  void admin

  // ── 3. Ciclo ─────────────────────────────────────────────────────────────
  const ciclo = await prisma.ciclo.create({
    data: { nombre: '2026-I', fechaInicio: new Date('2026-03-02'), fechaFin: new Date('2026-07-31'), activo: true },
  })
  console.log(`   ✓ Ciclo: ${ciclo.nombre}`)

  // ── 4. Aulas ──────────────────────────────────────────────────────────────
  // Nomenclatura: [Área]-[Número]  →  C=Ciencias, L=Letras, M=Médicas
  const [aulaAM, aulaAT, aulaBM, aulaBT, aulaCM, aulaCT] = await Promise.all([
    prisma.aula.create({ data: { cicloId: ciclo.id, nombre: 'C-001', turno: Turno.manana, area: Area.ciencias, cupoMaximo: 40 } }),
    prisma.aula.create({ data: { cicloId: ciclo.id, nombre: 'C-002', turno: Turno.tarde,  area: Area.ciencias, cupoMaximo: 40 } }),
    prisma.aula.create({ data: { cicloId: ciclo.id, nombre: 'L-001', turno: Turno.manana, area: Area.letras,   cupoMaximo: 40 } }),
    prisma.aula.create({ data: { cicloId: ciclo.id, nombre: 'L-002', turno: Turno.tarde,  area: Area.letras,   cupoMaximo: 40 } }),
    prisma.aula.create({ data: { cicloId: ciclo.id, nombre: 'M-001', turno: Turno.manana, area: Area.medicas,  cupoMaximo: 35 } }),
    prisma.aula.create({ data: { cicloId: ciclo.id, nombre: 'M-002', turno: Turno.tarde,  area: Area.medicas,  cupoMaximo: 35 } }),
  ])
  console.log('   ✓ Aulas: C-001/C-002 (Ciencias) | L-001/L-002 (Letras) | M-001/M-002 (Médicas)')

  // ── 5. Carreras ───────────────────────────────────────────────────────────
  const [carCivil, carSistemas, carAgro, carDerecho, carEconomia, carPoliticas, carEnfermeria, carObstetricia, carFarmacia] = await Promise.all([
    prisma.carrera.create({ data: { nombre: 'Ing. Civil',            area: Area.ciencias } }),
    prisma.carrera.create({ data: { nombre: 'Ing. de Sistemas',      area: Area.ciencias } }),
    prisma.carrera.create({ data: { nombre: 'Ing. Agronómica',       area: Area.ciencias } }),
    prisma.carrera.create({ data: { nombre: 'Derecho',               area: Area.letras   } }),
    prisma.carrera.create({ data: { nombre: 'Economía',              area: Area.letras   } }),
    prisma.carrera.create({ data: { nombre: 'Ciencias Políticas',    area: Area.letras   } }),
    prisma.carrera.create({ data: { nombre: 'Enfermería',            area: Area.medicas  } }),
    prisma.carrera.create({ data: { nombre: 'Obstetricia',           area: Area.medicas  } }),
    prisma.carrera.create({ data: { nombre: 'Farmacia',              area: Area.medicas  } }),
  ])
  console.log('   ✓ Carreras (9): 3 × área')

  const carrerasPorArea = {
    [Area.ciencias]: [carCivil, carSistemas, carAgro],
    [Area.letras]:   [carDerecho, carEconomia, carPoliticas],
    [Area.medicas]:  [carEnfermeria, carObstetricia, carFarmacia],
  }

  // ── 6. Cursos ─────────────────────────────────────────────────────────────
  const [cMat, cFis, cQui, cBio, cLen, cLit] = await Promise.all([
    prisma.curso.create({ data: { nombre: 'Matemática', codigo: 'MAT001' } }),
    prisma.curso.create({ data: { nombre: 'Física',     codigo: 'FIS001' } }),
    prisma.curso.create({ data: { nombre: 'Química',    codigo: 'QUI001' } }),
    prisma.curso.create({ data: { nombre: 'Biología',   codigo: 'BIO001' } }),
    prisma.curso.create({ data: { nombre: 'Lenguaje',   codigo: 'LEN001' } }),
    prisma.curso.create({ data: { nombre: 'Literatura', codigo: 'LIT001' } }),
  ])
  console.log('   ✓ Cursos (6)')

  // ── 7. Docentes ───────────────────────────────────────────────────────────
  const docentesDef = [
    { nombre: 'Juan',   apellidos: 'García Pérez',   dni: '12345678', email: 'juan.garcia@cepreunasam.edu.pe',    especialidad: 'Matemática', tel: '+51987001001', cursoId: cMat.id },
    { nombre: 'María',  apellidos: 'López Torres',   dni: '23456789', email: 'maria.lopez@cepreunasam.edu.pe',    especialidad: 'Física',     tel: '+51987001002', cursoId: cFis.id },
    { nombre: 'Carlos', apellidos: 'Ramírez Silva',  dni: '34567890', email: 'carlos.ramirez@cepreunasam.edu.pe', especialidad: 'Química',    tel: '+51987001003', cursoId: cQui.id },
    { nombre: 'Ana',    apellidos: 'Flores Mendoza', dni: '45678901', email: 'ana.flores@cepreunasam.edu.pe',     especialidad: 'Biología',   tel: '+51987001004', cursoId: cBio.id },
    { nombre: 'Luis',   apellidos: 'Vargas Huanca',  dni: '56789012', email: 'luis.vargas@cepreunasam.edu.pe',    especialidad: 'Lenguaje',   tel: '+51987001005', cursoId: cLen.id },
    { nombre: 'Rosa',   apellidos: 'Quispe Mamani',  dni: '67890123', email: 'rosa.quispe@cepreunasam.edu.pe',    especialidad: 'Literatura', tel: '+51987001006', cursoId: cLit.id },
  ]

  const docentes = await Promise.all(
    docentesDef.map((d) =>
      prisma.docente.create({
        data: {
          dni: d.dni, nombre: d.nombre, apellidos: d.apellidos,
          especialidad: d.especialidad, telefonoWhatsapp: d.tel,
          usuario: { create: { email: d.email, passwordHash: hashDocente, rol: Rol.docente } },
        },
      }),
    ),
  )
  console.log('   ✓ Docentes (6)')

  // ── 8. Alumnos ───────────────────────────────────────────────────────────
  // 30 alumnos, 5 por aula
  const alumnosDef = [
    // ── C-001: Ciencias mañana ──────────────────────────────────
    { nombre: 'Ana Sofía',       apellidos: 'Torres García',    dni: '70100001', cod: '100001', aula: aulaAM },
    { nombre: 'Diego Alejandro', apellidos: 'Ramírez Cruz',     dni: '70100002', cod: '100002', aula: aulaAM },
    { nombre: 'Camila Beatriz',  apellidos: 'Mendoza Espinoza', dni: '70100003', cod: '100003', aula: aulaAM },
    { nombre: 'Sebastián Omar',  apellidos: 'Huanca Soto',      dni: '70100004', cod: '100004', aula: aulaAM },
    { nombre: 'Valeria Paola',   apellidos: 'Ruiz Chávez',      dni: '70100005', cod: '100005', aula: aulaAM },
    // ── C-002: Ciencias tarde ─────────────────────────────────────
    { nombre: 'Andrés Felipe',   apellidos: 'López Flores',     dni: '70100006', cod: '100006', aula: aulaAT },
    { nombre: 'Luciana Isabel',  apellidos: 'Mamani Paredes',   dni: '70100007', cod: '100007', aula: aulaAT },
    { nombre: 'Rodrigo Manuel',  apellidos: 'Quispe Vargas',    dni: '70100008', cod: '100008', aula: aulaAT },
    { nombre: 'Isabella',        apellidos: 'Salazar Medina',   dni: '70100009', cod: '100009', aula: aulaAT },
    { nombre: 'Mateo José',      apellidos: 'Pizarro Castillo', dni: '70100010', cod: '100010', aula: aulaAT },
    // ── L-001: Letras mañana ──────────────────────────────────────
    { nombre: 'Valentina',       apellidos: 'Cruz Herrera',     dni: '70100011', cod: '100011', aula: aulaBM },
    { nombre: 'Javier Eduardo',  apellidos: 'Morales Díaz',     dni: '70100012', cod: '100012', aula: aulaBM },
    { nombre: 'Daniela',         apellidos: 'Vega Romero',      dni: '70100013', cod: '100013', aula: aulaBM },
    { nombre: 'Óscar Renato',    apellidos: 'Cano Peña',        dni: '70100014', cod: '100014', aula: aulaBM },
    { nombre: 'Fabiola',         apellidos: 'Espinoza Ríos',    dni: '70100015', cod: '100015', aula: aulaBM },
    // ── L-002: Letras tarde ───────────────────────────────────────
    { nombre: 'Gonzalo',         apellidos: 'Reyes Aguirre',    dni: '70100016', cod: '100016', aula: aulaBT },
    { nombre: 'Milagros',        apellidos: 'Sánchez Lara',     dni: '70100017', cod: '100017', aula: aulaBT },
    { nombre: 'Emilio',          apellidos: 'Peña Ortega',      dni: '70100018', cod: '100018', aula: aulaBT },
    { nombre: 'Claudia Renata',  apellidos: 'Aguilar Nieto',    dni: '70100019', cod: '100019', aula: aulaBT },
    { nombre: 'Erick Iván',      apellidos: 'Fuentes Palma',    dni: '70100020', cod: '100020', aula: aulaBT },
    // ── M-001: Médicas mañana ─────────────────────────────────────
    { nombre: 'Paula Jimena',    apellidos: 'Torres Díaz',      dni: '70100021', cod: '100021', aula: aulaCM },
    { nombre: 'Kevin André',     apellidos: 'Navarro Castro',   dni: '70100022', cod: '100022', aula: aulaCM },
    { nombre: 'Natalia',         apellidos: 'Campos Vera',      dni: '70100023', cod: '100023', aula: aulaCM },
    { nombre: 'Renzo',           apellidos: 'Villanueva Meza',  dni: '70100024', cod: '100024', aula: aulaCM },
    { nombre: 'Fiorella',        apellidos: 'Contreras Quispe', dni: '70100025', cod: '100025', aula: aulaCM },
    // ── M-002: Médicas tarde ──────────────────────────────────────
    { nombre: 'Bryan Stiven',    apellidos: 'Tapia Luna',       dni: '70100026', cod: '100026', aula: aulaCT },
    { nombre: 'Xiomara',         apellidos: 'Montoya Pacheco',  dni: '70100027', cod: '100027', aula: aulaCT },
    { nombre: 'Jesús Alberto',   apellidos: 'Portillo Benites', dni: '70100028', cod: '100028', aula: aulaCT },
    { nombre: 'Cinthya',         apellidos: 'Atahuaman Rojas',  dni: '70100029', cod: '100029', aula: aulaCT },
    { nombre: 'Víctor Hugo',     apellidos: 'Llanos Guerrero',  dni: '70100030', cod: '100030', aula: aulaCT },
  ]

  const alumnos = await Promise.all(
    alumnosDef.map((a, i) => {
      const areaAula = a.aula.area
      const carrerasArea = carrerasPorArea[areaAula]
      const carrera = carrerasArea[i % 3]
      return prisma.alumno.create({
        data: {
          dni: a.dni, nombre: a.nombre, apellidos: a.apellidos,
          codigoBarras: a.cod,
          aula:    { connect: { id: a.aula.id } },
          carrera: { connect: { id: carrera.id } },
          fechaNacimiento: new Date(`200${5 + (i % 4)}-${pad((i % 9) + 1)}-${pad((i % 20) + 1)}`),
          usuario: {
            create: {
              email: `alumno${pad(i + 1, 3)}@cepreunasam.edu.pe`,
              passwordHash: hashAlumno,
              rol: Rol.alumno,
            },
          },
        },
      })
    }),
  )
  console.log('   ✓ Alumnos (30): 5 por aula, con carrera asignada')

  // ── 9. Apoderados ────────────────────────────────────────────────────────
  type ApoderadoDef = { nombre: string; apellidos: string; dni: string; tel: string; email: string; hijoIdxs: number[] }
  const apoderadosDef: ApoderadoDef[] = [
    { nombre: 'Roberto', apellidos: 'Torres Vega',  dni: '40100001', tel: '+51999100001', email: 'roberto.torres@gmail.com', hijoIdxs: [0, 1, 2] },
    { nombre: 'Carmen',  apellidos: 'García López', dni: '40100002', tel: '+51999100002', email: 'carmen.garcia@gmail.com',  hijoIdxs: [3, 4, 5, 6] },
    { nombre: 'Mario',   apellidos: 'Quispe Mamani',dni: '40100003', tel: '+51999100003', email: 'mario.quispe@gmail.com',   hijoIdxs: [7, 8, 9, 10, 11] },
  ]

  const apoderados = await Promise.all(
    apoderadosDef.map((ap) =>
      prisma.apoderado.create({
        data: {
          dni: ap.dni, nombre: ap.nombre, apellidos: ap.apellidos, telefonoWhatsapp: ap.tel,
          usuario: { create: { email: ap.email, passwordHash: hashApoderado, rol: Rol.apoderado } },
        },
      }),
    ),
  )

  await prisma.alumnoApoderado.createMany({
    data: apoderadosDef.flatMap((ap, apIdx) =>
      ap.hijoIdxs.map((alumnoIdx, pos) => ({
        alumnoId:    alumnos[alumnoIdx].id,
        apoderadoId: apoderados[apIdx].id,
        parentesco:  apIdx % 2 === 0 ? 'padre' : 'madre',
        esPrincipal: pos === 0,
      })),
    ),
  })
  console.log('   ✓ Apoderados (3) vinculados a alumnos')

  // ── 10. Horarios ─────────────────────────────────────────────────────────
  // Rotamos los cursos por aula (offset) para que en la misma franja horaria
  // las 3 aulas de mañana y las 3 de tarde tengan docentes distintos.
  // Ej. Lunes 07:00 → C-001=MAT(Juan), L-001=QUI(Carlos), M-001=LEN(Luis) ✓

  const cursoToDocente = new Map(docentesDef.map((d, i) => [d.cursoId, docentes[i].id]))
  const allCourses = [cMat, cFis, cQui, cBio, cLen, cLit]

  type SlotDef = { dia: number; hi: number; hf: number }
  const slotPattern: SlotDef[] = [
    { dia: 1, hi: 0, hf: 2 }, { dia: 1, hi: 2, hf: 4 },
    { dia: 2, hi: 0, hf: 2 }, { dia: 2, hi: 2, hf: 4 },
    { dia: 3, hi: 0, hf: 2 }, { dia: 3, hi: 2, hf: 4 },
    { dia: 4, hi: 0, hf: 2 }, { dia: 4, hi: 2, hf: 4 },
    { dia: 5, hi: 0, hf: 2 }, { dia: 5, hi: 2, hf: 4 },
    { dia: 6, hi: 0, hf: 2 }, { dia: 6, hi: 2, hf: 4 },
  ]

  type AulaConfig = { aula: { id: string }; baseH: number; offset: number }
  const aulaConfigs: AulaConfig[] = [
    { aula: aulaAM, baseH: 7,  offset: 0 },
    { aula: aulaAT, baseH: 13, offset: 1 },
    { aula: aulaBM, baseH: 7,  offset: 2 },
    { aula: aulaBT, baseH: 13, offset: 3 },
    { aula: aulaCM, baseH: 7,  offset: 4 },
    { aula: aulaCT, baseH: 13, offset: 5 },
  ]

  const horariosData = aulaConfigs.flatMap(({ aula, baseH, offset }) =>
    slotPattern.map((s, slotIdx) => {
      const course = allCourses[(slotIdx + offset) % 6]
      return {
        aulaId:     aula.id,
        cursoId:    course.id,
        docenteId:  cursoToDocente.get(course.id)!,
        diaSemana:  s.dia,
        horaInicio: new Date(`1970-01-01T${pad(baseH + s.hi)}:00:00.000Z`),
        horaFin:    new Date(`1970-01-01T${pad(baseH + s.hf)}:00:00.000Z`),
        publicado:  true,
      }
    }),
  )

  await prisma.horario.createMany({ data: horariosData })
  console.log(`   ✓ Horarios (${horariosData.length}: 12 × 6 aulas, sin conflictos)`)

  // ── 11. Asistencias ──────────────────────────────────────────────────────
  const today = new Date('2026-05-20')
  const schoolDays = lastSchoolDays(today, 25)

  // ─ Alumnos
  const alumnoAsist: Array<{
    tipoPersona: TipoPersona; alumnoId: string; fecha: Date
    horaIngreso: Date; esTardanza: boolean; esManual: boolean; registradoPorId: string
  }> = []

  for (let ai = 0; ai < alumnos.length; ai++) {
    const aulaIdx = Math.floor(ai / 5)            // 0=C001 07h, 1=C002 13h, 2=L001 07h, 3=L002 13h, 4=M001 07h, 5=M002 13h
    const baseH   = [7, 13, 7, 13, 7, 13][aulaIdx]
    for (let di = 0; di < schoolDays.length; di++) {
      const v = det(ai, di)
      if (v < 5) continue                         // 5 % ausencia
      const tardanza = v < 17                     // 12 % tardanza
      const min = tardanza ? 16 + (v % 15) : (v % 10)
      alumnoAsist.push({
        tipoPersona: TipoPersona.alumno,
        alumnoId:    alumnos[ai].id,
        fecha:       new Date(schoolDays[di]),
        horaIngreso: new Date(`${schoolDays[di]}T${pad(baseH)}:${pad(min)}:00.000Z`),
        esTardanza:  tardanza,
        esManual:    false,
        registradoPorId: vigilante.id,
      })
    }
  }
  await prisma.asistencia.createMany({ data: alumnoAsist })

  // ─ Docentes
  const docenteAsist: Array<{
    tipoPersona: TipoPersona; docenteId: string; fecha: Date
    horaIngreso: Date; esTardanza: boolean; esManual: boolean; registradoPorId: string
  }> = []

  for (let di = 0; di < docentes.length; di++) {
    for (let dayIdx = 0; dayIdx < schoolDays.length; dayIdx++) {
      const v = det(di + 30, dayIdx)
      if (v < 3) continue                         // 3 % ausencia
      const tardanza = v < 8
      const min = tardanza ? 18 + (v % 10) : (v % 8)
      docenteAsist.push({
        tipoPersona: TipoPersona.docente,
        docenteId:   docentes[di].id,
        fecha:       new Date(schoolDays[dayIdx]),
        horaIngreso: new Date(`${schoolDays[dayIdx]}T07:${pad(min)}:00.000Z`),
        esTardanza:  tardanza,
        esManual:    false,
        registradoPorId: vigilante.id,
      })
    }
  }
  await prisma.asistencia.createMany({ data: docenteAsist })

  console.log(`   ✓ Asistencias: ${alumnoAsist.length} alumnos + ${docenteAsist.length} docentes`)

  // ── 12. Comunicados ──────────────────────────────────────────────────────
  const comunicadosDef = [
    {
      titulo: 'Bienvenida al Ciclo 2026-I',
      cuerpo: 'Estimados estudiantes y familiares:\n\nNos complace dar inicio al Ciclo 2026-I de CEPREUNASAM. Este ciclo académico comprende del 2 de marzo al 31 de julio de 2026.\n\nRecordamos que las clases son de lunes a sábado según el turno asignado. El ingreso se registra automáticamente mediante código de barras en la entrada principal.\n\n¡Mucho éxito a todos!\n\nDirección Académica',
      destinatarioTipo: TipoDestinatario.todos,
      canalWhatsapp: true,
      aulaId: null as string | null,
      daysAgo: 12,
    },
    {
      titulo: 'Evaluación parcial — Semana 6',
      cuerpo: 'Se comunica a todos los alumnos que la evaluación parcial del Ciclo 2026-I se realizará durante la semana del 11 al 16 de mayo.\n\nCronograma:\n• Matemática — Lunes 11/05\n• Física — Martes 12/05\n• Química — Miércoles 13/05\n• Biología — Jueves 14/05\n• Lenguaje — Viernes 15/05\n• Literatura — Sábado 16/05\n\nSe recomienda repasar los temas de las primeras cinco semanas.',
      destinatarioTipo: TipoDestinatario.alumnos,
      canalWhatsapp: false,
      aulaId: null,
      daysAgo: 9,
    },
    {
      titulo: 'Simulacro de admisión UNASAM 2026',
      cuerpo: 'El sábado 24 de mayo se realizará el simulacro de examen de admisión.\n\nHorario: 8:00 am – 12:00 pm\nLugar: Pabellón Central\n\nEs obligatoria la asistencia. Traer: lápiz HB, lapicero azul, borrador y código de barras de estudiante.\n\nResultados disponibles el lunes 27 en el portal del alumno.',
      destinatarioTipo: TipoDestinatario.seccion,
      canalWhatsapp: true,
      aulaId: aulaAM.id,
      daysAgo: 6,
    },
    {
      titulo: 'Reunión de apoderados — Mayo 2026',
      cuerpo: 'Se convoca a todos los apoderados a la reunión informativa del mes de mayo.\n\nFecha: Sábado 31 de mayo de 2026\nHora: 10:00 am\nLugar: Auditorio principal\n\nTemas:\n1. Avance académico del ciclo\n2. Informe de asistencia\n3. Preparación para evaluación final\n\nSe agradece su puntual asistencia.',
      destinatarioTipo: TipoDestinatario.apoderados,
      canalWhatsapp: true,
      aulaId: null,
      daysAgo: 4,
    },
    {
      titulo: 'Feriado académico — 29 de Mayo',
      cuerpo: 'Se comunica que el jueves 29 de mayo no habrá clases por feriado nacional.\n\nLas actividades académicas se reanudarán el viernes 30 de mayo con normalidad.\n\nAtentamente,\nDirección Académica — CEPREUNASAM',
      destinatarioTipo: TipoDestinatario.todos,
      canalWhatsapp: false,
      aulaId: null,
      daysAgo: 1,
    },
  ]

  await Promise.all(
    comunicadosDef.map((c) => {
      const pub = new Date(today)
      pub.setDate(pub.getDate() - c.daysAgo)
      return prisma.comunicado.create({
        data: {
          titulo: c.titulo,
          cuerpo: c.cuerpo,
          destinatarioTipo: c.destinatarioTipo,
          ...(c.aulaId ? { aula: { connect: { id: c.aulaId } } } : {}),
          canalSistema: true,
          canalWhatsapp: c.canalWhatsapp,
          publicadoPor: { connect: { id: director.id } },
          publicadoAt: pub,
        },
      })
    }),
  )
  console.log(`   ✓ Comunicados (${comunicadosDef.length})`)

  // ── 13. Biblioteca ───────────────────────────────────────────────────────
  const recursosDef = [
    { titulo: 'Álgebra: Polinomios y factorización',        tipo: TipoRecurso.pdf,    url: 'https://recursos.cepreunasam.edu.pe/mat/algebra-polinomios.pdf',       cursoId: cMat.id, nivel: 'Básico',     desc: 'Compendio de ejercicios de álgebra con factorización y operaciones con polinomios.' },
    { titulo: 'Aritmética: Números enteros y racionales',   tipo: TipoRecurso.pdf,    url: 'https://recursos.cepreunasam.edu.pe/mat/aritmetica-enteros.pdf',        cursoId: cMat.id, nivel: 'Básico',     desc: 'Guía de repaso de aritmética básica con ejercicios resueltos.' },
    { titulo: 'Física: Cinemática — video explicativo',     tipo: TipoRecurso.video,  url: 'https://www.youtube.com/watch?v=ejemplo_fisica_cinematica',             cursoId: cFis.id, nivel: 'Intermedio', desc: 'Video de 45 min sobre MRU y MRUA con ejemplos.' },
    { titulo: 'Física: Dinámica — Leyes de Newton',         tipo: TipoRecurso.video,  url: 'https://www.youtube.com/watch?v=ejemplo_fisica_newton',                 cursoId: cFis.id, nivel: 'Intermedio', desc: 'Serie de 3 videos sobre las tres leyes de Newton.' },
    { titulo: 'Tabla periódica interactiva',                tipo: TipoRecurso.enlace, url: 'https://ptable.com/',                                                   cursoId: cQui.id, nivel: 'Básico',     desc: 'Tabla periódica con propiedades y configuración electrónica.' },
    { titulo: 'Química Orgánica: Grupos funcionales',       tipo: TipoRecurso.pdf,    url: 'https://recursos.cepreunasam.edu.pe/qui/organica-grupos-funcionales.pdf',cursoId: cQui.id, nivel: 'Avanzado',   desc: 'Resumen de grupos funcionales, reacciones y ejercicios.' },
    { titulo: 'Biología celular — simulador interactivo',   tipo: TipoRecurso.iframe, url: 'https://learn.genetics.utah.edu/content/cells/insideacell/',             cursoId: cBio.id, nivel: 'Intermedio', desc: 'Simulador de célula eucariótica con organelas y funciones.' },
    { titulo: 'Lenguaje: Técnicas de comprensión lectora',  tipo: TipoRecurso.pdf,    url: 'https://recursos.cepreunasam.edu.pe/len/comprension-lectora.pdf',       cursoId: cLen.id, nivel: 'Intermedio', desc: 'Guía práctica con textos modelo para el examen de admisión.' },
    { titulo: 'Gramática: Morfología y sintaxis',           tipo: TipoRecurso.pdf,    url: 'https://recursos.cepreunasam.edu.pe/len/gramatica-morfosintaxis.pdf',   cursoId: cLen.id, nivel: 'Básico',     desc: 'Clases de palabras, análisis morfológico y oraciones.' },
    { titulo: 'Literatura peruana: generaciones y autores', tipo: TipoRecurso.pdf,    url: 'https://recursos.cepreunasam.edu.pe/lit/literatura-peruana.pdf',        cursoId: cLit.id, nivel: 'Básico',     desc: 'Movimientos literarios peruanos del siglo XX.' },
  ]

  await prisma.recursoBiblioteca.createMany({
    data: recursosDef.map((r, i) => ({
      titulo: r.titulo, descripcion: r.desc, tipo: r.tipo, url: r.url,
      cursoId: r.cursoId, nivel: r.nivel, activo: true,
      descargas: (i * 37 + 12) % 200,
      subidoPorId: director.id,
    })),
  })
  console.log(`   ✓ Biblioteca (${recursosDef.length} recursos)`)

  // ── Resumen ──────────────────────────────────────────────────────────────
  console.log('\n✅  Seed completado')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('ACCESOS:')
  console.log('  admin@cepreunasam.edu.pe        → admin123')
  console.log('  director@cepreunasam.edu.pe     → admin123')
  console.log('  vigilante@cepreunasam.edu.pe    → admin123')
  console.log('  juan.garcia@cepreunasam.edu.pe  → docente123')
  console.log('  alumno001@cepreunasam.edu.pe    → alumno123  (hasta alumno030)')
  console.log('  roberto.torres@gmail.com        → apoderado123')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Ciclo 2026-I · Mar–Jul 2026 · ACTIVO`)
  console.log(`  6 aulas: C-001/C-002 (Ciencias) | L-001/L-002 (Letras) | M-001/M-002 (Médicas)`)
  console.log(`  30 alumnos (5 × aula) con carrera asignada`)
  console.log(`  ${schoolDays.length} días escolares con asistencia registrada`)
}

main()
  .catch((e) => { console.error('❌  Error en seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
