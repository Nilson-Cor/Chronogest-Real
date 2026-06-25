import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Modulo } from '../../../modulos/infrastructure/persistence/modulo.entity';
import { Permiso } from '../../../permisos/infrastructure/persistence/permiso.entity';

@Entity('servicios')
export class Servicio {
    @PrimaryGeneratedColumn({ name: 'id_servicio' })
    idServicio: string;

    @Column({ type: 'varchar', length: 200, default: '' })
    nombre: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    url: string;

    @Column({ name: 'modulo', type: 'int' })
    moduloId: string;

    @ManyToOne(() => Modulo, (modulo) => modulo.servicios)
    @JoinColumn({ name: 'modulo' })
    modulo: Modulo;

    @OneToMany(() => Permiso, (permiso) => permiso.servicio)
    permisos: Permiso[];
}
