import { IPermiso } from '../entities/permiso.domain';

export interface IPermisoRepository {
    findByRol(rolId: string): Promise<IPermiso[]>;
    save(permiso: Partial<IPermiso>): Promise<IPermiso>;
    remove(id: string): Promise<void>;
}
