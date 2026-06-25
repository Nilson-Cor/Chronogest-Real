export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';
export type Jornada   = 'manana' | 'tarde' | 'noche';

export interface Horario {
  id: string;
  diaSemana: DiaSemana;
  jornada: Jornada;
  horaInicio: string;
  horaFin: string;
  fichaId: string | null;
  ambienteId: string | null;
  instructorId: string | null;
  activo: boolean;
  ultimaActivacion: string | null;
  minutosRetraso: number;
  motivoFinalizacion: string | null;
  ubicacionTransversalId: string | null;
  ubicacionTransversalNombre: string | null;
  competencias?: Competencia[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Competencia {
  id: string;
  horarioId: string;
  instructorId: string | null;
  fichaId: string | null;
  nombre: string;
  resultado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  diasClase?: string[] | null;
  horasRequeridas?: number | null;
}

export interface SolicitudCambio {
  id: string;
  instructorId: string;
  horarioIdActual?: string;
  horarioPropuesto?: Record<string, any>;
  razon?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelada';
  respuestaAdmin?: string;
  fecha?: string;
  createdAt?: string;
}

export interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  lugar?: string;
  ubicacionId?: string;
  fichasParticipantes?: string[];
}
