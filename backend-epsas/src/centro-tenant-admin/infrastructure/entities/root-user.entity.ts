import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Usuario raíz de la plataforma (super-admin). Vive en MASTER_DB y solo
 * tiene permisos sobre CentroTenantAdminController — NUNCA accede a datos
 * de epsas_db/horarios_db de ningún tenant. No tiene relación alguna con
 * Usuario/Credencial (epsas_db) ni con aplicativoId (TenantGuard).
 */
@Entity('root_users')
export class RootUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  password: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
