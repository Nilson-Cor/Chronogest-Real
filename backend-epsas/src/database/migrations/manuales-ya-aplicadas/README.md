# Migraciones manuales ya aplicadas

Estos 3 archivos `.sql` **no** forman parte del runner de TypeORM (`npm run
migration:run`) — TypeORM solo ejecuta migraciones `.ts` listadas en el array
`migrations: [...]` de cada `DataSource` (`src/database/data-source*.ts`).
Nunca estuvieron referenciados ahí.

Se aplicaron manualmente contra `epsas_db`/`horarios_db` durante el
desarrollo, antes de que existiera `InitEpsas`/`InitHorarios` (las
migraciones "Init" actuales ya reflejan el esquema resultante — por ejemplo
`ambientes` ya incluye la columna `estado` y `asignacion_horarios` ya existe
como tabla propia). Se conservan aquí solo como registro histórico de esos
cambios de esquema, no como pasos pendientes de ejecutar.

- `001_merge_ubicaciones_to_ambientes.sql` / `merge_ubicaciones_into_ambientes.sql`
  — fusión de la tabla `ubicaciones` dentro de `ambientes`.
- `002_restructure_horarios.sql` — separación de `horarios` (plantilla) y
  `asignacion_horarios` (asignación concreta), migración de `competencias` y
  `solicitudes_cambio` a referenciar `asignacion_id`.

Si se aprovisiona un tenant nuevo (`POST /api/admin/centros-tenant`), estos
scripts **no se ejecutan ni hace falta ejecutarlos** — la migración `InitEpsas`
y `InitHorarios` ya crean el esquema final directamente.
