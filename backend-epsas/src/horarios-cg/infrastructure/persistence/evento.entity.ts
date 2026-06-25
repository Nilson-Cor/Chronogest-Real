import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('eventos')
export class Evento {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 200 })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ length: 50, nullable: true })
    tipo: string;

    @Column({ type: 'date', nullable: true, name: 'fecha_inicio' })
    fechaInicio: string;

    @Column({ type: 'date', nullable: true, name: 'fecha_fin' })
    fechaFin: string;

    @Column({ type: 'time', nullable: true, name: 'hora_inicio' })
    horaInicio: string;

    @Column({ type: 'time', nullable: true, name: 'hora_fin' })
    horaFin: string;

    @Column({ length: 100, nullable: true })
    lugar: string;

    @Column({ nullable: true, name: 'ubicacion_id', type: 'uuid' })
    ubicacionId: string;

    @Column({ type: 'jsonb', nullable: true, name: 'fichas_participantes' })
    fichasParticipantes: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
