/**
 * Respalda MASTER_DB + las bases (epsas_db, horarios_db) de cada tenant activo.
 * Requiere `pg_dump` disponible en el PATH (viene con cualquier instalación
 * de PostgreSQL, incluida la imagen oficial `postgres` usada en Docker).
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/backup-databases.ts
 *   npx ts-node -r tsconfig-paths/register scripts/backup-databases.ts --out=/ruta/de/respaldo
 *
 * No programa nada por sí solo — este script solo genera los .sql. Para que
 * corra periódicamente hay que invocarlo desde cron/Task Scheduler o un
 * servicio de docker-compose, según dónde se despliegue.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { MasterDataSource } from '../src/database/master-datasource';
import { CentroTenant } from '../src/centro-tenant-admin/infrastructure/entities/centro-tenant.entity';

const execFileAsync = promisify(execFile);

interface Objetivo {
  etiqueta: string;
  host: string;
  port: number;
  database: string;
}

async function volcar(obj: Objetivo, outDir: string, timestamp: string): Promise<void> {
  const archivo = path.join(outDir, `${timestamp}_${obj.etiqueta}.sql`);
  const args = [
    '-h', obj.host,
    '-p', String(obj.port),
    '-U', process.env.DB_USERNAME ?? 'postgres',
    '-d', obj.database,
    '-F', 'p', // plain SQL — restaurable con: psql -d <db> -f archivo.sql
    '-f', archivo,
  ];
  await execFileAsync('pg_dump', args, {
    env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD ?? '' },
  });
  console.log(`  ✔ ${obj.etiqueta} -> ${archivo}`);
}

async function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outDir = outArg ? outArg.split('=')[1] : path.join(process.cwd(), '..', 'backups');
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  console.log('── Respaldo de bases de datos ────────────────────────\n');

  let fallos = 0;

  // 1. MASTER_DB
  console.log('1. MASTER_DB...');
  try {
    await volcar(
      {
        etiqueta: 'master_db',
        host: process.env.MASTER_DB_HOST ?? 'localhost',
        port: Number(process.env.MASTER_DB_PORT ?? 5435),
        database: process.env.MASTER_DB_NAME ?? 'chronogest_master_db',
      },
      outDir,
      timestamp,
    );
  } catch (err: any) {
    fallos++;
    console.error(`  ✘ master_db: ${err.message}`);
  }

  // 2. Tenants activos
  await MasterDataSource.initialize();
  const tenants = await MasterDataSource.getRepository(CentroTenant).find();
  await MasterDataSource.destroy();

  const activos = tenants.filter((t) => t.estado === 'activo');
  console.log(`\n2. ${activos.length} tenant(s) activo(s):\n`);

  for (const t of activos) {
    console.log(`Tenant: ${t.nombre} (slug: ${t.slug})`);
    try {
      await volcar(
        {
          etiqueta: `${t.slug}_epsas`,
          host: t.epsasDbHost ?? process.env.DB_HOST ?? 'localhost',
          port: t.epsasDbPort ?? Number(process.env.DB_PORT ?? 5435),
          database: t.epsasDbName,
        },
        outDir,
        timestamp,
      );
      await volcar(
        {
          etiqueta: `${t.slug}_horarios`,
          host: t.horariosDbHost ?? process.env.HORARIOS_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
          port: t.horariosDbPort ?? Number(process.env.HORARIOS_DB_PORT ?? process.env.DB_PORT ?? 5435),
          database: t.horariosDbName,
        },
        outDir,
        timestamp,
      );
    } catch (err: any) {
      fallos++;
      console.error(`  ✘ ${t.slug}: ${err.message}`);
    }
    console.log('');
  }

  console.log('─'.repeat(60));
  if (fallos === 0) {
    console.log(`Respaldo completo en: ${outDir}`);
  } else {
    console.log(`${fallos} respaldo(s) con errores — revisar arriba.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Error en el respaldo:', err);
  process.exitCode = 1;
});
