import { IHorario } from '../entities/horario.domain';

export interface IHorarioRepository {
    findAll(): Promise<IHorario[]>;
    findById(id: string): Promise<IHorario | null>;
    findByInstructor(instructorId: string): Promise<IHorario[]>;
    findByFicha(fichaId: string): Promise<IHorario[]>;
    findByAmbiente(ambienteId: string): Promise<IHorario[]>;
    save(horario: Partial<IHorario>): Promise<IHorario>;
    remove(id: string): Promise<void>;
}
