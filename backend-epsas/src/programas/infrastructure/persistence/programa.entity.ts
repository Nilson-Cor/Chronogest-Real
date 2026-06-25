import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { TipoAplicativo } from '../../application/dtos/create-programa.dto';

@Entity('programas')
export class Programa {
    @PrimaryGeneratedColumn('uuid',{ name: 'id_programa' })
    idPrograma: string;

    @Column({ type: 'varchar' })
    nombre: string;

    @Column({ type: 'varchar', nullable: true })
    tipo: TipoAplicativo;

    // Un programa tiene muchos cursos
    @OneToMany(() => Curso, (curso) => curso.programa)
    cursos: Curso[];
}

