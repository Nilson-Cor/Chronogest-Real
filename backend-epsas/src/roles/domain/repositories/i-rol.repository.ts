import { IRol } from '../entities/rol.domain';

export interface IRolRepository {
    findAll(): Promise<IRol[]>;
    findById(id: string): Promise<IRol | null>;
    findByNombre(nombre: string, aplicativoId: string): Promise<IRol | null>;
    save(rol: Partial<IRol>): Promise<IRol>;
    remove(id: string): Promise<void>;
}
