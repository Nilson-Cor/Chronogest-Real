import { IPrograma } from '../entities/programa.domain';

export interface IProgramaRepository {
    findAll(): Promise<IPrograma[]>;
    findById(id: string): Promise<IPrograma | null>;
    save(programa: Partial<IPrograma>): Promise<IPrograma>;
    remove(id: string): Promise<void>;
}
