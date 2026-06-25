import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { tipoEstado } from '../../application/dtos/create-acceso.dto';

@Entity('accesos')
export class Acceso {
    @PrimaryGeneratedColumn('uuid')
    idAcceso: string;

    @Column({ type: 'text' })
    token: string;
    @Column({ name: 'usuario', type: 'int' })
    usuarioId: string;

    @Column({ name: 'fecha_ingreso', type: 'timestamp', nullable: true })
    fechaIngreso: Date;

    @Column({ name: 'fecha_salida', type: 'timestamp', nullable: true })
    fechaSalida: Date;

    @Column({ type: 'varchar', default: 'activo' })
    estado: tipoEstado;

    @ManyToOne(() => Usuario, (usuario) => usuario.accesos)
    @JoinColumn({ name: 'usuario' })
    usuario: Usuario;
}

