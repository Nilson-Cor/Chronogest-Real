-- =============================================================================
-- MIGRACIÓN 002: Restructurar horarios_db
-- Ejecutar contra horarios_db:
--   docker exec -i chronogest_postgres psql -U postgres -d horarios_db < 002_restructure_horarios.sql
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Crear la tabla asignacion_horarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignacion_horarios (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horario_id                  UUID NOT NULL,
    ficha_id                    UUID,
    ambiente_id                 UUID,
    instructor_id               UUID,
    activo                      BOOLEAN DEFAULT FALSE,
    ultima_activacion           TIMESTAMPTZ,
    minutos_retraso             INT DEFAULT 0,
    motivo_finalizacion         TEXT,
    ubicacion_transversal_id    UUID,
    ubicacion_transversal_nombre VARCHAR(150),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migrar datos de horarios → asignacion_horarios (1:1 preservando UUIDs)
--    Los UUIDs de asignacion son IGUALES a los UUIDs de horario originales
--    para que las referencias externas sigan funcionando.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO asignacion_horarios (
    id, horario_id,
    ficha_id, ambiente_id, instructor_id,
    activo, ultima_activacion, minutos_retraso, motivo_finalizacion,
    ubicacion_transversal_id, ubicacion_transversal_nombre,
    created_at, updated_at
)
SELECT
    h.id,           -- asignacion.id = horario.id antiguo
    h.id,           -- horario_id también = el mismo (misma fila, ahora referencia a sí mismo como plantilla)
    h.ficha_id,
    h.ambiente_id,
    h.instructor_id,
    h.activo,
    h.ultima_activacion,
    h.minutos_retraso,
    h.motivo_finalizacion,
    h.ubicacion_transversal_id,
    h.ubicacion_transversal_nombre,
    h.created_at,
    h.updated_at
FROM horarios h
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Limpiar los campos de asignacion de la tabla horarios
--    (Solo quedan: dia_semana, jornada, hora_inicio, hora_fin)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE horarios
    DROP COLUMN IF EXISTS ficha_id,
    DROP COLUMN IF EXISTS ambiente_id,
    DROP COLUMN IF EXISTS instructor_id,
    DROP COLUMN IF EXISTS activo,
    DROP COLUMN IF EXISTS ultima_activacion,
    DROP COLUMN IF EXISTS minutos_retraso,
    DROP COLUMN IF EXISTS motivo_finalizacion,
    DROP COLUMN IF EXISTS ubicacion_transversal_id,
    DROP COLUMN IF EXISTS ubicacion_transversal_nombre;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Agregar FK de asignacion_horarios → horarios
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE asignacion_horarios
    ADD CONSTRAINT fk_asignacion_horario
    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Migrar competencias: horario_id → asignacion_id
--    Como asignacion.id = horario.id antiguo, la referencia es directa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    -- Agregar columna asignacion_id si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name='competencias' AND column_name='asignacion_id') THEN
        ALTER TABLE competencias ADD COLUMN asignacion_id UUID;
    END IF;
END $$;

UPDATE competencias
SET asignacion_id = horario_id
WHERE asignacion_id IS NULL AND horario_id IS NOT NULL;

ALTER TABLE competencias
    ADD CONSTRAINT fk_competencia_asignacion
    FOREIGN KEY (asignacion_id) REFERENCES asignacion_horarios(id) ON DELETE CASCADE;

-- Quitar la columna antigua si existe
ALTER TABLE competencias DROP COLUMN IF EXISTS horario_id;

-- Hacer asignacion_id NOT NULL (todos los registros ya tienen valor)
ALTER TABLE competencias ALTER COLUMN asignacion_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Migrar solicitudes_cambio: horario_id_actual → asignacion_id
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name='solicitudes_cambio' AND column_name='asignacion_id') THEN
        ALTER TABLE solicitudes_cambio ADD COLUMN asignacion_id UUID;
    END IF;
END $$;

UPDATE solicitudes_cambio
SET asignacion_id = horario_id_actual
WHERE asignacion_id IS NULL AND horario_id_actual IS NOT NULL;

ALTER TABLE solicitudes_cambio
    ADD CONSTRAINT fk_solicitud_asignacion
    FOREIGN KEY (asignacion_id) REFERENCES asignacion_horarios(id) ON DELETE CASCADE;

ALTER TABLE solicitudes_cambio DROP COLUMN IF EXISTS horario_id_actual;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Eliminar tabla configuracion_sistema (PIN migrado a epsas_db.aplicativos)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS configuracion_sistema;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Agregar columna pin_registro a epsas_db.aplicativos
--    (Ejecutar separado contra epsas_db si está en otra conexión)
-- ─────────────────────────────────────────────────────────────────────────────
-- Esto se ejecuta contra epsas_db:
--   docker exec -i chronogest_postgres psql -U postgres -d epsas_db -c
--   "ALTER TABLE aplicativos ADD COLUMN IF NOT EXISTS pin_registro VARCHAR(20) DEFAULT '1234';"

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación final
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    (SELECT COUNT(*) FROM horarios)           AS plantillas_horario,
    (SELECT COUNT(*) FROM asignacion_horarios) AS asignaciones,
    (SELECT COUNT(*) FROM competencias)        AS competencias,
    (SELECT COUNT(*) FROM solicitudes_cambio)  AS solicitudes;
