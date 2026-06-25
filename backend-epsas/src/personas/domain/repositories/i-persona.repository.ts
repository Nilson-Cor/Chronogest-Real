import { IPersona } from '../entities/persona.domain';

export interface IPersonaRepository {
    findAll(): Promise<IPersona[]>;
    findById(id: string): Promise<IPersona | null>;
    findByCargo(cargo: string): Promise<IPersona[]>;
    save(persona: Partial<IPersona>): Promise<IPersona>;
    remove(id: string): Promise<void>;
}
