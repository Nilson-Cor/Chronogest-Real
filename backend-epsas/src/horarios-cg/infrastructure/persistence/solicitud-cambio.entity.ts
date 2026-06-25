import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { AsignacionHorario } from "./asignacion-horario.entity";

@Entity("solicitudes_cambio")
export class SolicitudCambio {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "instructor_id", type: "uuid" })
    instructorId: string;

    @ManyToOne(() => AsignacionHorario, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "asignacion_id" })
    asignacion: AsignacionHorario;

    @Column({ nullable: true, name: "asignacion_id", type: "uuid" })
    asignacionId: string;

    @Column({ type: "jsonb", nullable: true, name: "horario_propuesto" })
    horarioPropuesto: any;

    @Column({ type: "jsonb", nullable: true, name: "snapshot_actual" })
    snapshotActual: any;

    @Column({ type: "text", nullable: true })
    razon: string;

    @Column({ type: "text", nullable: true, name: "archivo_adjunto_url" })
    archivoAdjuntoUrl: string;

    @Column({ length: 20, default: "pendiente" })
    estado: string;

    @Column({ type: "text", nullable: true, name: "respuesta_admin" })
    respuestaAdmin: string;

    @Column({ type: "timestamptz", nullable: true })
    fecha: Date;

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
    updatedAt: Date;
}