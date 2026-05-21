-- CreateEnum
CREATE TYPE "Area" AS ENUM ('ciencias', 'letras', 'medicas');

-- AlterTable: add area column (temp default so NOT NULL works on existing rows)
ALTER TABLE "secciones" ADD COLUMN "area" "Area" NOT NULL DEFAULT 'ciencias';
ALTER TABLE "secciones" ALTER COLUMN "area" DROP DEFAULT;

-- AlterEnum: remove noche (safe: update any existing noche rows first)
UPDATE "secciones" SET turno = 'tarde' WHERE turno = 'noche';
ALTER TYPE "Turno" RENAME TO "Turno_old";
CREATE TYPE "Turno" AS ENUM ('manana', 'tarde');
ALTER TABLE "secciones" ALTER COLUMN "turno" TYPE "Turno" USING "turno"::text::"Turno";
DROP TYPE "Turno_old";
