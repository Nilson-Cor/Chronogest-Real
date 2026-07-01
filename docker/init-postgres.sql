-- Script de inicialización de PostgreSQL
-- Se ejecuta automáticamente la primera vez que se crea el contenedor
-- Crea horarios_db y chronogest_master_db si no existen
-- (epsas_db la crea el propio Docker con la variable POSTGRES_DB)

SELECT 'CREATE DATABASE horarios_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'horarios_db')\gexec

SELECT 'CREATE DATABASE chronogest_master_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chronogest_master_db')\gexec

-- Las migraciones usan uuid_generate_v4(), que requiere esta extensión.
-- Las migraciones "Init*" ya la crean por su cuenta (CREATE EXTENSION IF NOT
-- EXISTS), pero se deja también aquí para que las 3 bases por defecto la
-- tengan lista desde el primer arranque del contenedor, sin depender del
-- orden en que corran las migraciones.
\c epsas_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c horarios_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c chronogest_master_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
