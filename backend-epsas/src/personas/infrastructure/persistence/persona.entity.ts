import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, RelationId } from 'typeorm';
import { Municipio } from '../../../municipios/infrastructure/persistence/municipio.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { Matricula } from '../../../matriculas/infrastructure/persistence/matricula.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { TipoGenero, TipoCargo, tipoEstado } from '../../application/dtos/create-persona.dto';

@Entity('personas')
export class Persona {
    @PrimaryGeneratedColumn('uuid')
    idPersona: string;

    @Column({ type: 'varchar' })
    nombre: string;

    @Column({ type: 'varchar', nullable: true })
    apellido: string;

    @Column({ name: 'tipo_doc', type: 'varchar', length: 10, nullable: true, default: 'CC' })
    tipoDoc: string;

    @Column({ type: 'bigint', nullable: false, unique: true })
    cedula: number;

    @Column({ type: 'bigint', nullable: true })
    telefono: number;

    @RelationId((p: Persona) => p.municipio)
    municipioId: string;

    @Column({ type: 'varchar', nullable: true })
    direccion: string;

    @Column({ type: 'varchar', nullable: true })
    correo: string;

    @Column({ type: 'varchar', nullable: true })
    genero: TipoGenero;

    @Column({ type: 'varchar', nullable: true })
    cargo: TipoCargo;

    @Column({ type: 'varchar', default: 'activo' })
    estado: tipoEstado;

    @Column({ name: 'es_lider', type: 'boolean', default: false })
    esLider: boolean;

    @Column({ name: 'area_liderada', type: 'varchar', nullable: true })
    areaLiderada: string;

    @Column({ name: 'es_transversal', type: 'boolean', default: false })
    esTransversal: boolean;

    @Column({ name: 'foto_perfil', type: 'varchar', length: 500, nullable: true })
    fotoPerfil: string;

    @Column({ name: 'ficha_id', type: 'uuid', nullable: true })
    fichaId: string;

    @ManyToOne(() => Municipio, (municipio) => municipio.personas, { eager: true, nullable: true })
    @JoinColumn({ name: 'municipio' })
    municipio: Municipio;

    @ManyToOne(() => Curso, { eager: false, nullable: true })
    @JoinColumn({ name: 'ficha_id' })
    ficha: Curso;

    @OneToMany(() => Curso, (curso) => curso.lider)
    cursosLiderados: Curso[];

    @OneToMany(() => Matricula, (matricula) => matricula.persona)
    matriculas: Matricula[];

    @OneToMany(() => Usuario, (usuario) => usuario.persona)
    usuarios: Usuario[];
}
