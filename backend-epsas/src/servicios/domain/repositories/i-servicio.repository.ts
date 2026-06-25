import { IServicio } from '../entities/servicio.domain';

export interface IServicioRepository {
    findAll(): Promise<IServicio[]>;
    findById(id: string): Promise<IServicio | null>;
    save(servicio: Partial<IServicio>): Promise<IServicio>;
    remove(id: string): Promise<void>;
}
