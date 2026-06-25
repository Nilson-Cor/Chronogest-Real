import { INotificacion } from '../entities/notificacion.domain';

export interface INotificacionRepository {
    findAll(): Promise<INotificacion[]>;
    countUnread(): Promise<number>;
    markAsRead(id: string): Promise<void>;
    markAllAsRead(): Promise<void>;
    save(notificacion: Partial<INotificacion>): Promise<INotificacion>;
    delete(id: string): Promise<void>;
}
