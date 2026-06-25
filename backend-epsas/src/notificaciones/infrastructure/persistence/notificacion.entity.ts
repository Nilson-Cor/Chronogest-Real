import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  tipo: string;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  data: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
