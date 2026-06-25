import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Area } from '../../infrastructure/persistence/area.entity';
import { CreateAreaDto } from '../dtos/create-area.dto';
import { UpdateAreaDto } from '../dtos/update-area.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class AreasService {
    private get repo(): Repository<Area> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Area);
    }

    async crear(dto: CreateAreaDto): Promise<Area> {
        const area = this.repo.create(dto);
        return await this.repo.save(area);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['sede', 'lider'] });
        return list.map(a => ({
            id: a.idArea,
            idArea: a.idArea,
            nombre: a.nombre,
            sedeId: a.sedeId,
            sede_nombre: (a as any).sede?.nombre ?? null,
            liderId: a.liderId,
            lider_nombre: (a as any).lider
                ? `${(a as any).lider.nombre} ${(a as any).lider.apellido ?? ''}`.trim()
                : null,
        }));
    }

    async obtenerPorId(id: string): Promise<Area> {
        const area = await this.repo.findOne({ where: { idArea: id } });
        if (!area) throw new NotFoundException(`Área con ID ${id} no encontrada`);
        return area;
    }

    async actualizar(id: string, dto: UpdateAreaDto): Promise<Area> {
        // Usamos update() en lugar de save() para evitar que TypeORM
        // use la relación "lider" cargada en eager (que apunta al líder ANTERIOR)
        // en vez del nuevo liderId que enviamos.
        await this.repo.update(id, {
            nombre: dto.nombre,
            sedeId: dto.sedeId,
            liderId: (dto as any).liderId !== undefined ? ((dto as any).liderId || null) : undefined,
        } as any);
        // Retornar el área actualizada con relaciones para que el caller tenga datos frescos
        const updated = await this.repo.findOne({
            where: { idArea: id },
            relations: ['sede', 'lider'],
        });
        if (!updated) throw new NotFoundException(`Área con ID ${id} no encontrada`);
        return updated;
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const area = await this.obtenerPorId(id);
        await this.repo.remove(area);
        return { mensaje: `Área con ID ${id} eliminada correctamente` };
    }
}
