import { IUsuario } from '../entities/usuario.domain';

export interface IUsuarioRepository {
    findAll(): Promise<IUsuario[]>;
    findById(id: string): Promise<IUsuario | null>;
    findByPersona(personaId: string): Promise<IUsuario | null>;
    save(usuario: Partial<IUsuario>): Promise<IUsuario>;
    remove(id: string): Promise<void>;
}
