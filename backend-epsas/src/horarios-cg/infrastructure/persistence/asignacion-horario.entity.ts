import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
    ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Horario } from './horario.entity';
import { Competencia } from './competencia.entity';

/**
 * AsignacionHorario
 * Vincula un horario (plantilla de tiempo) con un instructor, una ficha y
 * un ambiente concreto, y almacena el estado de la sesión en curso.
 *
 * La relación es: Horario (1) → (N) AsignacionHorario
 * En la práctica actual cada horario tiene UNA asignación.
 */
@Entity('asignacion_horarios')
export class AsignacionHorario {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Horario plantilla (día + jornada + horas) */
    @ManyToOne(() => Horario, (h) => h.asignaciones, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'horario_id' })
    horario: Horario;

    @Column({ name: 'horario_id', type: 'uuid' })
    horarioId: string;

    // ── Datos de la asignación ──────────────────────────────────────────────

    /** UUID de la ficha (curso) asignada — referencia a epsas_db */
    @Column({ name: 'ficha_id', type: 'uuid', nullable: true })
    fichaId: string | null;

    /** UUID del ambiente asignado — referencia a epsas_db */
    @Column({ name: 'ambiente_id', type: 'uuid', nullable: true })
    ambienteId: string | null;

    /** UUID del instructor asignado — referencia a epsas_db (persona) */
    @Column({ name: 'instructor_id', type: 'uuid', nullable: true })
    instructorId: string | null;

    // ── Estado de sesión ────────────────────────────────────────────────────

    @Column({ default: false })
    activo: boolean;

    @Column({ type: 'timestamptz', nullable: true, name: 'ultima_activacion', default: null })
    ultimaActivacion: Date | null;

    @Column({ type: 'int', default: 0, name: 'minutos_retraso' })
    minutosRetraso: number;

    @Column({ type: 'text', nullable: true, name: 'motivo_finalizacion' })
    motivoFinalizacion: string | null;

    /** UUID de la ubicación temporal elegida por un instructor transversal */
    @Column({ name: 'ubicacion_transversal_id', type: 'uuid', nullable: true })
    ubicacionTransversalId: string | null;

    @Column({ type: 'varchar', length: 150, nullable: true, name: 'ubicacion_transversal_nombre' })
    ubicacionTransversalNombre: string | null;

    // ── Relaciones sub-funcionalidades ──────────────────────────────────────

    /** Competencias registradas en esta asignación */
    @OneToMany(() => Competencia, (c) => c.asignacion)
    competencias: Competencia[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
