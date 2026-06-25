import { ICredencial } from '../entities/credencial.domain';

export interface ICredencialRepository {
    findByLogin(login: string): Promise<ICredencial | null>;
    save(credencial: Partial<ICredencial>): Promise<ICredencial>;
    updatePassword(login: string, hashedPassword: string): Promise<void>;
}
