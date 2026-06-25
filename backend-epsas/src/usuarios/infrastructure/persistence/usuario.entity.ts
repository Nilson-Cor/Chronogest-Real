import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Acceso } from '../../../accesos/infrastructure/persistence/acceso.entity';
import { Permiso } from '../../../permisos/infrastructure/persistence/permiso.entity';
import { Credencial } from '../../../credenciales/infrastructure/persistence/credencial.entity';

@Entity('usuarios')
export class Usuario {
    @PrimaryGeneratedColumn('uuid')
    idUsuario: string;

    @Column({ type: 'varchar', default: 'activo' })
    estado: string;

    @ManyToOne(() => Persona, (persona) => persona.usuarios)
    @JoinColumn({ name: 'persona' })
    persona: Persona;

    @ManyToOne(() => Aplicativo, (aplicativo) => aplicativo.usuarios)
    @JoinColumn({ name: 'aplicativo' })
    aplicativo: Aplicativo;

    @OneToMany(() => Acceso, (acceso) => acceso.usuario)
    accesos: Acceso[];

    @OneToMany(() => Permiso, (permiso) => permiso.usuario)
    permisos: Permiso[];

    @OneToMany(() => Credencial, (credencial) => credencial.usuario)
    credenciales: Credencial[];
}
