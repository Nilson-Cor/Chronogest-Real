import { ICentroFormacion } from '../entities/centro-formacion.domain';

export interface ICentroFormacionRepository {
    findAll(): Promise<ICentroFormacion[]>;
    findById(id: string): Promise<ICentroFormacion | null>;
    save(centro: Partial<ICentroFormacion>): Promise<ICentroFormacion>;
    remove(id: string): Promise<void>;
}
