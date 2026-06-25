import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CentroFormacion } from '../../infrastructure/persistence/centro-formacion.entity';
import { CreateCentroFormacionDto } from '../dtos/create-centro-formacion.dto';
import { UpdateCentroFormacionDto } from '../dtos/update-centro-formacion.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class CentroFormacionService {
    private get repo(): Repository<CentroFormacion> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(CentroFormacion);
    }

    async crear(dto: CreateCentroFormacionDto): Promise<CentroFormacion> {
        const centro = this.repo.create(dto);
        return await this.repo.save(centro);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['municipio'] });
        return list.map(c => ({
            id: c.idCentro,
            idCentro: c.idCentro,
            nombre: c.nombre,
            direccion: c.direccion,
            municipioId: c.municipioId,
            municipio_nombre: (c as any).municipio?.nombre ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<CentroFormacion> {
        const centro = await this.repo.findOne({ where: { idCentro: id } });
        if (!centro) throw new NotFoundException(`Centro de formación con ID ${id} no encontrado`);
        return centro;
    }

    async actualizar(id: string, dto: UpdateCentroFormacionDto): Promise<CentroFormacion> {
        const centro = await this.obtenerPorId(id);
        Object.assign(centro, dto);
        return await this.repo.save(centro);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const centro = await this.obtenerPorId(id);
        await this.repo.remove(centro);
        return { mensaje: `Centro de formación con ID ${id} eliminado correctamente` };
    }
}
