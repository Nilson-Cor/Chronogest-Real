export interface INotificacion {
    id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    data: Record<string, any> | null;
    leida: boolean;
    createdAt: Date;
}
