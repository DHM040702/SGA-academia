-- ============================================================================
-- SEED DE PRUEBA — Asistencia de DOCENTES
-- ----------------------------------------------------------------------------
-- Genera 1 registro por docente por día hábil (Lunes–Sábado) dentro de un rango
-- reciente, con ~20% de tardanzas, para probar los reportes (Asistencia →
-- "por_docente", puntualidad) y la visualización en /asistencia y /auxiliar.
--
-- • Idempotente: ON CONFLICT (docente_id, fecha) DO NOTHING respeta el índice
--   único @@unique([docenteId, fecha]). Re-ejecutarlo NO duplica.
-- • Marcado con motivo_manual = 'seed-docentes-prueba' para poder borrarlo
--   sin tocar registros reales (ver bloque de limpieza al final).
-- • registrado_por = primer usuario admin (debe existir; si no, el INSERT falla
--   por la FK NOT NULL — crea/usa admin@cepreunasam.edu.pe).
--
-- Correr:
--   docker exec -i sga-academia-postgres-1 psql -U sga_user -d sga_db < backend/prisma/manual/seed-asistencia-docentes.sql
-- ============================================================================

INSERT INTO asistencias
  (tipo_persona, docente_id, fecha, hora_ingreso,
   es_tardanza, es_manual, es_ausente, motivo_manual, registrado_por)
SELECT
  'docente',
  d.id,
  gs.dia::date,
  -- Puntual → 06:58, tardanza → 07:22 (hora en UTC, como el resto de @db.Timestamptz)
  ((gs.dia::date
     + CASE WHEN (abs(hashtext(d.id::text || gs.dia::text)) % 5 = 0)
            THEN time '07:22' ELSE time '06:58' END
   ) AT TIME ZONE 'UTC'),
  (abs(hashtext(d.id::text || gs.dia::text)) % 5 = 0),   -- ~20% tardanzas (determinista)
  false,                                                 -- no se muestran como "Manual"
  false,
  'seed-docentes-prueba',
  (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY created_at ASC LIMIT 1)
FROM docentes d
CROSS JOIN generate_series(date '2026-06-15', date '2026-07-03', interval '1 day') AS gs(dia)
WHERE d.deleted_at IS NULL
  AND extract(dow FROM gs.dia) BETWEEN 1 AND 6           -- Lunes(1) … Sábado(6); sin domingos
ON CONFLICT (docente_id, fecha) DO NOTHING;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Total y resumen por docente:
--   SELECT count(*) FROM asistencias WHERE tipo_persona = 'docente';
--
--   SELECT d.nombre, d.apellidos,
--          count(*)                        AS dias_registrados,
--          sum((a.es_tardanza)::int)       AS tardanzas,
--          round(100.0 * sum((NOT a.es_tardanza)::int) / count(*), 0) AS pct_puntualidad
--   FROM asistencias a
--   JOIN docentes d ON d.id = a.docente_id
--   WHERE a.tipo_persona = 'docente'
--   GROUP BY d.id, d.nombre, d.apellidos
--   ORDER BY dias_registrados DESC;

-- ── Limpieza (deshacer SOLO este seed) ──────────────────────────────────────
--   DELETE FROM asistencias
--   WHERE tipo_persona = 'docente' AND motivo_manual = 'seed-docentes-prueba';
