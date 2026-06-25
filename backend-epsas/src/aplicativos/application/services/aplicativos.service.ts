import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Aplicativo } from '../../infrastructure/persistence/aplicativo.entity';
import { CreateAplicativoDto } from '../dtos/create-aplicativo.dto';
import { UpdateAplicativoDto } from '../dtos/update-aplicativo.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class aplicativosService {
    private get repo(): Repository<Aplicativo> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Aplicativo);
    }

    // Crear un aplicativo
    async crear(dto: CreateAplicativoDto): Promise<Aplicativo> {
        const aplicativo = this.repo.create(dto);
        return await this.repo.save(aplicativo);
    }

    // Obtener todos los aplicativos
    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find();
        return list.map(a => ({
            id: a.idAplicativo,
            idAplicativo: a.idAplicativo,
            nombre: a.nombre,
        }));
    }

    // Obtener un aplicativo por ID
    async obtenerPorId(id: string): Promise<Aplicativo> {
        const aplicativo = await this.repo.findOne({
            where: { idAplicativo: id },
        });
        if (!aplicativo) {
            throw new NotFoundException(`Aplicativo con ID ${id} no encontrado`);
        }
        return aplicativo;
    }

    // Retorna el menú completo para una app — módulos y servicios habilitados
    async obtenerMenu(id: string): Promise<Aplicativo> {
        const aplicativo = await this.repo.findOne({
            where: { idAplicativo: id },
            relations: [
                'modulos',
                'modulos.servicios',
                'roles',
                'roles.permisos',
                'roles.permisos.servicio',
            ],
        });
        if (!aplicativo) throw new NotFoundException(`Aplicativo con ID ${id} no encontrado`);
        return aplicativo;
    }

    // Actualizar un aplicativo
    async actualizar(id: string, dto: UpdateAplicativoDto): Promise<Aplicativo> {
        const aplicativo = await this.obtenerPorId(id);
        Object.assign(aplicativo, dto);
        return await this.repo.save(aplicativo);
    }

    // Eliminar un aplicativo
    async eliminar(id: string): Promise<{ mensaje: string }> {
        const aplicativo = await this.obtenerPorId(id);
        await this.repo.remove(aplicativo);
        return { mensaje: `Aplicativo con ID ${id} eliminado correctamente` };
    }
}
