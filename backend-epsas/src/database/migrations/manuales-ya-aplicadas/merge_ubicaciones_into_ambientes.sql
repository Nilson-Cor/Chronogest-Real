-- =============================================================================
-- MIGRACIÓN: Unificar tabla ubicaciones → ambientes
-- Ejecutar UNA SOLA VEZ contra epsas_db
-- =============================================================================

-- 1. Agregar columna estado a ambientes (si no existe)
ALTER TABLE ambientes
    ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

-- 2. Insertar registros de ubicaciones en ambientes
--    Preservamos el mismo UUID (idUbicacion → idAmbiente) para que las
--    referencias en horarios.ubicacion_transversal_id sigan funcionando.
--
--    Mapeo de columnas:
--      ubicaciones.idUbicacion  → ambientes.idAmbiente
--      ubicaciones.nombre       → ambientes.nombre
--      ubicaciones.tipo         → ambientes.tipo
--      ubicaciones.capacidad    → ambientes.capacidad
--      ubicaciones.area_id      → ambientes.area      (nombre distinto)
--      ubicaciones.sede_id      → ambientes.sede      (nombre distinto)
--      ubicaciones.estado       → ambientes.estado

INSERT INTO ambientes ("idAmbiente", nombre, tipo, capacidad, area, sede, estado)
SELECT
    u."idUbicacion",
    u.nombre,
    u.tipo,
    u.capacidad,
    u.area_id,
    u.sede_id,
    COALESCE(u.estado, 'activo')
FROM ubicaciones u
ON CONFLICT ("idAmbiente") DO NOTHING;

-- 3. Verificar que la migración fue correcta antes de borrar
-- (ejecutar el SELECT, revisar que los números coincidan, LUEGO ejecutar el DROP)
SELECT
    (SELECT COUNT(*) FROM ubicaciones)         AS total_ubicaciones,
    (SELECT COUNT(*) FROM ambientes)           AS total_ambientes_tras_merge;

-- 4. Eliminar la tabla ubicaciones
--    DESCOMENTARLO sólo después de verificar el paso anterior
-- DROP TABLE IF EXISTS ubicaciones;

-- =============================================================================
-- Verificación final
-- =============================================================================
-- SELECT idAmbiente, nombre, tipo, estado FROM ambientes ORDER BY tipo, nombre;
