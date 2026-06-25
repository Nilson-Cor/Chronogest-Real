-- Script de inicialización de PostgreSQL
-- Se ejecuta automáticamente la primera vez que se crea el contenedor
-- Crea horarios_db y chronogest_master_db si no existen
-- (epsas_db la crea el propio Docker con la variable POSTGRES_DB)

SELECT 'CREATE DATABASE horarios_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'horarios_db')\gexec

SELECT 'CREATE DATABASE chronogest_master_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chronogest_master_db')\gexec
