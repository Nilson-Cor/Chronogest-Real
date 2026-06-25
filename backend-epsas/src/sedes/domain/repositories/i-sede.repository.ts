import { ISede } from '../entities/sede.domain';

export interface ISedeRepository {
    findAll(): Promise<ISede[]>;
    findById(id: string): Promise<ISede | null>;
    save(sede: Partial<ISede>): Promise<ISede>;
    remove(id: string): Promise<void>;
}
