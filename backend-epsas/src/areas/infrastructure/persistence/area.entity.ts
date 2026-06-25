import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Sede } from '../../../sedes/infrastructure/persistence/sede.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';

@Entity('areas')
export class Area {
    @PrimaryGeneratedColumn('uuid')
    idArea: string;

    @Column({ type: 'varchar' })
    nombre: string;

    @Column({ name: 'sede', type: 'varchar', nullable: true })
    sedeId: string;

    @Column({ name: 'lider_id', type: 'uuid', nullable: true })
    liderId: string;

    @ManyToOne(() => Sede, (sede) => sede.areas, { eager: true, nullable: true })
    @JoinColumn({ name: 'sede' })
    sede: Sede;

    @ManyToOne(() => Persona, { eager: true, nullable: true })
    @JoinColumn({ name: 'lider_id' })
    lider: Persona;

    @OneToMany(() => Curso, (curso) => curso.area)
    cursos: Curso[];
}
