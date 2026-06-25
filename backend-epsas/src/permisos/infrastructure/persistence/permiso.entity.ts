import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { Rol } from '../../../roles/infrastructure/persistence/rol.entity';
import { Servicio } from '../../../servicios/infrastructure/persistence/servicio.entity';

@Entity('permisos')
export class Permiso {
    @PrimaryGeneratedColumn({ name: 'id_permiso' })
    idPermiso: string;

    @Column({ name: 'usuario', type: 'uuid' })
    usuarioId: string;

    @Column({ name: 'rol', type: 'uuid' })
    rolId: string;

    @Column({ name: 'servicio', type: 'int' })
    servicioId: string;

    @ManyToOne(() => Usuario, (usuario) => usuario.permisos)
    @JoinColumn({ name: 'usuario' })
    usuario: Usuario;

    @ManyToOne(() => Rol, (rol) => rol.permisos)
    @JoinColumn({ name: 'rol' })
    rol: Rol;

    @ManyToOne(() => Servicio, (servicio) => servicio.permisos)
    @JoinColumn({ name: 'servicio' })
    servicio: Servicio;
}
