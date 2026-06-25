import { IAplicativo } from '../entities/aplicativo.domain';

export interface IAplicativoRepository {
    findAll(): Promise<IAplicativo[]>;
    findById(id: string): Promise<IAplicativo | null>;
    save(aplicativo: Partial<IAplicativo>): Promise<IAplicativo>;
    remove(id: string): Promise<void>;
}
