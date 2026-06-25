import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { AsignacionHorario } from "./asignacion-horario.entity";

export enum DiaSemana {
    LUNES="lunes", MARTES="martes", MIERCOLES="miercoles",
    JUEVES="jueves", VIERNES="viernes", SABADO="sabado",
}
export enum Jornada { MANANA="manana", TARDE="tarde", NOCHE="noche" }

/**
 * Horario — Plantilla de tiempo
 * Solo almacena el slot: dia de semana, jornada, hora inicio/fin.
 * Los datos de asignacion (instructor, ficha, ambiente, sesion)
 * viven en AsignacionHorario.
 */
@Entity("horarios")
export class Horario {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", name: "dia_semana" })
    diaSemana: DiaSemana;

    @Column({ type: "varchar" })
    jornada: Jornada;

    @Column({ type: "time", name: "hora_inicio" })
    horaInicio: string;

    @Column({ type: "time", name: "hora_fin" })
    horaFin: string;

    @OneToMany(() => AsignacionHorario, (a) => a.horario)
    asignaciones: AsignacionHorario[];

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
    updatedAt: Date;
}