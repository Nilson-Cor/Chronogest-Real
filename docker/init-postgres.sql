-- Script de inicialización de PostgreSQL
-- Se ejecuta automáticamente la primera vez que se crea el contenedor
-- Crea horarios_db si no existe (epsas_db la crea el propio Docker con POSTGRES_DB)

SELECT 'CREATE DATABASE horarios_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'horarios_db')\gexec
