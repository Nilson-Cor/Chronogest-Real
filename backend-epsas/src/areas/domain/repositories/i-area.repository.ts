import { IArea } from '../entities/area.domain';

export interface IAreaRepository {
    findAll(): Promise<IArea[]>;
    findById(id: string): Promise<IArea | null>;
    save(area: Partial<IArea>): Promise<IArea>;
    remove(id: string): Promise<void>;
}
