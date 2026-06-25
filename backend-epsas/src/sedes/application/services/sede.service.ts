import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Sede } from '../../infrastructure/persistence/sede.entity';
import { CreateSedeDto } from '../dtos/create-sede.dto';
import { UpdateSedeDto } from '../dtos/update-sede.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class SedeService {
    private get repo(): Repository<Sede> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Sede);
    }

    async crear(dto: CreateSedeDto): Promise<Sede> {
        const sede = this.repo.create(dto);
        return await this.repo.save(sede);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['centroFormacion'] });
        return list.map(s => ({
            id: String(s.idSede),
            idSede: String(s.idSede),
            nombre: s.nombre,
            centroFormacionId: s.centroFormacionId,
            centro_nombre: (s as any).centroFormacion?.nombre ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Sede> {
        const sede = await this.repo.findOne({ where: { idSede: id as any } });
        if (!sede) throw new NotFoundException(`Sede con ID ${id} no encontrada`);
        return sede;
    }

    async actualizar(id: string, dto: UpdateSedeDto): Promise<Sede> {
        const sede = await this.obtenerPorId(id);
        Object.assign(sede, dto);
        return await this.repo.save(sede);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const sede = await this.obtenerPorId(id);
        await this.repo.remove(sede);
        return { mensaje: `Sede con ID ${id} eliminada correctamente` };
    }
}
