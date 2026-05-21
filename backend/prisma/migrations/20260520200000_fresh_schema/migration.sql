-- Fresh schema migration — matches schema.prisma exactly
-- Replace the two incompatible historical migrations

-- ─── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────
CREATE TYPE "Rol" AS ENUM ('admin', 'director', 'vigilante', 'alumno', 'apoderado', 'docente');
CREATE TYPE "Turno" AS ENUM ('manana', 'tarde', 'noche');
CREATE TYPE "TipoPersona" AS ENUM ('alumno', 'docente');
CREATE TYPE "TipoRecurso" AS ENUM ('pdf', 'video', 'enlace', 'iframe');
CREATE TYPE "TipoDestinatario" AS ENUM ('todos', 'seccion', 'alumnos', 'apoderados', 'usuario');
CREATE TYPE "CanalEnvio" AS ENUM ('whatsapp', 'sms', 'sistema');
CREATE TYPE "EstadoEnvio" AS ENUM ('pendiente', 'enviado', 'fallido');

-- ─── usuarios ────────────────────────────────────────────────────
CREATE TABLE "usuarios" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "email"         VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol"           "Rol"        NOT NULL,
    "activo"        BOOLEAN      NOT NULL DEFAULT true,
    "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "deleted_at"    TIMESTAMPTZ,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- ─── ciclos ──────────────────────────────────────────────────────
CREATE TABLE "ciclos" (
    "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
    "nombre"       VARCHAR(100) NOT NULL,
    "fecha_inicio" DATE         NOT NULL,
    "fecha_fin"    DATE         NOT NULL,
    "activo"       BOOLEAN      NOT NULL DEFAULT false,
    "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT "ciclos_pkey" PRIMARY KEY ("id")
);

-- ─── secciones ───────────────────────────────────────────────────
CREATE TABLE "secciones" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "ciclo_id"    UUID         NOT NULL,
    "nombre"      VARCHAR(50)  NOT NULL,
    "turno"       "Turno"      NOT NULL,
    "nivel"       VARCHAR(50),
    "cupo_maximo" INTEGER      NOT NULL DEFAULT 40,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

-- ─── cursos ──────────────────────────────────────────────────────
CREATE TABLE "cursos" (
    "id"     UUID         NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(20)  NOT NULL,
    "activo" BOOLEAN      NOT NULL DEFAULT true,
    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cursos_codigo_key" ON "cursos"("codigo");

-- ─── alumnos ─────────────────────────────────────────────────────
CREATE TABLE "alumnos" (
    "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id"       UUID         NOT NULL,
    "dni"              VARCHAR(12)  NOT NULL,
    "nombre"           VARCHAR(100) NOT NULL,
    "apellidos"        VARCHAR(150) NOT NULL,
    "fecha_nacimiento" DATE,
    "telefono"         VARCHAR(20),
    "codigo_barras"    VARCHAR(6)   NOT NULL,
    "foto_url"         VARCHAR(500),
    "seccion_id"       UUID,
    "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "deleted_at"       TIMESTAMPTZ,
    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "alumnos_usuario_id_key"    ON "alumnos"("usuario_id");
CREATE UNIQUE INDEX "alumnos_dni_key"           ON "alumnos"("dni");
CREATE UNIQUE INDEX "alumnos_codigo_barras_key" ON "alumnos"("codigo_barras");

-- ─── apoderados ──────────────────────────────────────────────────
CREATE TABLE "apoderados" (
    "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id"        UUID         NOT NULL,
    "nombre"            VARCHAR(100) NOT NULL,
    "apellidos"         VARCHAR(150) NOT NULL,
    "dni"               VARCHAR(12)  NOT NULL,
    "telefono_whatsapp" VARCHAR(20)  NOT NULL,
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "deleted_at"        TIMESTAMPTZ,
    CONSTRAINT "apoderados_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "apoderados_usuario_id_key" ON "apoderados"("usuario_id");
CREATE UNIQUE INDEX "apoderados_dni_key"        ON "apoderados"("dni");

-- ─── alumnos_apoderados ──────────────────────────────────────────
CREATE TABLE "alumnos_apoderados" (
    "alumno_id"    UUID        NOT NULL,
    "apoderado_id" UUID        NOT NULL,
    "parentesco"   VARCHAR(50) NOT NULL,
    "es_principal" BOOLEAN     NOT NULL DEFAULT false,
    CONSTRAINT "alumnos_apoderados_pkey" PRIMARY KEY ("alumno_id", "apoderado_id")
);

-- ─── docentes ────────────────────────────────────────────────────
CREATE TABLE "docentes" (
    "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id"        UUID         NOT NULL,
    "dni"               VARCHAR(12)  NOT NULL,
    "nombre"            VARCHAR(100) NOT NULL,
    "apellidos"         VARCHAR(150) NOT NULL,
    "especialidad"      VARCHAR(100),
    "telefono_whatsapp" VARCHAR(20),
    "foto_url"          VARCHAR(500),
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "deleted_at"        TIMESTAMPTZ,
    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "docentes_usuario_id_key" ON "docentes"("usuario_id");
CREATE UNIQUE INDEX "docentes_dni_key"        ON "docentes"("dni");

-- ─── horarios ────────────────────────────────────────────────────
CREATE TABLE "horarios" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "seccion_id" UUID        NOT NULL,
    "curso_id"   UUID        NOT NULL,
    "docente_id" UUID        NOT NULL,
    "dia_semana" SMALLINT    NOT NULL,
    "hora_inicio" TIME       NOT NULL,
    "hora_fin"   TIME        NOT NULL,
    "aula"       VARCHAR(50),
    "publicado"  BOOLEAN     NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id")
);

-- ─── asistencias ─────────────────────────────────────────────────
CREATE TABLE "asistencias" (
    "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
    "tipo_persona"   "TipoPersona" NOT NULL,
    "alumno_id"      UUID,
    "docente_id"     UUID,
    "fecha"          DATE          NOT NULL,
    "hora_ingreso"   TIMESTAMPTZ   NOT NULL,
    "es_tardanza"    BOOLEAN       NOT NULL DEFAULT false,
    "es_manual"      BOOLEAN       NOT NULL DEFAULT false,
    "motivo_manual"  TEXT,
    "registrado_por" UUID          NOT NULL,
    "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- ─── comunicados ─────────────────────────────────────────────────
CREATE TABLE "comunicados" (
    "id"               UUID               NOT NULL DEFAULT gen_random_uuid(),
    "titulo"           VARCHAR(200)       NOT NULL,
    "cuerpo"           TEXT               NOT NULL,
    "adjunto_url"      VARCHAR(500),
    "destinatario_tipo" "TipoDestinatario" NOT NULL,
    "seccion_id"       UUID,
    "canal_sistema"    BOOLEAN            NOT NULL DEFAULT true,
    "canal_whatsapp"   BOOLEAN            NOT NULL DEFAULT false,
    "publicado_por"    UUID               NOT NULL,
    "publicado_at"     TIMESTAMPTZ,
    "created_at"       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    CONSTRAINT "comunicados_pkey" PRIMARY KEY ("id")
);

-- ─── comunicados_envios ──────────────────────────────────────────
CREATE TABLE "comunicados_envios" (
    "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
    "comunicado_id" UUID        NOT NULL,
    "usuario_id"   UUID         NOT NULL,
    "canal"        "CanalEnvio" NOT NULL,
    "estado"       "EstadoEnvio" NOT NULL DEFAULT 'pendiente',
    "enviado_at"   TIMESTAMPTZ,
    "error_detalle" TEXT,
    CONSTRAINT "comunicados_envios_pkey" PRIMARY KEY ("id")
);

-- ─── recursos_biblioteca ─────────────────────────────────────────
CREATE TABLE "recursos_biblioteca" (
    "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
    "titulo"      VARCHAR(200)  NOT NULL,
    "descripcion" TEXT,
    "tipo"        "TipoRecurso" NOT NULL,
    "url"         VARCHAR(500)  NOT NULL,
    "curso_id"    UUID,
    "nivel"       VARCHAR(50),
    "activo"      BOOLEAN       NOT NULL DEFAULT true,
    "descargas"   INTEGER       NOT NULL DEFAULT 0,
    "subido_por"  UUID          NOT NULL,
    "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT "recursos_biblioteca_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign keys ────────────────────────────────────────────────
ALTER TABLE "secciones"
    ADD CONSTRAINT "secciones_ciclo_id_fkey"
    FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alumnos"
    ADD CONSTRAINT "alumnos_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alumnos"
    ADD CONSTRAINT "alumnos_seccion_id_fkey"
    FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "apoderados"
    ADD CONSTRAINT "apoderados_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alumnos_apoderados"
    ADD CONSTRAINT "alumnos_apoderados_alumno_id_fkey"
    FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alumnos_apoderados"
    ADD CONSTRAINT "alumnos_apoderados_apoderado_id_fkey"
    FOREIGN KEY ("apoderado_id") REFERENCES "apoderados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "docentes"
    ADD CONSTRAINT "docentes_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horarios"
    ADD CONSTRAINT "horarios_seccion_id_fkey"
    FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horarios"
    ADD CONSTRAINT "horarios_curso_id_fkey"
    FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horarios"
    ADD CONSTRAINT "horarios_docente_id_fkey"
    FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asistencias"
    ADD CONSTRAINT "asistencias_alumno_id_fkey"
    FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "asistencias"
    ADD CONSTRAINT "asistencias_docente_id_fkey"
    FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "asistencias"
    ADD CONSTRAINT "asistencias_registrado_por_fkey"
    FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "comunicados"
    ADD CONSTRAINT "comunicados_publicado_por_fkey"
    FOREIGN KEY ("publicado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "comunicados"
    ADD CONSTRAINT "comunicados_seccion_id_fkey"
    FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comunicados_envios"
    ADD CONSTRAINT "comunicados_envios_comunicado_id_fkey"
    FOREIGN KEY ("comunicado_id") REFERENCES "comunicados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "comunicados_envios"
    ADD CONSTRAINT "comunicados_envios_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recursos_biblioteca"
    ADD CONSTRAINT "recursos_biblioteca_curso_id_fkey"
    FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recursos_biblioteca"
    ADD CONSTRAINT "recursos_biblioteca_subido_por_fkey"
    FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
