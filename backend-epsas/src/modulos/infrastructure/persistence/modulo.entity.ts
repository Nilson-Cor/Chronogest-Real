import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Servicio } from '../../../servicios/infrastructure/persistence/servicio.entity';

@Entity('modulos')
export class Modulo {
    @PrimaryGeneratedColumn({ name: 'id_modulo' })
    idModulo: string;

    @Column({ name: 'aplicativo', type: 'uuid' })
    aplicativoId: string;

    @Column({ type: 'varchar', length: 200, default: '' })
    modulo: string;

    @ManyToOne(() => Aplicativo, (aplicativo) => aplicativo.modulos)
    @JoinColumn({ name: 'aplicativo' })
    aplicativo: Aplicativo;

    @OneToMany(() => Servicio, (servicio) => servicio.modulo)
    servicios: Servicio[];
}
