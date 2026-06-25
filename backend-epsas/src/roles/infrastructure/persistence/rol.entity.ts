import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Permiso } from '../../../permisos/infrastructure/persistence/permiso.entity';
import { Credencial } from '../../../credenciales/infrastructure/persistence/credencial.entity';

@Entity('roles')
export class Rol {
    @PrimaryGeneratedColumn('uuid', { name: 'id_rol' })
    idRol: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    nombre: string;

    @Column({ name: 'aplicativo', type: 'string' })
    aplicativoId: string;

    @ManyToOne(() => Aplicativo, (aplicativo) => aplicativo.roles)
    @JoinColumn({ name: 'aplicativo' })
    aplicativo: Aplicativo;

    @OneToMany(() => Permiso, (permiso) => permiso.rol)
    permisos: Permiso[];

    @OneToMany(() => Credencial, (credencial) => credencial.rol)
    credenciales: Credencial[];
}
