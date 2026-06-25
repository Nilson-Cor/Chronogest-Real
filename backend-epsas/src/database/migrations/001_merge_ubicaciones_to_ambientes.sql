-- =============================================================================
-- MIGRACIÓN 001: Mover registros de ubicaciones → ambientes
-- Base de datos: epsas_db
-- Ejecutar UNA SOLA VEZ con:
--   docker exec -i chronogest_postgres psql -U postgres -d epsas_db < migration.sql
-- =============================================================================

BEGIN;

-- 1. Asegurar que la columna estado existe en ambientes
ALTER TABLE ambientes ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

-- 2. Verificar que la tabla ubicaciones existe antes de migrar
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ubicaciones') THEN

        -- 3. Insertar registros de ubicaciones en ambientes (preserva mismos UUIDs)
        --    Mapeo de columnas:
        --      ubicaciones.idUbicacion  → ambientes.idAmbiente   (mismo UUID)
        --      ubicaciones.nombre       → ambientes.nombre
        --      ubicaciones.tipo         → ambientes.tipo
        --      ubicaciones.capacidad    → ambientes.capacidad
        --      ubicaciones.area_id      → ambientes.area         (columna se llama 'area')
        --      ubicaciones.sede_id      → ambientes.sede         (columna se llama 'sede')
        --      ubicaciones.estado       → ambientes.estado

        INSERT INTO ambientes ("idAmbiente", nombre, tipo, capacidad, area, sede, estado)
        SELECT
            u."idUbicacion",
            u.nombre,
            COALESCE(u.tipo, 'Auditorio'),
            u.capacidad,
            u.area_id,
            u.sede_id,
            COALESCE(u.estado, 'activo')
        FROM ubicaciones u
        ON CONFLICT ("idAmbiente") DO NOTHING;

        RAISE NOTICE 'Migración: % registros insertados de ubicaciones en ambientes',
            (SELECT COUNT(*) FROM ubicaciones);

        -- 4. Eliminar la tabla ubicaciones
        DROP TABLE ubicaciones;

        RAISE NOTICE 'Tabla ubicaciones eliminada exitosamente.';

    ELSE
        RAISE NOTICE 'La tabla ubicaciones no existe — migración ya fue ejecutada o no es necesaria.';
    END IF;
END $$;

COMMIT;

-- Verificación final
SELECT COUNT(*) AS total_ambientes, tipo FROM ambientes GROUP BY tipo ORDER BY tipo;
