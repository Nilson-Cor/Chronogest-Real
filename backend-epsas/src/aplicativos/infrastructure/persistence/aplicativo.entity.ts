import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Rol } from '../../../roles/infrastructure/persistence/rol.entity';
import { Modulo } from '../../../modulos/infrastructure/persistence/modulo.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';

@Entity('aplicativos')
export class Aplicativo {
  @PrimaryGeneratedColumn('uuid')
  idAplicativo: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  nombre: string;

  /** PIN de registro para nuevos usuarios (default: 1234) */
  @Column({ type: 'varchar', length: 20, name: 'pin_registro', default: '1234' })
  pinRegistro: string;

  @OneToMany(() => Rol, (rol) => rol.aplicativo)
  roles: Rol[];

  @OneToMany(() => Modulo, (modulo) => modulo.aplicativo)
  modulos: Modulo[];

  @OneToMany(() => Usuario, (usuario) => usuario.aplicativo)
  usuarios: Usuario[];

}
