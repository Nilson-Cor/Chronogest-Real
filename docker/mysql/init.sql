-- ============================================================
--  ChronoGest — Inicialización de bases de datos MySQL
--  Este script corre automáticamente la primera vez que
--  se levanta el contenedor de MySQL.
-- ============================================================

-- Base de datos principal (TypeORM sincroniza las tablas automáticamente)
CREATE DATABASE IF NOT EXISTS horarios_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Base de datos de proyecto formativo SENA
CREATE DATABASE IF NOT EXISTS proyecto_formativo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Permisos para el usuario root desde cualquier host (red Docker)
GRANT ALL PRIVILEGES ON horarios_db.*           TO 'root'@'%';
GRANT ALL PRIVILEGES ON proyecto_formativo_db.* TO 'root'@'%';
FLUSH PRIVILEGES;
