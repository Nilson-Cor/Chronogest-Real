import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Rol } from '../../infrastructure/persistence/rol.entity';
import { UpdateRolDto } from '../dtos/update.roles.dto';
import { CreateRolDto } from '../dtos/create-roles.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class rolService {
    private get repo(): Repository<Rol> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Rol);
    }

    // Crear un aplicativo
    async crear(dto: CreateRolDto): Promise<Rol> {
        const rol = this.repo.create(dto);
        return await this.repo.save(rol);
    }

    // Obtener todos los roles
    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['aplicativo'] });
        return list.map(r => ({
            id: r.idRol,
            idRol: r.idRol,
            nombre: r.nombre,
            aplicativoId: r.aplicativoId,
            aplicativo_nombre: (r as any).aplicativo?.nombre ?? null,
        }));
    }

    // Obtener un aplicativo por ID
    async obtenerPorId(id: string): Promise<Rol> {
        const rol = await this.repo.findOne({ where: { idRol: id } });
        if (!rol) {
            throw new NotFoundException(`Rol con ID ${id} no encontrado`);
        }
        return rol;
    }

    // Actualizar un aplicativo
    async actualizar(id: string, dto: UpdateRolDto): Promise<Rol> {
        const rol = await this.obtenerPorId(id);
        Object.assign(rol, dto);
        return await this.repo.save(rol);
    }

    // Eliminar un aplicativo
    async eliminar(id: string): Promise<{ mensaje: string }> {
        const rol = await this.obtenerPorId(id);
        await this.repo.remove(rol);
        return { mensaje: `Rol con ID ${id} eliminado correctamente` };
    }
}
