import { IDepartamento } from '../entities/departamento.domain';

export interface IDepartamentoRepository {
    findAll(): Promise<IDepartamento[]>;
    findById(id: string): Promise<IDepartamento | null>;
    save(dep: Partial<IDepartamento>): Promise<IDepartamento>;
    remove(id: string): Promise<void>;
}
