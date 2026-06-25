import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Area } from '../../../areas/infrastructure/persistence/area.entity';
import { Programa } from '../../../programas/infrastructure/persistence/programa.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Matricula } from '../../../matriculas/infrastructure/persistence/matricula.entity';
import { Ambiente } from '../../../ambientes/infrastructure/persistence/ambiente.entity';

export enum EstadoCurso {
    ACTIVO = 'activo',
    TERMINADO = 'terminado',
    CANCELADO = 'cancelado',
}

@Entity('cursos')
export class Curso {
    @PrimaryGeneratedColumn('uuid')
    idCurso: string;

    @Column({ type: 'varchar', nullable: true })
    codigo: string;

    @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
    fechaInicio: Date;

    @Column({ name: 'fecha_fin', type: 'date', nullable: true })
    fechaFin: Date;

    @Column({ name: 'fin_lectiva', type: 'date', nullable: true })
    finLectiva: Date;

    @Column({ name: 'estado', type: 'varchar', default: EstadoCurso.ACTIVO })
    estado: EstadoCurso;

    @Column({ name: 'area', type: 'uuid', nullable: true })
    areaId: string;

    @Column({ name: 'programa', type: 'uuid', nullable: true })
    programaId: string;

    @Column({ name: 'lider', type: 'uuid', nullable: true })
    liderId: string;

    @Column({ name: 'ambiente', type: 'uuid', nullable: true })
    ambienteId: string;

    @ManyToOne(() => Area, (area) => area.cursos, { eager: true, nullable: true })
    @JoinColumn({ name: 'area' })
    area: Area;

    @ManyToOne(() => Programa, (programa) => programa.cursos, { eager: true, nullable: true })
    @JoinColumn({ name: 'programa' })
    programa: Programa;

    @ManyToOne(() => Persona, (persona) => persona.cursosLiderados, { eager: true, nullable: true })
    @JoinColumn({ name: 'lider' })
    lider: Persona;

    @ManyToOne(() => Ambiente, { eager: true, nullable: true })
    @JoinColumn({ name: 'ambiente' })
    ambiente: Ambiente;

    @OneToMany(() => Matricula, (matricula) => matricula.curso)
    matriculas: Matricula[];
}
