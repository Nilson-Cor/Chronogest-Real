import { IAmbiente } from '../entities/ambiente.domain';

export interface IAmbienteRepository {
    findAll(): Promise<IAmbiente[]>;
    findById(id: string): Promise<IAmbiente | null>;
    save(ambiente: Partial<IAmbiente>): Promise<IAmbiente>;
    remove(id: string): Promise<void>;
}
