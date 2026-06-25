import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Municipio } from '../../../municipios/infrastructure/persistence/municipio.entity';
import { Sede } from '../../../sedes/infrastructure/persistence/sede.entity';

@Entity('centro_formacion')
export class CentroFormacion {
    @PrimaryGeneratedColumn('uuid')
    idCentro: string;

    @Column({ type: 'varchar', length: 200, default: '' })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    direccion: string;

    @Column({ name: 'municipio', type: 'int', nullable: true })
    municipioId: string;

    // Un centro pertenece a un municipio
    @ManyToOne(() => Municipio, (municipio) => municipio.centrosFormacion, { eager: true })
    @JoinColumn({ name: 'municipio' })
    municipio: Municipio;

    // Un centro tiene muchas sedes
    @OneToMany(() => Sede, (sede) => sede.centroFormacion)
    sedes: Sede[];
}
