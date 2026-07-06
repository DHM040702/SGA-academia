-- ============================================================================
-- SEED DE PRUEBA v2 — Tardanzas de DOCENTES (alineado a America/Lima)
-- ----------------------------------------------------------------------------
-- Reemplaza al seed anterior. Guarda cada marca de docente RELATIVA al horaInicio
-- de su PRIMERA clase del día (ciclo activo), interpretada en hora de Lima, para
-- que /reportes/tardanzas-docentes muestre tardanzas reales.
--
-- • El backend corre en America/Lima (-05): por eso las marcas se generan con
--   `AT TIME ZONE 'America/Lima'` (así getHours() del backend = la hora de pared).
-- • ~40% de las marcas quedan tardanza (8–37 min tarde); el resto puntuales
--   (3–12 min antes). Tolerancia 5 min, igual que el kiosco y el reporte.
-- • Solo inserta marcas en días donde el docente TIENE clase en el ciclo activo.
-- • Idempotente: borra el seed previo y respeta @@unique(docente_id, fecha).
--
-- Correr:
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < backend/prisma/manual/seed-tardanzas-docentes.sql
-- ============================================================================

-- 1) Limpiar cualquier seed de docentes previo
DELETE FROM asistencias WHERE tipo_persona = 'docente' AND motivo_manual = 'seed-docentes-prueba';

-- 2) Insertar marcas alineadas al horario, en hora de Lima
INSERT INTO asistencias
  (tipo_persona, docente_id, fecha, hora_ingreso,
   es_tardanza, es_manual, es_ausente, motivo_manual, registrado_por)
SELECT
  'docente',
  d.id,
  gs.dia::date,
  -- Marca = inicio de la 1.ª clase + desfase, interpretado como hora local de Lima
  ((gs.dia::date + fc.hora + make_interval(mins => dv.m)) AT TIME ZONE 'America/Lima'),
  (dv.m > 5),                        -- tardanza si llega > 5 min tarde (tolerancia)
  false,
  false,
  'seed-docentes-prueba',
  (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY created_at ASC LIMIT 1)
FROM docentes d
CROSS JOIN generate_series(date '2026-06-15', date '2026-07-06', interval '1 day') AS gs(dia)
-- Primera clase (hora_inicio mínimo) del docente ese día de semana, en el ciclo activo
JOIN LATERAL (
  SELECT MIN(h.hora_inicio) AS hora
  FROM horarios h
  JOIN aulas  a ON a.id = h.aula_id
  JOIN ciclos c ON c.id = a.ciclo_id AND c.activo = true
  WHERE h.docente_id = d.id
    AND h.dia_semana = (CASE WHEN extract(dow FROM gs.dia) = 0 THEN 7 ELSE extract(dow FROM gs.dia)::int END)
) fc ON fc.hora IS NOT NULL
-- Desfase determinista respecto a esa hora de inicio
CROSS JOIN LATERAL (
  SELECT CASE
           WHEN abs(hashtext(d.id::text || gs.dia::text)) % 5 < 2
             THEN  8 + (abs(hashtext(d.id::text || gs.dia::text)) % 30)   -- 8..37 min tarde (~40%)
           ELSE   -(3 + (abs(hashtext(d.id::text || gs.dia::text)) % 10))  -- 3..12 min antes
         END AS m
) dv
WHERE d.deleted_at IS NULL
ON CONFLICT (docente_id, fecha) DO NOTHING;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Cuántas marcas y cuántas tardanzas quedaron:
--   SELECT count(*) AS marcas, sum((es_tardanza)::int) AS tardanzas
--   FROM asistencias WHERE motivo_manual = 'seed-docentes-prueba';
--
-- Ver hora de marca en LIMA vs la esperada (debería cuadrar con el reporte):
--   SELECT d.nombre, a.fecha,
--          (a.hora_ingreso AT TIME ZONE 'America/Lima')::time AS marca_lima,
--          a.es_tardanza
--   FROM asistencias a JOIN docentes d ON d.id = a.docente_id
--   WHERE a.motivo_manual = 'seed-docentes-prueba'
--   ORDER BY a.fecha DESC LIMIT 15;

-- ── Deshacer ────────────────────────────────────────────────────────────────
--   DELETE FROM asistencias WHERE tipo_persona = 'docente' AND motivo_manual = 'seed-docentes-prueba';
