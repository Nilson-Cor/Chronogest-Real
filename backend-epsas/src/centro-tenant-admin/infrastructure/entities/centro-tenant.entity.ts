import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Registro de un Centro de Formación SENA (tenant) en MASTER_DB.
 * No confundir con `aplicativoId` (TenantGuard en src/tenant/) que es un
 * concepto distinto de multi-app SSO.
 */
@Entity('centros_tenant')
export class CentroTenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  dominio: string;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: 'activo' | 'inactivo';

  @Column({ type: 'varchar', length: 200, name: 'epsas_db_name' })
  epsasDbName: string;

  @Column({ type: 'varchar', length: 200, name: 'epsas_db_host', nullable: true })
  epsasDbHost: string | null;

  @Column({ type: 'int', name: 'epsas_db_port', default: 5435 })
  epsasDbPort: number;

  @Column({ type: 'varchar', length: 200, name: 'horarios_db_name' })
  horariosDbName: string;

  @Column({ type: 'varchar', length: 200, name: 'horarios_db_host', nullable: true })
  horariosDbHost: string | null;

  @Column({ type: 'int', name: 'horarios_db_port', default: 5435 })
  horariosDbPort: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
