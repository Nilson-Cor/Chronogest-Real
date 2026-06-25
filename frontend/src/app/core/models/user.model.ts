export interface User {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  fotoPerfil?: string;
  rol: 'admin' | 'instructor' | 'aprendiz';
  esLider?: boolean;
  areaLiderada?: string;
  esTransversal?: boolean;
  fichaId?: number;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface Horario {
  id: number;
  diaSemana: string;
  jornada: string;
  horaInicio: string;
  horaFin: string;
  fichaId: number;
  ambienteId: number;
  instructorId: number;
  activo: boolean;
  ficha?: Ficha;
  ambiente?: Ambiente;
  instructor?: Instructor;
  competencias?: Competencia[];
}

export interface Ficha {
  id: number;
  codigo: string;
  programa: string;
  area: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface Ambiente {
  id: number;
  nombre: string;
  tipo: string;
  capacidad: number;
  disponible?: boolean;
}

export interface Instructor {
  id: number;
  nombre: string;
  apellido: string;
  tipoDoc: string;
  numDoc: string;
  correo: string;
  telefono?: string;
  fotoPerfil?: string;
  esLider: boolean;
  areaLiderada?: string;
  esTransversal?: boolean;
  municipio?: string;
  sesionActiva: boolean;
}

export interface Aprendiz {
  id: number;
  nombre: string;
  apellido: string;
  numDoc: string;
  correo: string;
  municipio?: string;
  sesionActiva: boolean;
  fichaId?: number;
  ficha?: Ficha;
}

export interface Competencia {
  id: number;
  horarioId: number;
  nombre: string;
  resultado?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface SolicitudCambio {
  id: number;
  instructorId: number;
  instructor?: Instructor;
  horarioIdActual?: number;
  horarioActual?: Horario;
  horarioPropuesto?: any;
  razon: string;
  archivoAdjuntoUrl?: string;
  estado: string;
  respuestaAdmin?: string;
  fecha: Date;
}

export interface Notificacion {
  id: number;
  tipo: string;
  destinatarioId: number;
  destinatarioRol: string;
  contenidoJson: any;
  leida: boolean;
  fecha: Date;
}

export interface Evento {
  id: number;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  hora?: string;
  fecha?: string;
  fichasParticipantes?: number[];
}

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;
export const DIAS_LABELS: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
};
