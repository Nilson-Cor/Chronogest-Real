import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';

@Entity('matriculas')
export class Matricula {
    @PrimaryGeneratedColumn('uuid')
    idMatricula: string;

    @Column({ name: 'persona', type: 'uuid' })
    idPersona: string;

    @Column({ name: 'curso', type: 'uuid' })
    idCurso: string;

    @Column({ type: 'varchar', nullable: true, default: null })
    estado: string;

    @Column({ name: 'fecha_matricula', type: 'date', nullable: true })
    fechaMatricula: Date | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    avance: number;

    // Relación: muchas matrículas pertenecen a una persona
    @ManyToOne(() => Persona, (persona) => persona.matriculas, { eager: true })
    @JoinColumn({ name: 'persona' })
    persona: Persona;

    // Relación: muchas matrículas pertenecen a un curso
    @ManyToOne(() => Curso, (curso) => curso.matriculas, { eager: true })
    @JoinColumn({ name: 'curso' })
    curso: Curso;
}
