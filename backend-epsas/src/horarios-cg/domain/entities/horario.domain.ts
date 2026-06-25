export interface IHorario {
    id: string;
    diaSemana: string;
    jornada: string;
    horaInicio: string;
    horaFin: string;
    fichaId: string | null;
    ambienteId: string | null;
    instructorId: string | null;
    activo: boolean;
    ultimaActivacion: Date | null;
    minutosRetraso: number;
    motivoFinalizacion: string | null;
    ubicacionTransversalId: string | null;
    ubicacionTransversalNombre: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICompetencia {
    id: string;
    horarioId: string;
    instructorId: string | null;
    fichaId: string | null;
    nombre: string;
    resultado: string;
    fechaInicio: string;
    fechaFin: string;
    diasClase: string[] | null;
    horasRequeridas: number | null;
}

export interface ISolicitudCambio {
    id: string;
    instructorId: string;
    horarioIdActual: string;
    horarioPropuesto: Record<string, any> | null;
    razon: string;
    estado: string;
    respuestaAdmin: string;
    fecha: Date;
}

export interface IEvento {
    id: string;
    nombre: string;
    descripcion: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    horaInicio: string;
    horaFin: string;
    lugar: string;
    ubicacionId: string;
    fichasParticipantes: string[];
}
