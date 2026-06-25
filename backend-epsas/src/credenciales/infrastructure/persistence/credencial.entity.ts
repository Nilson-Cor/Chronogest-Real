import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { Rol } from '../../../roles/infrastructure/persistence/rol.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';

@Entity('credenciales')
export class Credencial {
    @PrimaryGeneratedColumn('uuid', { name: 'id_credencial' })
    idCredencial: string;

    @Column({ type: 'varchar' })
    login: string;

    @Column({ type: 'varchar' })
    password: string;

    @ManyToOne(() => Rol, (rol) => rol.credenciales)
    @JoinColumn({ name: 'rol' })
    rol: Rol;

    @RelationId((credencial: Credencial) => credencial.rol)
    rolId: string;

    @ManyToOne(() => Usuario, (usuario) => usuario.credenciales)
    @JoinColumn({ name: 'usuario' })
    usuario: Usuario;

    @RelationId((credencial: Credencial) => credencial.usuario)
    usuarioId: string;
}
