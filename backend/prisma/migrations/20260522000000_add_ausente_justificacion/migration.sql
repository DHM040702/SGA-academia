ALTER TABLE "asistencias" ADD COLUMN "es_ausente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "asistencias" ADD COLUMN "justificacion_razon" TEXT;
ALTER TABLE "asistencias" ADD COLUMN "justificacion_doc" TEXT;
