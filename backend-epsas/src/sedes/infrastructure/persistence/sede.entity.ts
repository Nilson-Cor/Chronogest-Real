import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CentroFormacion } from '../../../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Ambiente } from '../../../ambientes/infrastructure/persistence/ambiente.entity';
import { Area } from '../../../areas/infrastructure/persistence/area.entity';

@Entity('sedes')
export class Sede {
    @PrimaryGeneratedColumn({ name: 'id_sede' })
    idSede: string;

    @Column({ type: 'varchar' })
    nombre: string;

    @Column({ name: 'centro_formacion', type: 'uuid' })
    centroFormacionId: string;

    // Una sede pertenece a un centro de formación
    @ManyToOne(() => CentroFormacion, (centro) => centro.sedes, { eager: true })
    @JoinColumn({ name: 'centro_formacion' })
    centroFormacion: CentroFormacion;

    // Una sede tiene muchos ambientes
    @OneToMany(() => Ambiente, (ambiente) => ambiente.sede)
    ambientes: Ambiente[];

    // Una sede tiene muchas áreas
    @OneToMany(() => Area, (area) => area.sede)
    areas: Area[];
}
