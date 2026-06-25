import { IMatricula } from '../entities/matricula.domain';

export interface IMatriculaRepository {
    findAll(): Promise<IMatricula[]>;
    findByPersona(personaId: string): Promise<IMatricula[]>;
    save(matricula: Partial<IMatricula>): Promise<IMatricula>;
    remove(id: string): Promise<void>;
}
