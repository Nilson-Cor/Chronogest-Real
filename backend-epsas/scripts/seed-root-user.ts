/**
 * Crea (o actualiza la contraseña de) el usuario root en MASTER_DB.
 * Uso:
 *   ROOT_SEED_EMAIL=admin@chronogest.com ROOT_SEED_PASSWORD=cambia-esto \
 *     npx ts-node -r tsconfig-paths/register scripts/seed-root-user.ts
 *
 * No se expone vía HTTP a propósito — crear el primer root user no debe
 * depender de un endpoint público.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { MasterDataSource } from '../src/database/master-datasource';
import { RootUser } from '../src/centro-tenant-admin/infrastructure/entities/root-user.entity';
import * as bcrypt from 'bcrypt';

async function main() {
  const email = process.env.ROOT_SEED_EMAIL;
  const password = process.env.ROOT_SEED_PASSWORD;

  if (!email || !password) {
    console.error('Faltan ROOT_SEED_EMAIL y/o ROOT_SEED_PASSWORD en el entorno.');
    process.exit(1);
  }

  await MasterDataSource.initialize();
  const repo = MasterDataSource.getRepository(RootUser);

  const hashed = await bcrypt.hash(password, 10);
  let rootUser = await repo.findOne({ where: { email } });

  if (rootUser) {
    rootUser.password = hashed;
    await repo.save(rootUser);
    console.log(`Contraseña actualizada para root user existente: ${email}`);
  } else {
    rootUser = repo.create({ email, password: hashed });
    await repo.save(rootUser);
    console.log(`Root user creado: ${email}`);
  }

  await MasterDataSource.destroy();
}

main().catch((err) => {
  console.error('Error al crear el root user:', err);
  process.exit(1);
});
