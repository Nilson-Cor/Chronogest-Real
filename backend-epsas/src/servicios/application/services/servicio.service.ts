import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Servicio } from '../../infrastructure/persistence/servicio.entity';
import { CreateServicioDto } from '../dto/create-servicio.dto';
import { UpdateServicioDto } from '../dto/update-servicio.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class ServicioService {
    private get repo(): Repository<Servicio> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Servicio);
    }

    async crear(dto: CreateServicioDto): Promise<Servicio> {
        return await this.repo.save(this.repo.create(dto));
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['modulo'] });
        return list.map(s => ({
            id: String(s.idServicio),
            idServicio: String(s.idServicio),
            nombre: s.nombre,
            url: s.url,
            moduloId: String(s.moduloId),
            modulo_nombre: (s as any).modulo?.modulo ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Servicio> {
        const servicio = await this.repo.findOne({
            where: { idServicio: id },
            relations: ['modulo', 'modulo.aplicativo'],
        });
        if (!servicio) throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
        return servicio;
    }

    async obtenerPorModulo(moduloId: string): Promise<Servicio[]> {
        return await this.repo.find({
            where: { moduloId },
            relations: ['modulo'],
        });
    }

    async actualizar(id: string, dto: UpdateServicioDto): Promise<Servicio> {
        const servicio = await this.obtenerPorId(id);
        Object.assign(servicio, dto);
        return await this.repo.save(servicio);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const servicio = await this.obtenerPorId(id);
        await this.repo.remove(servicio);
        return { mensaje: `Servicio con ID ${id} eliminado correctamente` };
    }
}
