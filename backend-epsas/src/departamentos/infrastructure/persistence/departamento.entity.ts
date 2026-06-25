import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Municipio } from '../../../municipios/infrastructure/persistence/municipio.entity';

@Entity('departamentos')
export class Departamento {
    @PrimaryGeneratedColumn('uuid')
    idDepartamento: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    nombre: string;

    // Un departamento tiene muchos municipios
    @OneToMany(() => Municipio, (municipio) => municipio.departamento)
    municipios: Municipio[];
}
