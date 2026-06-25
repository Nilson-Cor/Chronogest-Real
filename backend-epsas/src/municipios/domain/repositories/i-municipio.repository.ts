import { IMunicipio } from '../entities/municipio.domain';

export interface IMunicipioRepository {
    findAll(): Promise<IMunicipio[]>;
    findById(id: string): Promise<IMunicipio | null>;
    findByDepartamento(depId: string): Promise<IMunicipio[]>;
    save(municipio: Partial<IMunicipio>): Promise<IMunicipio>;
    remove(id: string): Promise<void>;
}
