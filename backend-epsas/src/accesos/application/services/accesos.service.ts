import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Acceso } from '../../infrastructure/persistence/acceso.entity';
import { CreateAccesoDto } from '../dtos/create-acceso.dto';
import { UpdateAccesoDto } from '../dtos/update-acceso.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class accesoService {
    private get repo(): Repository<Acceso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Acceso);
    }

    // Crear un aplicativo
    async create(dto: CreateAccesoDto): Promise<Acceso> {
        const accesos = this.repo.create(dto);
        return await this.repo.save(accesos);
    }

    // Obtener todos los aplicativos
    async findAll(): Promise<Acceso[]> {
        return await this.repo.find();
    }

    // Obtener un aplicativo por ID
    async findOne(id: string): Promise<Acceso> {
        const accesos = await this.repo.findOne({ where: { idAcceso: id } });
        if (!accesos) {
            throw new NotFoundException(`Acceso con ID ${id} no encontrado`);
        }
        return accesos;
    }

    // Actualizar un aplicativo
    async update(id: string, dto: UpdateAccesoDto): Promise<Acceso> {
        const accesos = await this.findOne(id);
        Object.assign(accesos, dto);
        return await this.repo.save(accesos);
    }

    // Eliminar un aplicativo
    async remove(id: string): Promise<{ mensaje: string }> {
        const accesos = await this.findOne(id);
        await this.repo.remove(accesos);
        return { mensaje: `Acceso con ID ${id} eliminado correctamente` };
    }
}
