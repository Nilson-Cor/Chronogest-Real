import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Municipio } from '../../infrastructure/persistence/municipio.entity';
import { CreateMunicipioDto } from '../dtos/create-municipio.dto';
import { UpdateMunicipioDto } from '../dtos/update-municipio.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class MunicipiosService {
    private get repo(): Repository<Municipio> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Municipio);
    }

    async crear(dto: CreateMunicipioDto): Promise<Municipio> {
        const municipio = this.repo.create(dto);
        return await this.repo.save(municipio);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['departamento'] });
        return list.map(m => ({
            id: m.idMunicipio,
            idMunicipio: m.idMunicipio,
            nombre: m.nombre,
            departamentoId: (m as any).departamentoId,
            departamento_nombre: (m as any).departamento?.nombre ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Municipio> {
        const municipio = await this.repo.findOne({ where: { idMunicipio: id } });
        if (!municipio) throw new NotFoundException(`Municipio con ID ${id} no encontrado`);
        return municipio;
    }

    async actualizar(id: string, dto: UpdateMunicipioDto): Promise<Municipio> {
        const municipio = await this.obtenerPorId(id);
        Object.assign(municipio, dto);
        return await this.repo.save(municipio);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const municipio = await this.obtenerPorId(id);
        await this.repo.remove(municipio);
        return { mensaje: `Municipio con ID ${id} eliminado correctamente` };
    }
}
