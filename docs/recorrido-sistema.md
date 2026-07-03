# Recorrido del sistema SGA — guía de módulos por rol

> Manual de recorrido/capacitación del Sistema de Gestión Académica (CEPRE UNASAM).
> Describe, rol por rol, cada módulo y su función, para dar una explicación profunda
> del sistema o entrenar a nuevos usuarios.
>
> **Alcance de esta versión:** roles de gestión y operación — **admin, director,
> auxiliar y docente**. Los portales de **alumno** y **apoderado** se documentarán
> en una versión posterior.

---

## Cómo hacer el recorrido

1. **Una cuenta por rol.** El seed inicial crea las cuentas de staff (contraseña
   inicial = el DNI, con cambio obligatorio al primer ingreso):

   | Rol       | Correo                          | DNI / contraseña inicial |
   |-----------|---------------------------------|--------------------------|
   | Admin     | `admin@cepreunasam.edu.pe`      | `00000001`               |
   | Director  | `director@cepreunasam.edu.pe`   | `00000002`               |
   | Auxiliar  | `auxiliar@cepreunasam.edu.pe`   | `00000003`               |
   | Docente   | cualquier docente importado     | su DNI                   |

2. **Sesiones simultáneas.** Abre una **ventana de incógnito por rol** para tener
   las 4 sesiones abiertas a la vez y comparar lo que ve cada uno.

3. **Sigue el sidebar de arriba a abajo.** El menú lateral **ya está filtrado por
   rol**, así que lo que aparece en el sidebar de cada usuario **es exactamente su
   alcance real** en el sistema.

4. Opcional: **graba la pantalla** por rol para dejar material de capacitación.

### Conceptos transversales (mencionar una vez)
- **Ciclo activo:** casi todo (alumnos, aulas, asistencia, reportes) se limita por
  defecto al ciclo marcado como *activo*. Los ciclos cerrados no ensucian las vistas.
- **Turnos:** mañana / tarde. Cada aula pertenece a un turno.
- **Áreas:** ciencias / letras / médicas — clasifican alumnos, aulas, carreras y
  recursos de biblioteca.
- **Sesión:** el access token dura 15 min y se renueva solo; la sesión total dura
  hasta 1 día, se cierra al cerrar el navegador y por inactividad (120 min por defecto).

---

## 🔴 ADMIN — acceso total

El administrador gestiona todo el sistema. Su sidebar tiene 5 grupos.

### Inicio
Panel principal con:
- **KPIs:** alumnos activos, docentes activos, asistencia de hoy, comunicados.
- **Asistencia esta semana:** gráfico de barras del % diario (se llena con escaneos
  reales de asistencia).
- **Clases de hoy** y **comunicados recientes**.
- **Alumnos en riesgo:** los de asistencia < 75 %.

### Grupo: Académico
- **Alumnos** — listado paginado con búsqueda (nombre, código, DNI) y filtros.
  Permite: crear alumno (genera usuario + código de barras), editar, subir/eliminar
  foto, ver detalle con su % de asistencia y horario, y **vincular apoderado**.
  El botón **Importar Excel** hace **re-matrícula por DNI** (actualiza al alumno
  existente y lo mueve al aula del ciclo activo; crea los nuevos).
- **Apoderados** — gestión de apoderados: crear, editar (nombre, WhatsApp, correo,
  estado), **restablecer contraseña**, **vincular/desvincular** estudiantes, eliminar.
- **Docentes** — CRUD de docentes (crea usuario con rol docente), foto de perfil,
  y se ven sus horarios/cursos asignados.
- **Ciclos y aulas** — administra los ciclos académicos (crear, **activar** — solo
  uno activo a la vez) y las **aulas** de cada ciclo (nombre, turno, área, cupo).
  Muestra progreso del ciclo (semana X de Y) y conteo de alumnos.
- **Cursos** — catálogo de cursos (nombre, código único).
- **Carreras** — carreras profesionales por área (para clasificar a los alumnos).
- **Horarios** — **calendario proporcional al tiempo** por aula: crear horarios
  (aula + curso + docente + día + rango horario), gestionar **recesos** (banda
  visual, bloquea solapes), **publicar** horarios y **exportar** a PDF con logo.

### Grupo: Operaciones
- **Asistencia** — registros del día seleccionado. Filtros por **aula, turno y
  tipo** (alumno/docente). Acciones: **Cerrar turno** (marca como falta a los que
  no registraron; solo tras finalizar el turno), **corregir** un registro (con
  advertencia), **justificar** faltas, **eliminar** (admin), y **exportar** a Excel
  (alumnos y docentes) y PDF.
- **Inasistencias** — panel dedicado a las faltas por **rango de fechas**, agrupadas
  por día, con KPIs (pendientes/justificadas) y botón para **justificar** (razón +
  N.° de expediente obligatorio; queda la traza de quién y cuándo).
- **Registros** — historial de asistencias (alumnos **o** docentes) por rango de
  fechas, con paginación. Admin/director pueden **editar** o **eliminar** desde aquí.
- **Carnets** — genera los carnets de los alumnos en hoja A4 (2×5 = 10 por hoja).

### Grupo: Comunicación
- **Comunicados** — crear un comunicado dirigido a un tipo de destinatario (todos,
  docentes, alumnos, apoderados), guardarlo como borrador o **publicarlo**, y ver el
  detalle de **envíos** (a quién llegó, estado). Los borradores solo los ve gestión.
- **Biblioteca** — recursos digitales (PDF subido a MinIO, o enlaces externos)
  clasificados por **área** y curso. Subir/editar/eliminar recursos y ver historial.

### Grupo: Administración
- **Reportes** — reportes de **asistencia general** (tendencia, por sección, por
  docente), **alumnos**, **horarios** y **cursos**, con selector de ciclo y export.
- **Turnos** — configuración horaria de cada turno: hora de entrada, hora límite
  de puntualidad (define la tardanza) y hora de fin (habilita cerrar turno).
- **Usuarios** — gestión de cuentas del sistema (admin/director/auxiliar/…):
  crear, editar, activar/desactivar.
- **Auditoría** — registro de acciones realizadas en el sistema.

---

## 🟣 DIRECTOR — gestión sin administración de cuentas

El director tiene una vista de **gestión y supervisión**, sin las funciones de
alta/baja de personas ni de cuentas. Su sidebar:

- **Inicio** — mismo dashboard que el admin.
- **Académico:** **Carreras**, **Horarios**.
- **Operaciones:** **Asistencia**, **Inasistencias**, **Registros**, **Carnets**
  — con las mismas capacidades operativas del admin, incluida la **edición de
  registros** (con advertencia).
- **Comunicación:** **Comunicados**.
- **Administración:** **Reportes**, **Turnos**, **Auditoría**.

**No ve** (respecto al admin): Alumnos, Apoderados, Docentes, Ciclos y aulas,
Cursos, Biblioteca ni Usuarios.

---

## 🟡 AUXILIAR — operación de puerta

El auxiliar (antes "vigilante") opera el registro de asistencia en la entrada.

- **Registro asistencia** (`/auxiliar`) — el **kiosco a pantalla completa con
  lectora HID**: al escanear el código del alumno (o DNI del docente) muestra en
  grande el nombre y la foto/iniciales, marca **Puntual/Tardanza** (toggle), y si la
  persona **ya estaba registrada hoy** muestra una **advertencia ámbar** con la hora
  del primer registro. Panel lateral "En vivo" con los últimos ingresos.
- **Asistencia** — ve los registros del día y puede **justificar** faltas
  (razón + expediente). **No puede** corregir ni eliminar registros.
- **Inasistencias** — panel de faltas por rango; puede **justificar**.
- **Registros** — consulta el historial (solo lectura).
- **Consulta:** **Alumnos**, **Docentes**, **Horarios** — solo lectura.
- **Comunicados** — ve los comunicados dirigidos a su rol.

---

## 🟢 DOCENTE — su espacio

El docente ve únicamente lo relacionado a su labor.

- **Inicio** — resumen personal (saludo, sus datos, accesos rápidos).
- **Mi horario** — su horario de clases del ciclo activo.
- **Mi asistencia** — su propio registro de asistencia como docente.
- **Registros de aula** — **solo lectura** de la asistencia de los alumnos de las
  **aulas donde tiene horario asignado** (no ve otras aulas; verificado en el backend).
- **Comunicados** — los dirigidos a docentes o a todos.
- **Biblioteca** — recursos educativos (el docente ve todo el material; puede subir
  recursos en su área si el permiso lo habilita).

---

## Notas para quien da la explicación
- Recuerda que la clasificación por rol/área **se valida en el backend**, no solo en
  la interfaz: un usuario no puede acceder por URL a lo que su rol no permite.
- La asistencia se puebla con **escaneos reales**; en un ambiente recién instalado
  los paneles pueden verse en 0 % hasta que se registre asistencia.
- Los portales de **alumno** y **apoderado** quedan fuera de esta versión y se
  documentarán aparte.
