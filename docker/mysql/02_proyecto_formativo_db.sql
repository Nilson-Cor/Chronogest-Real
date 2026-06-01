

-- Crear base de datos
DROP DATABASE IF EXISTS proyecto_formativo_db;
CREATE DATABASE proyecto_formativo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE proyecto_formativo_db;



-- Tabla: departamentos
CREATE TABLE departamentos (
  id_departamento INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: municipios
CREATE TABLE municipios (
  id_municipio INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  departamento_numerico INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (departamento_numerico) REFERENCES departamentos(id_departamento) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Tabla: centro_formacion
CREATE TABLE centro_formacion (
  id_centro INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: sedes
CREATE TABLE sedes (
  id_sede INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  centro_formacion_numerico INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (centro_formacion_numerico) REFERENCES centro_formacion(id_centro) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: areas
CREATE TABLE areas (
  id_area INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  sede INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sede) REFERENCES sedes(id_sede) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: ambientes
CREATE TABLE ambientes (
  id_ambiente INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  municipio INT NOT NULL,
  sede INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (municipio) REFERENCES municipios(id_municipio) ON DELETE RESTRICT,
  FOREIGN KEY (sede) REFERENCES sedes(id_sede) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Tabla: personas
CREATE TABLE personas (
  id_persona INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  apellido VARCHAR(50) NOT NULL,
  identificacion BIGINT NOT NULL UNIQUE,
  direccion VARCHAR(50),
  telefono VARCHAR(20),
  genero ENUM('masculino', 'femenino', 'otro') NOT NULL,
  municipio INT NOT NULL,
  cargo ENUM('instructor', 'administrador', 'aprendiz', 'coordinador') NOT NULL,
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (municipio) REFERENCES municipios(id_municipio) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Tabla: aplicativos
CREATE TABLE aplicativos (
  id_aplicativo INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: modulos
CREATE TABLE modulos (
  id_modulo INT PRIMARY KEY AUTO_INCREMENT,
  aplicativo INT NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aplicativo) REFERENCES aplicativos(id_aplicativo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: servicios
CREATE TABLE servicios (
  id_servicio INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  url VARCHAR(100) NOT NULL,
  modulo INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (modulo) REFERENCES modulos(id_modulo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: roles
CREATE TABLE roles (
  id_rol INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(20) NOT NULL,
  aplicativo_numerico INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aplicativo_numerico) REFERENCES aplicativos(id_aplicativo) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: usuarios
CREATE TABLE usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  persona INT NOT NULL,
  aplicativo_numerico INT NOT NULL,
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (persona) REFERENCES personas(id_persona) ON DELETE CASCADE,
  FOREIGN KEY (aplicativo_numerico) REFERENCES aplicativos(id_aplicativo) ON DELETE RESTRICT,
  UNIQUE KEY unique_persona_aplicativo (persona, aplicativo_numerico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: credenciales
CREATE TABLE credenciales (
  id_credencial INT PRIMARY KEY AUTO_INCREMENT,
  login VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol INT NOT NULL,
  usuario INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol) REFERENCES roles(id_rol) ON DELETE RESTRICT,
  FOREIGN KEY (usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: permisos
CREATE TABLE permisos (
  id_permiso INT PRIMARY KEY AUTO_INCREMENT,
  usuario INT NOT NULL,
  rol INT NOT NULL,
  servicio INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (rol) REFERENCES roles(id_rol) ON DELETE CASCADE,
  FOREIGN KEY (servicio) REFERENCES servicios(id_servicio) ON DELETE CASCADE,
  UNIQUE KEY unique_usuario_rol_servicio (usuario, rol, servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: accesos
CREATE TABLE accesos (
  id_acceso INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(500) NOT NULL,
  usuario INT NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_salida DATETIME NULL,
  estado ENUM('activo', 'inactivo', 'expirado') DEFAULT 'activo',
  FOREIGN KEY (usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Tabla: programas
CREATE TABLE programas (
  id_programa INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  tipo ENUM('tecnologo', 'tecnico', 'especializacion', 'curso_corto') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: cursos (fichas)
CREATE TABLE cursos (
  id_curso INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fta_lectiva DATE,
  area INT NOT NULL,
  programa INT NOT NULL,
  lider INT NULL,
  estado ENUM('activo', 'finalizado', 'cancelado') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (area) REFERENCES areas(id_area) ON DELETE RESTRICT,
  FOREIGN KEY (programa) REFERENCES programas(id_programa) ON DELETE RESTRICT,
  FOREIGN KEY (lider) REFERENCES personas(id_persona) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: matriculas
CREATE TABLE matriculas (
  id_matricula INT PRIMARY KEY AUTO_INCREMENT,
  persona INT NOT NULL,
  curso INT NOT NULL,
  estado ENUM('activo', 'retirado', 'graduado', 'cancelado') DEFAULT 'activo',
  fecha_matricula DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (persona) REFERENCES personas(id_persona) ON DELETE CASCADE,
  FOREIGN KEY (curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
  UNIQUE KEY unique_persona_curso (persona, curso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE INDEX idx_personas_cargo ON personas(cargo);
CREATE INDEX idx_personas_estado ON personas(estado);
CREATE INDEX idx_personas_identificacion ON personas(identificacion);
CREATE INDEX idx_usuarios_persona ON usuarios(persona);
CREATE INDEX idx_credenciales_login ON credenciales(login);
CREATE INDEX idx_cursos_codigo ON cursos(codigo);
CREATE INDEX idx_cursos_programa ON cursos(programa);
CREATE INDEX idx_matriculas_persona ON matriculas(persona);
CREATE INDEX idx_matriculas_curso ON matriculas(curso);
CREATE INDEX idx_accesos_usuario ON accesos(usuario);
CREATE INDEX idx_accesos_token ON accesos(token);

