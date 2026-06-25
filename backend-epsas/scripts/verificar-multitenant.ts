/**
 * Verifica la salud de la migración multi-tenant:
 *  1. Conecta a MASTER_DB y lista los Centros de Formación (tenants).
 *  2. Para cada tenant activo, intenta conectar a su epsas_db y horarios_db.
 *  3. Reporta OK/FAIL por tenant sin detener la ejecución ante un fallo.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/verificar-multitenant.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { MasterDataSource } from '../src/database/master-datasource';
import { CentroTenant } from '../src/centro-tenant-admin/infrastructure/entities/centro-tenant.entity';

async function probarConexion(nombre: string, dataSource: DataSource): Promise<boolean> {
  try {
    await dataSource.initialize();
    await dataSource.query('SELECT 1');
    await dataSource.destroy();
    console.log(`  ✔ ${nombre}: conexión OK`);
    return true;
  } catch (err: any) {
    console.error(`  ✘ ${nombre}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('── Verificación multi-tenant ──────────────────────────────\n');

  console.log('1. Conectando a MASTER_DB...');
  await MasterDataSource.initialize();
  console.log('   ✔ MASTER_DB conectada\n');

  const tenants = await MasterDataSource.getRepository(CentroTenant).find();
  await MasterDataSource.destroy();

  if (tenants.length === 0) {
    console.log('No hay Centros de Formación registrados. Crea uno con POST /api/admin/centros-tenant.');
    return;
  }

  console.log(`2. Encontrados ${tenants.length} tenant(s):\n`);

  let fallos = 0;

  for (const tenant of tenants) {
    console.log(`Tenant: ${tenant.nombre} (slug: ${tenant.slug}, estado: ${tenant.estado})`);

    if (tenant.estado !== 'activo') {
      console.log('  ⏭ inactivo — se omite\n');
      continue;
    }

    const epsasDS = new DataSource({
      type: 'postgres',
      host: tenant.epsasDbHost ?? process.env.DB_HOST,
      port: tenant.epsasDbPort ?? Number(process.env.DB_PORT ?? 5435),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenant.epsasDbName,
    });
    const horariosDS = new DataSource({
      type: 'postgres',
      host: tenant.horariosDbHost ?? process.env.HORARIOS_DB_HOST ?? process.env.DB_HOST,
      port: tenant.horariosDbPort ?? Number(process.env.HORARIOS_DB_PORT ?? process.env.DB_PORT ?? 5435),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenant.horariosDbName,
    });

    const okEpsas = await probarConexion(`epsas_db (${tenant.epsasDbName})`, epsasDS);
    const okHorarios = await probarConexion(`horarios_db (${tenant.horariosDbName})`, horariosDS);
    if (!okEpsas || !okHorarios) fallos++;
    console.log('');
  }

  console.log('────────────────────────────────────────────────────────────');
  if (fallos === 0) {
    console.log('Todos los tenants activos responden correctamente.');
  } else {
    console.log(`${fallos} tenant(s) con problemas de conexión — revisar arriba.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Error en la verificación:', err);
  process.exitCode = 1;
});
