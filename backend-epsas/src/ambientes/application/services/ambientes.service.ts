import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Ambiente } from '../../infrastructure/persistence/ambiente.entity';
import { CreateAmbienteDto } from '../dtos/create-ambiente.dto';
import { UpdateAmbienteDto } from '../dtos/update-ambiente.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class AmbientesService {
    private get repo(): Repository<Ambiente> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Ambiente);
    }

    async crear(dto: CreateAmbienteDto): Promise<Ambiente> {
        const ambiente = this.repo.create(dto);
        return await this.repo.save(ambiente);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['sede', 'municipio', 'area'] });
        return list.map(a => ({
            id: a.idAmbiente,
            idAmbiente: a.idAmbiente,
            nombre: a.nombre,
            tipo: a.tipo,
            estado: (a as any).estado ?? 'activo',
            capacidad: a.capacidad,
            sedeId: a.sedeId,
            sede_nombre: (a as any).sede?.nombre ?? null,
            municipioId: a.municipioId,
            municipio_nombre: (a as any).municipio?.nombre ?? null,
            areaId: a.areaId,
            area_nombre: (a as any).area?.nombre ?? null,
        }));
    }

    /** Devuelve todos los tipos únicos de ambientes registrados */
    async obtenerTipos(): Promise<string[]> {
        const result = await this.repo
            .createQueryBuilder('a')
            .select('DISTINCT a.tipo', 'tipo')
            .getRawMany();
        return result.map(r => r.tipo).filter(Boolean);
    }

    async obtenerPorId(id: string): Promise<Ambiente> {
        const ambiente = await this.repo.findOne({ where: { idAmbiente: id } });
        if (!ambiente) throw new NotFoundException(`Ambiente con ID ${id} no encontrado`);
        return ambiente;
    }

    async actualizar(id: string, dto: UpdateAmbienteDto): Promise<Ambiente> {
        const ambiente = await this.obtenerPorId(id);
        Object.assign(ambiente, dto);
        return await this.repo.save(ambiente);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const ambiente = await this.obtenerPorId(id);
        await this.repo.remove(ambiente);
        return { mensaje: `Ambiente con ID ${id} eliminado correctamente` };
    }
}
