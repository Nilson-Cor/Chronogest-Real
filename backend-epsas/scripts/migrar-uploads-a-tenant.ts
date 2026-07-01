/**
 * Migra los archivos subidos ANTES de que existiera aislamiento por tenant
 * (guardados como /uploads/adjuntos/<archivo>, compartidos entre todos los
 * Centros de Formación) hacia su carpeta propia /uploads/<slug>/adjuntos/,
 * y actualiza las columnas que guardan esa URL:
 *   - epsas_db.personas.foto_perfil
 *   - horarios_db.solicitudes_cambio.archivo_adjunto_url
 *
 * Solo mueve un archivo si está referenciado por la BD de ese tenant — los
 * archivos de uploads/adjuntos/ que no aparezcan en NINGÚN tenant se dejan
 * intactos y se reportan al final para revisión manual (no se borran).
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/migrar-uploads-a-tenant.ts
 *   npx ts-node -r tsconfig-paths/register scripts/migrar-uploads-a-tenant.ts --dry-run
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { MasterDataSource } from '../src/database/master-datasource';
import { CentroTenant } from '../src/centro-tenant-admin/infrastructure/entities/centro-tenant.entity';

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const LEGACY_ADJUNTOS_DIR = path.join(UPLOADS_DIR, 'adjuntos');
const PREFIJO_LEGACY = '/uploads/adjuntos/';

function nombreDeArchivoDesdeUrl(url: string): string | null {
  if (!url || !url.startsWith(PREFIJO_LEGACY)) return null;
  const nombre = url.slice(PREFIJO_LEGACY.length);
  // Sin subcarpetas ni "..": evita que una URL manipulada mueva/lea fuera de uploads/adjuntos
  if (!nombre || nombre.includes('/') || nombre.includes('..')) return null;
  return nombre;
}

function moverArchivo(nombre: string, slug: string): boolean {
  const origen = path.join(LEGACY_ADJUNTOS_DIR, nombre);
  if (!fs.existsSync(origen)) return false;

  const destinoDir = path.join(UPLOADS_DIR, slug, 'adjuntos');
  const destino = path.join(destinoDir, nombre);

  if (DRY_RUN) return true;

  fs.mkdirSync(destinoDir, { recursive: true });
  fs.renameSync(origen, destino);
  return true;
}

async function migrarPersonas(epsasDs: DataSource, slug: string): Promise<{ migradas: number; sinArchivo: number }> {
  const filas: { idPersona: string; foto_perfil: string }[] = await epsasDs.query(
    `SELECT "idPersona", foto_perfil FROM personas WHERE foto_perfil LIKE $1`,
    [`${PREFIJO_LEGACY}%`],
  );

  let migradas = 0;
  let sinArchivo = 0;

  for (const fila of filas) {
    const nombre = nombreDeArchivoDesdeUrl(fila.foto_perfil);
    if (!nombre) continue;

    if (!moverArchivo(nombre, slug)) {
      sinArchivo++;
      console.warn(`    ⚠ persona ${fila.idPersona}: archivo no encontrado en disco (${fila.foto_perfil})`);
      continue;
    }

    const nuevaUrl = `/uploads/${slug}/adjuntos/${nombre}`;
    if (!DRY_RUN) {
      await epsasDs.query(`UPDATE personas SET foto_perfil = $1 WHERE "idPersona" = $2`, [nuevaUrl, fila.idPersona]);
    }
    migradas++;
    console.log(`    ✔ persona ${fila.idPersona}: ${fila.foto_perfil} -> ${nuevaUrl}`);
  }

  return { migradas, sinArchivo };
}

async function migrarSolicitudes(horariosDs: DataSource, slug: string): Promise<{ migradas: number; sinArchivo: number }> {
  const filas: { id: string; archivo_adjunto_url: string }[] = await horariosDs.query(
    `SELECT id, archivo_adjunto_url FROM solicitudes_cambio WHERE archivo_adjunto_url LIKE $1`,
    [`${PREFIJO_LEGACY}%`],
  );

  let migradas = 0;
  let sinArchivo = 0;

  for (const fila of filas) {
    const nombre = nombreDeArchivoDesdeUrl(fila.archivo_adjunto_url);
    if (!nombre) continue;

    if (!moverArchivo(nombre, slug)) {
      sinArchivo++;
      console.warn(`    ⚠ solicitud ${fila.id}: archivo no encontrado en disco (${fila.archivo_adjunto_url})`);
      continue;
    }

    const nuevaUrl = `/uploads/${slug}/adjuntos/${nombre}`;
    if (!DRY_RUN) {
      await horariosDs.query(`UPDATE solicitudes_cambio SET archivo_adjunto_url = $1 WHERE id = $2`, [nuevaUrl, fila.id]);
    }
    migradas++;
    console.log(`    ✔ solicitud ${fila.id}: ${fila.archivo_adjunto_url} -> ${nuevaUrl}`);
  }

  return { migradas, sinArchivo };
}

async function main() {
  console.log('── Migración de uploads a carpetas por tenant ─────────');
  if (DRY_RUN) console.log('(--dry-run: no se mueve ni actualiza nada, solo se reporta)\n');

  if (!fs.existsSync(LEGACY_ADJUNTOS_DIR)) {
    console.log('No existe uploads/adjuntos/ — nada que migrar.');
    return;
  }

  await MasterDataSource.initialize();
  const tenants = await MasterDataSource.getRepository(CentroTenant).find();
  await MasterDataSource.destroy();

  const activos = tenants.filter((t) => t.estado === 'activo');
  console.log(`\n${activos.length} tenant(s) activo(s) a revisar:\n`);

  let totalMigradas = 0;
  let totalSinArchivo = 0;

  for (const t of activos) {
    console.log(`Tenant: ${t.nombre} (slug: ${t.slug})`);

    const epsasDs = new DataSource({
      type: 'postgres',
      host: t.epsasDbHost ?? process.env.DB_HOST ?? 'localhost',
      port: t.epsasDbPort ?? Number(process.env.DB_PORT ?? 5435),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: t.epsasDbName,
    });
    const horariosDs = new DataSource({
      type: 'postgres',
      host: t.horariosDbHost ?? process.env.HORARIOS_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
      port: t.horariosDbPort ?? Number(process.env.HORARIOS_DB_PORT ?? process.env.DB_PORT ?? 5435),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: t.horariosDbName,
    });

    try {
      await epsasDs.initialize();
      await horariosDs.initialize();

      const personas = await migrarPersonas(epsasDs, t.slug);
      const solicitudes = await migrarSolicitudes(horariosDs, t.slug);

      totalMigradas += personas.migradas + solicitudes.migradas;
      totalSinArchivo += personas.sinArchivo + solicitudes.sinArchivo;

      if (personas.migradas + solicitudes.migradas === 0) {
        console.log('    (nada que migrar en este tenant)');
      }
    } catch (err: any) {
      console.error(`  ✘ ${t.slug}: ${err.message}`);
    } finally {
      if (epsasDs.isInitialized) await epsasDs.destroy();
      if (horariosDs.isInitialized) await horariosDs.destroy();
    }
    console.log('');
  }

  const restantes = fs.readdirSync(LEGACY_ADJUNTOS_DIR);
  console.log('─'.repeat(60));
  console.log(`Archivos migrados: ${totalMigradas}`);
  if (totalSinArchivo > 0) console.log(`Referencias en BD sin archivo en disco: ${totalSinArchivo}`);
  if (restantes.length > 0) {
    console.log(`\n${restantes.length} archivo(s) quedan en uploads/adjuntos/ sin ninguna referencia encontrada en los tenants activos (no se tocaron, revisar manualmente):`);
    restantes.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('\nuploads/adjuntos/ quedó vacía — se puede eliminar si se desea.');
  }
}

main().catch((err) => {
  console.error('Error en la migración:', err);
  process.exitCode = 1;
});
