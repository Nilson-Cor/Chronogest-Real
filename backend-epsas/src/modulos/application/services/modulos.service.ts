import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Modulo } from '../../infrastructure/persistence/modulo.entity';
import { CreateModuloDto } from '../dtos/create-modulo.dto';
import { UpdateModuloDto } from '../dtos/update-modulo.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class ModuloService {
    private get repo(): Repository<Modulo> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Modulo);
    }

    async crear(dto: CreateModuloDto): Promise<Modulo> {
        // El entity usa la columna 'modulo' como nombre; el DTO usa 'nombre'
        const entity = this.repo.create({
            modulo: dto.nombre,
            aplicativoId: dto.aplicativoId,
        } as any) as unknown as Modulo;
        return await this.repo.save(entity);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['aplicativo'] });
        return list.map(m => ({
            id: String(m.idModulo),
            idModulo: String(m.idModulo),
            nombre: (m as any).modulo ?? '',
            aplicativoId: m.aplicativoId,
            aplicativo_nombre: (m as any).aplicativo?.nombre ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Modulo> {
        const modulo = await this.repo.findOne({
            where: { idModulo: id },
            relations: ['aplicativo', 'servicios'],
        });
        if (!modulo) throw new NotFoundException(`Módulo con ID ${id} no encontrado`);
        return modulo;
    }

    async obtenerPorAplicativo(aplicativoId: string): Promise<Modulo[]> {
        return await this.repo.find({
            where: { aplicativoId },
            relations: ['aplicativo', 'servicios'],
        });
    }

    async actualizar(id: string, dto: UpdateModuloDto): Promise<Modulo> {
        const modulo = await this.obtenerPorId(id);
        Object.assign(modulo, dto);
        return await this.repo.save(modulo);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const modulo = await this.obtenerPorId(id);
        await this.repo.remove(modulo);
        return { mensaje: `Módulo con ID ${id} eliminado correctamente` };
    }
}
