-- CreateTable: turnos_config
-- Stores time boundaries for each turno (manana/tarde)
-- Used by the attendance service to determine tardanza threshold

CREATE TABLE "turnos_config" (
    "id"                  UUID    NOT NULL DEFAULT gen_random_uuid(),
    "turno"               "Turno" NOT NULL,
    "hora_entrada"        TIME(6) NOT NULL,
    "hora_limite_puntual" TIME(6) NOT NULL,
    "hora_fin"            TIME(6) NOT NULL,
    "activo"              BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "turnos_config_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex: one config per turno value
CREATE UNIQUE INDEX "turnos_config_turno_key" ON "turnos_config"("turno");

-- Seed default configs
INSERT INTO "turnos_config" ("turno", "hora_entrada", "hora_limite_puntual", "hora_fin")
VALUES
  ('manana', '07:00:00', '07:15:00', '13:00:00'),
  ('tarde',  '13:00:00', '13:15:00', '20:00:00');
