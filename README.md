# ChronoGest 2.1

Sistema de gestión de horarios para el SENA — Centros de Formación.  
Permite administrar instructores, fichas, ambientes y horarios en tiempo real.

**Stack:** Angular 21 · NestJS 11 · PostgreSQL 16 · Redis 7 · BullMQ · Docker

---

## Tabla de contenidos

1. [Requisitos](#1-requisitos)
2. [Inicio rápido con Docker](#2-inicio-rápido-con-docker-recomendado)
3. [Migrar datos existentes](#3-migrar-datos-existentes)
4. [Levantar el frontend](#4-levantar-el-frontend)
5. [Primer uso — configuración inicial](#5-primer-uso--configuración-inicial)
6. [Desarrollo local sin Docker](#6-desarrollo-local-sin-docker)
7. [Despliegue en producción](#7-despliegue-en-producción)
8. [Solución de problemas](#8-solución-de-problemas)
9. [Arquitectura del sistema](#9-arquitectura-del-sistema)

---

## 1. Requisitos

Solo necesitas instalar **Docker Desktop**. Nada más.

| Herramienta | Descarga |
|---|---|
| Docker Desktop | https://www.docker.com/products/docker-desktop |

> **Windows:** durante la instalación de Docker, acepta la opción de habilitar WSL 2.  
> **Mac / Linux:** la instalación estándar es suficiente.

Para verificar que Docker quedó instalado, abre una terminal y ejecuta:

```bash
docker --version
```

Debe mostrar algo como `Docker version 27.x.x`.

---

## 2. Inicio rápido con Docker (recomendado)

### Paso 1 — Clonar o descargar el proyecto

```bash
git clone https://github.com/tu-usuario/Chronogest-2.1-V.git
cd Chronogest-2.1-V
```

> Si descargaste el ZIP, descomprímelo y entra a la carpeta `Chronogest-2.1-V`.

### Paso 2 — Levantar todos los servicios

```bash
docker compose up -d
```

Este comando descarga las imágenes necesarias y levanta:

| Servicio | URL / Puerto |
|---|---|
| Backend API (NestJS) | http://localhost:3000 |
| Base de datos (PostgreSQL) | localhost:5435 |
| Cola de tareas (Redis) | localhost:6379 |

La primera vez puede tardar **3–5 minutos** mientras descarga las imágenes de Docker.

### Paso 3 — Verificar que todo esté corriendo

```bash
docker compose ps
```

Todos los servicios deben aparecer como `running` o `healthy`.

```
NAME                    STATUS
chronogest_postgres     running (healthy)
chronogest_backend      running
chronogest_redis        running (healthy)
```

Si el backend aparece como `restarting`, espera 30 segundos y vuelve a verificar — necesita que PostgreSQL esté listo primero.

### Paso 4 — Abrir el sistema

El sistema completo incluye también el frontend Angular. Puedes levantarlo de dos formas:

**Opción A — Frontend en Docker (más fácil):**
```bash
docker compose --profile full up -d
```
Luego abrir: **http://localhost:4200**

**Opción B — Frontend local (recomendado en desarrollo):**

Ver la sección [Levantar el frontend](#4-levantar-el-frontend).

---

### Comandos esenciales

```bash
# Iniciar todos los servicios
docker compose up -d

# Detener (los datos se conservan)
docker compose down

# Ver logs del backend en tiempo real
docker compose logs -f backend

# Reiniciar solo el backend
docker compose restart backend

# Reconstruir después de cambios en el código
docker compose up -d --build backend

# Borrar todo incluidos los datos (reset completo)
docker compose down -v
```

---

## 3. Migrar datos existentes

### Si ya tienes datos en una instalación anterior de ChronoGest

**En el equipo con los datos actuales**, haz el respaldo:

```bash
# Respaldar base de datos principal (epsas_db)
docker exec chronogest_postgres pg_dump -U postgres epsas_db > backup_epsas.sql

# Respaldar base de datos de horarios (horarios_db)
docker exec chronogest_postgres pg_dump -U postgres horarios_db > backup_horarios.sql
```

> Guarda los archivos `backup_epsas.sql` y `backup_horarios.sql` en un lugar seguro.

---

**En el equipo nuevo** (o después de un reset), restaura los datos:

```bash
# 1. Levanta los servicios primero
docker compose up -d

# 2. Espera que PostgreSQL esté listo (30 segundos)

# 3. Restaurar base de datos principal
cat backup_epsas.sql | docker exec -i chronogest_postgres psql -U postgres -d epsas_db

# 4. Restaurar base de datos de horarios
cat backup_horarios.sql | docker exec -i chronogest_postgres psql -U postgres -d horarios_db

# 5. Reiniciar el backend para que detecte los datos
docker compose restart backend
```

> **Windows PowerShell:** reemplaza `cat archivo.sql |` por `Get-Content archivo.sql |`

```powershell
# Windows PowerShell
Get-Content backup_epsas.sql    | docker exec -i chronogest_postgres psql -U postgres -d epsas_db
Get-Content backup_horarios.sql | docker exec -i chronogest_postgres psql -U postgres -d horarios_db
```

### Acceder directamente a la base de datos

```bash
# Abrir consola de PostgreSQL
docker exec -it chronogest_postgres psql -U postgres

# Dentro de la consola:
\l                    -- listar bases de datos
\c epsas_db           -- conectarse a epsas_db
\dt                   -- listar tablas
SELECT * FROM personas LIMIT 5;
\q                    -- salir
```

---

## 4. Levantar el frontend

Necesitas tener **Node.js 20 LTS** instalado: https://nodejs.org

```bash
# Entrar a la carpeta del frontend
cd frontend

# Instalar dependencias (solo la primera vez, tarda 1-2 minutos)
npm install

# Iniciar el servidor de desarrollo
npm start
```

Abrir en el navegador: **http://localhost:4200**

El frontend se conecta automáticamente al backend en `http://localhost:3000`.

---

## 5. Primer uso — configuración inicial

Al abrir el sistema por primera vez con la base de datos vacía, sigue este orden.

### Paso 1 — Crear la cuenta de administrador

1. Abre http://localhost:4200
2. Haz clic en **"Registrarse"**
3. Cuando el sistema pida el **PIN de registro**, escribe: **`1234`**
4. Selecciona el rol **Administrador**
5. Completa tus datos y crea la cuenta
6. Inicia sesión con el correo y contraseña que registraste

> Para cambiar el PIN de registro: ir a **Configuración → Sistema → PIN de registro**

---

### Paso 2 — Configurar los Ambientes (salones)

Los ambientes son los espacios físicos donde se dictan las clases.

**Menú:** `Formativo → Ambientes`

Por cada ambiente ingresa:
- Nombre (ej: `Aula 101`, `Lab Sistemas A`)
- Tipo (`Aula`, `Laboratorio`, `Taller`, `Auditorio`)
- Capacidad (número de puestos)

> Sin ambientes no se pueden asignar horarios.

---

### Paso 3 — Crear las Fichas de Formación

Las fichas son los grupos de aprendices.

**Menú:** `Formativo → Fichas`

Por cada ficha ingresa:
- Código de ficha (número SENA, ej: `2987654`)
- Programa de formación
- Área
- Estado (`activo`)

---

### Paso 4 — Registrar los Instructores

Tienes dos opciones:

**Opción A — El instructor se registra solo:**
- El instructor abre http://localhost:4200
- Clic en "Registrarse" → PIN `1234` → Rol **Instructor**

**Opción B — El administrador los crea:**
- Menú: `Usuarios → Instructores` → botón **Nuevo**

Configuraciones especiales por instructor:
| Opción | Descripción |
|---|---|
| **Líder de área** | El instructor dirige un área. Se activa en su perfil. |
| **Transversal** | El instructor rota entre fichas. Elige su ambiente antes de cada clase. |

---

### Paso 5 — Crear Horarios

**Menú:** `Horarios → Nuevo horario`

El asistente pide:
- Días de la semana activos para este horario
- Jornada (`Mañana 7:00–12:00` / `Tarde 13:00–17:00` / `Noche 18:00–20:00`)
- Instructor asignado
- Ficha asignada
- Ambiente asignado

---

### Paso 6 — Activar un horario (iniciar clase)

Cuando comienza la clase:
1. Ir a **Horarios**
2. Buscar el horario del instructor
3. Hacer clic en **▶ Play**
4. Seleccionar el ambiente donde se dicta
5. El horario queda **Activo** y visible para todos en tiempo real

Los horarios se cierran automáticamente al llegar su hora de fin.

---

### Flujo completo de configuración inicial

```
① Crear cuenta Admin (PIN: 1234)
        ↓
② Crear Ambientes (salones)
        ↓
③ Crear Fichas (grupos de aprendices)
        ↓
④ Registrar Instructores
        ↓
⑤ Crear Horarios (instructor + ficha + ambiente + jornada)
        ↓
⑥ ✅ Sistema listo para operar
```

---

## 6. Desarrollo local sin Docker

Si necesitas trabajar en el código sin Docker, sigue estos pasos.

### Requisitos adicionales

| Herramienta | Versión | Descarga |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| PostgreSQL | 14+ | https://www.postgresql.org/download |
| Redis | 7+ | https://redis.io/download |

### Configurar el backend

```bash
cd backend-epsas

# 1. Copiar variables de entorno
cp .env.example .env

# 2. Editar .env con tus datos de PostgreSQL y Redis local
# (el archivo ya tiene valores de ejemplo que funcionan con Docker)

# 3. Instalar dependencias
npm install

# 4. Iniciar en modo desarrollo (hot-reload)
npm run start:dev
```

La API queda disponible en: **http://localhost:3000**

### Migraciones (solo en producción)

En desarrollo, TypeORM sincroniza el esquema automáticamente.  
En producción (`NODE_ENV=production`) debes ejecutar las migraciones manualmente:

```bash
cd backend-epsas

# Generar migración desde el estado actual de las entidades
npm run migration:generate -- src/database/migrations/NombreDeLaMigracion

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir la última migración (si algo salió mal)
npm run migration:revert

# Lo mismo para la base de horarios
npm run migration:generate:horarios -- src/database/migrations-horarios/NombreDeLaMigracion
npm run migration:run:horarios
```

### Configurar el frontend

```bash
cd frontend
npm install
npm start
```

---

## 7. Despliegue en producción

### Variables de entorno requeridas

Para producción **debes** definir estas variables (sin las de ejemplo):

```env
NODE_ENV=production

DB_HOST=tu-servidor-postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=contraseña-segura-aqui     # ← cambiar obligatoriamente
DB_NAME=epsas_db

HORARIOS_DB_HOST=tu-servidor-postgres
HORARIOS_DB_NAME=horarios_db

REDIS_HOST=tu-servidor-redis
REDIS_PORT=6379
REDIS_PASSWORD=contraseña-redis-aqui

JWT_SECRET=cadena-aleatoria-minimo-32-caracteres  # ← cambiar obligatoriamente
```

> Nunca uses los valores de ejemplo (`chronogest2024`, etc.) en producción.

### Build de producción

```bash
# Backend
cd backend-epsas
npm run build
NODE_ENV=production node dist/main

# Frontend (genera archivos estáticos)
cd frontend
npm run build
# Los archivos quedan en frontend/dist/frontend/browser/
# Sirve esa carpeta con nginx, Apache, o cualquier servidor web estático
```

### Docker en producción

```bash
# Construir imagen de producción del backend
docker build --target prod -t chronogest-backend ./backend-epsas

# Construir imagen de producción del frontend (nginx incluido)
docker build --target prod -t chronogest-frontend ./frontend
```

### Ejecutar migraciones antes de desplegar

Con `NODE_ENV=production` el esquema **no** se sincroniza automáticamente. Debes ejecutar migraciones antes de cada despliegue que cambie el modelo de datos:

```bash
cd backend-epsas
npm run migration:run
npm run migration:run:horarios
```

---

## 8. Solución de problemas

### El backend no inicia

```bash
# Ver los logs completos
docker compose logs backend

# Esperar que PostgreSQL esté listo y reiniciar
docker compose restart backend
```

**Causa común:** el backend intenta conectarse antes de que PostgreSQL esté listo. Espera 30 segundos después de `docker compose up -d` y reinicia el backend.

---

### Error `DB_PASSWORD is required`

El backend exige que `DB_PASSWORD` esté definido. Verifica:

```bash
# Verificar que la variable llegue al contenedor
docker exec chronogest_backend printenv DB_PASSWORD
```

Si no aparece, revisa el archivo `docker-compose.yml` — la variable debe estar en la sección `environment` del servicio `backend`.

---

### Error `JWT_SECRET is required`

Similar al anterior. Verifica:
```bash
docker exec chronogest_backend printenv JWT_SECRET
```

---

### El frontend muestra "Error de conexión"

1. Verifica que el backend esté corriendo: `docker compose ps`
2. Prueba el API directamente: http://localhost:3000/api (debe responder)
3. Revisa los logs: `docker compose logs -f backend`

---

### Tablas no existen (error en producción)

En `NODE_ENV=production` el esquema no se crea automáticamente. Ejecuta:

```bash
npm run migration:run
npm run migration:run:horarios
```

---

### Puerto ya está en uso

Si `5435`, `3000` o `6379` están ocupados por otro programa:

Edita `docker-compose.yml` y cambia el puerto del host (el número de la izquierda):
```yaml
ports:
  - "5436:5432"   # cambiar 5435 → 5436 (o el disponible)
```

---

### Reset completo (borrar todo y empezar de cero)

> ⚠️ Esto elimina **todos los datos** de la base de datos.

```bash
docker compose down -v
docker compose up -d
```

---

### Hacer backup antes de cualquier cambio importante

```bash
# Backup epsas_db
docker exec chronogest_postgres pg_dump -U postgres epsas_db > backup_$(date +%Y%m%d_%H%M)_epsas.sql

# Backup horarios_db
docker exec chronogest_postgres pg_dump -U postgres horarios_db > backup_$(date +%Y%m%d_%H%M)_horarios.sql
```

---

## 9. Arquitectura del sistema

```
Chronogest-2.1-V/
├── frontend/                 Angular 21 — interfaz de usuario
│   └── src/app/
│       ├── core/             guardias, servicios, modelos, interceptores
│       ├── features/         módulos por rol (admin, instructor, aprendiz)
│       └── shared/           componentes reutilizables
│
├── backend-epsas/            NestJS 11 — API REST
│   └── src/
│       ├── <modulo>/         arquitectura hexagonal por módulo
│       │   ├── domain/       entidades e interfaces puras
│       │   ├── application/  servicios y DTOs
│       │   └── infrastructure/ controladores y entidades TypeORM
│       ├── auth/             JWT + Passport
│       ├── queue/            BullMQ — procesamiento asíncrono
│       ├── tenant/           aislamiento multitenant
│       ├── rebac/            control de acceso basado en relaciones
│       └── database/         DataSource para migraciones TypeORM
│
├── docker-compose.yml        orquestador de todos los servicios
└── docker/
    └── init-postgres.sql     crea horarios_db en el primer arranque
```

### Servicios y puertos

| Servicio | Puerto local | Descripción |
|---|---|---|
| Frontend Angular | 4200 | Interfaz web |
| Backend NestJS | 3000 | API REST (`/api`) |
| PostgreSQL | 5435 | Base de datos principal |
| Redis | 6379 | Cola de tareas BullMQ |

### Bases de datos

| Base de datos | Contenido |
|---|---|
| `epsas_db` | Usuarios, roles, personas, fichas, ambientes, accesos, notificaciones |
| `horarios_db` | Horarios, competencias, solicitudes de cambio, eventos, configuración |

### Roles de usuario

| Rol | Acceso |
|---|---|
| **Administrador** | Acceso completo: gestiona todo el sistema |
| **Instructor** | Ve sus horarios, registra competencias, crea solicitudes de cambio |
| **Aprendiz** | Ve los horarios y eventos de su ficha |

### Autenticación

- JWT con expiración de 12 horas
- Cookie `httpOnly` en producción
- Guard global — todas las rutas requieren autenticación excepto las marcadas `@Public()`

---

*ChronoGest 2.1-V — SENA Centro de Formación*
