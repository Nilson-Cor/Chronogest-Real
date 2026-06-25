export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  data?: Record<string, any> | null;
  leida: boolean;
  createdAt: string;
}
