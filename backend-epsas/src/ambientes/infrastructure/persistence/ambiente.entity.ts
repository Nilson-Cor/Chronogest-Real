import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sede } from '../../../sedes/infrastructure/persistence/sede.entity';
import { Municipio } from '../../../municipios/infrastructure/persistence/municipio.entity';
import { Area } from '../../../areas/infrastructure/persistence/area.entity';

@Entity('ambientes')
export class Ambiente {
    @PrimaryGeneratedColumn('uuid')
    idAmbiente: string;

    @Column({ type: 'varchar', length: 100 })
    nombre: string;

    @Column({ type: 'varchar', length: 100, nullable: true, default: 'Ambiente' })
    tipo: string;

    @Column({ type: 'varchar', length: 50, nullable: true, default: 'activo' })
    estado: string;

    @Column({ type: 'int', nullable: true })
    capacidad: number;

    @Column({ name: 'sede', type: 'varchar', nullable: true })
    sedeId: string;

    @Column({ name: 'municipio', type: 'uuid', nullable: true })
    municipioId: string;

    @Column({ name: 'area', type: 'uuid', nullable: true })
    areaId: string;

    @ManyToOne(() => Sede, (sede) => sede.ambientes, { eager: true, nullable: true })
    @JoinColumn({ name: 'sede' })
    sede: Sede;

    @ManyToOne(() => Municipio, (municipio) => municipio.ambientes, { eager: true, nullable: true })
    @JoinColumn({ name: 'municipio' })
    municipio: Municipio;

    @ManyToOne(() => Area, { eager: true, nullable: true })
    @JoinColumn({ name: 'area' })
    area: Area;
}
