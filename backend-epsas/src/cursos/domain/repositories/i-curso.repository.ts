import { ICurso } from '../entities/curso.domain';

export interface ICursoRepository {
    findAll(): Promise<ICurso[]>;
    findById(id: string): Promise<ICurso | null>;
    save(curso: Partial<ICurso>): Promise<ICurso>;
    remove(id: string): Promise<void>;
}
