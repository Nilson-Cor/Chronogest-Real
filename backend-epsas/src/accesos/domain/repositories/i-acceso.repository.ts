import { IAcceso } from '../entities/acceso.domain';

export interface IAccesoRepository {
    save(acceso: Partial<IAcceso>): Promise<IAcceso>;
    findByToken(token: string): Promise<IAcceso | null>;
    markExit(token: string, fechaSalida: Date): Promise<void>;
}
