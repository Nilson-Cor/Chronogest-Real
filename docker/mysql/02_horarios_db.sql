-- =====================================================
-- BASE DE DATOS: horarios_db
-- API: API HORARIOS (Puerto 3001)
-- Descripción: Sistema de gestión de horarios académicos
-- =====================================================

-- Crear base de datos
DROP DATABASE IF EXISTS horarios_db;
CREATE DATABASE horarios_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE horarios_db;

-- =====================================================
-- TABLA PRINCIPAL: HORARIOS
-- =====================================================

CREATE TABLE horarios (
  id_horario INT PRIMARY KEY AUTO_INCREMENT,
  id_curso INT NOT NULL COMMENT 'FK a cursos (API Principal)',
  id_ambiente INT NOT NULL COMMENT 'FK a ambientes (API Principal)',
  dia ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado ENUM('activo', 'inactivo', 'cancelado') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Validación: hora_fin debe ser mayor que hora_inicio
  CONSTRAINT chk_horas CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ASIGNACIONES DE INSTRUCTORES
-- =====================================================

CREATE TABLE asignaciones_instructores (
  id_asignacion_instructor INT PRIMARY KEY AUTO_INCREMENT,
  id_horario INT NOT NULL,
  id_persona INT NOT NULL COMMENT 'FK a personas (API Principal, cargo=instructor)',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NULL,
  horas DECIMAL(5,2) NOT NULL COMMENT 'Horas asignadas al instructor',
  observaciones TEXT NULL,
  estado ENUM('activo', 'inactivo', 'finalizado') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_horario) REFERENCES horarios(id_horario) ON DELETE CASCADE,
  
  -- Validación: horas debe ser positiva
  CONSTRAINT chk_horas_positivas CHECK (horas > 0),
  
  -- Evitar duplicados: mismo instructor en mismo horario con fechas solapadas
  UNIQUE KEY unique_instructor_horario_activo (id_horario, id_persona, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ASIGNACIONES DE APRENDICES
-- =====================================================

CREATE TABLE asignaciones_aprendices (
  id_asignacion_aprendiz INT PRIMARY KEY AUTO_INCREMENT,
  id_horario INT NOT NULL,
  id_persona INT NOT NULL COMMENT 'FK a personas (API Principal, cargo=aprendiz)',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NULL,
  observaciones TEXT NULL,
  estado ENUM('activo', 'inactivo', 'retirado', 'finalizado') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_horario) REFERENCES horarios(id_horario) ON DELETE CASCADE,
  
  -- Evitar duplicados: mismo aprendiz en mismo horario
  UNIQUE KEY unique_aprendiz_horario (id_horario, id_persona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- =====================================================

-- Índices en horarios
CREATE INDEX idx_horarios_curso ON horarios(id_curso);
CREATE INDEX idx_horarios_ambiente ON horarios(id_ambiente);
CREATE INDEX idx_horarios_dia ON horarios(dia);
CREATE INDEX idx_horarios_estado ON horarios(estado);
CREATE INDEX idx_horarios_curso_dia ON horarios(id_curso, dia);

-- Índices en asignaciones_instructores
CREATE INDEX idx_asig_inst_horario ON asignaciones_instructores(id_horario);
CREATE INDEX idx_asig_inst_persona ON asignaciones_instructores(id_persona);
CREATE INDEX idx_asig_inst_estado ON asignaciones_instructores(estado);
CREATE INDEX idx_asig_inst_fechas ON asignaciones_instructores(fecha_inicio, fecha_fin);

-- Índices en asignaciones_aprendices
CREATE INDEX idx_asig_apren_horario ON asignaciones_aprendices(id_horario);
CREATE INDEX idx_asig_apren_persona ON asignaciones_aprendices(id_persona);
CREATE INDEX idx_asig_apren_estado ON asignaciones_aprendices(estado);
CREATE INDEX idx_asig_apren_fechas ON asignaciones_aprendices(fecha_inicio, fecha_fin);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: Horarios con conteo de asignaciones
CREATE VIEW vista_horarios_resumen AS
SELECT 
  h.id_horario,
  h.id_curso,
  h.id_ambiente,
  h.dia,
  h.hora_inicio,
  h.hora_fin,
  h.estado,
  COUNT(DISTINCT ai.id_asignacion_instructor) as total_instructores,
  COUNT(DISTINCT aa.id_asignacion_aprendiz) as total_aprendices
FROM horarios h
LEFT JOIN asignaciones_instructores ai ON h.id_horario = ai.id_horario AND ai.estado = 'activo'
LEFT JOIN asignaciones_aprendices aa ON h.id_horario = aa.id_horario AND aa.estado = 'activo'
GROUP BY h.id_horario;

