import { IModulo } from '../entities/modulo.domain';

export interface IModuloRepository {
    findAll(): Promise<IModulo[]>;
    findById(id: string): Promise<IModulo | null>;
    save(modulo: Partial<IModulo>): Promise<IModulo>;
    remove(id: string): Promise<void>;
}
