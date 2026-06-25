import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { AsignacionHorario } from "./asignacion-horario.entity";

@Entity("competencias")
export class Competencia {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => AsignacionHorario, (a) => a.competencias, { onDelete: "CASCADE" })
    @JoinColumn({ name: "asignacion_id" })
    asignacion: AsignacionHorario;

    @Column({ name: "asignacion_id", type: "uuid" })
    asignacionId: string;

    /** Instructor fijado al momento de creacion (no cambia si se reasigna el horario) */
    @Column({ name: "instructor_id", type: "uuid", nullable: true })
    instructorId: string | null;

    /** Ficha fijada al momento de creacion */
    @Column({ name: "ficha_id", type: "uuid", nullable: true })
    fichaId: string | null;

    @Column({ type: "varchar", length: 300 })
    nombre: string;

    /** Una competencia puede tener varios resultados de aprendizaje asociados */
    @Column({ type: "jsonb", nullable: true })
    resultados: string[] | null;

    @Column({ type: "date", nullable: true, name: "fecha_inicio" })
    fechaInicio: string;

    @Column({ type: "date", nullable: true, name: "fecha_fin" })
    fechaFin: string;

    @Column({ type: "jsonb", nullable: true, name: "dias_clase" })
    diasClase: string[] | null;

    @Column({ type: "int", nullable: true, name: "horas_requeridas" })
    horasRequeridas: number | null;

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
    updatedAt: Date;
}