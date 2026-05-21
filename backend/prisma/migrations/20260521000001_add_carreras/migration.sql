-- CreateTable: carreras (area → Area enum ya existente)
CREATE TABLE "carreras" (
    "id"     UUID         NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(100) NOT NULL,
    "area"   "Area"       NOT NULL,
    "activo" BOOLEAN      NOT NULL DEFAULT true,
    CONSTRAINT "carreras_pkey" PRIMARY KEY ("id")
);

-- AlterTable: alumnos agrega carrera_id (nullable, sin FK obligatoria)
ALTER TABLE "alumnos" ADD COLUMN "carrera_id" UUID;

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_carrera_id_fkey"
    FOREIGN KEY ("carrera_id") REFERENCES "carreras"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
