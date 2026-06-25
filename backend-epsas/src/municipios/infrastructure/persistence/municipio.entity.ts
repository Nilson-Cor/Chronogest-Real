import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Departamento } from '../../../departamentos/infrastructure/persistence/departamento.entity';
import { CentroFormacion } from '../../../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Ambiente } from '../../../ambientes/infrastructure/persistence/ambiente.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';

@Entity('municipios')
export class Municipio {
    @PrimaryGeneratedColumn('uuid', { name: 'id_municipio' })
    idMunicipio: string;

    @Column({ type: 'varchar', length: 60 })
    nombre: string;

    @Column({ name: 'departamento', type: 'string' })
    departamentoId: string;

    // Relación: muchos municipios pertenecen a un departamento
    @ManyToOne(() => Departamento, (departamento) => departamento.municipios, { eager: true })
    @JoinColumn({ name: 'departamento' })
    departamento: Departamento;

    // Un municipio tiene muchos centros de formación
    @OneToMany(() => CentroFormacion, (centro) => centro.municipio)
    centrosFormacion: CentroFormacion[];

    // Un municipio tiene muchos ambientes
    @OneToMany(() => Ambiente, (ambiente) => ambiente.municipio)
    ambientes: Ambiente[];

    // Un municipio tiene muchas personas
    @OneToMany(() => Persona, (persona) => persona.municipio)
    personas: Persona[];
}
