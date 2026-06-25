import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Permiso } from '../../infrastructure/persistence/permiso.entity';
import { CreatePermisoDto } from '../dtos/create-permisos.dto';
import { UpdatePermisoDto } from '../dtos/update-permisos.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class PermisoService {
    private get repo(): Repository<Permiso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Permiso);
    }

    async crear(dto: CreatePermisoDto): Promise<Permiso> {
        const entity = this.repo.create({
            usuarioId: dto.usuarioId,
            rolId: dto.rolId,
            servicioId: dto.servicioId,
        } as any) as unknown as Permiso;
        return await this.repo.save(entity);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({
            relations: ['usuario', 'usuario.persona', 'rol', 'servicio'],
        });
        return list.map(p => ({
            id: String(p.idPermiso),
            idPermiso: String(p.idPermiso),
            usuarioId: p.usuarioId,
            usuario_nombre: (p as any).usuario?.persona
                ? `${(p as any).usuario.persona.nombre} ${(p as any).usuario.persona.apellido ?? ''}`.trim()
                : null,
            rolId: p.rolId,
            rol_nombre: (p as any).rol?.nombre ?? null,
            servicioId: String(p.servicioId),
            servicio_nombre: (p as any).servicio?.nombre ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Permiso> {
        const permiso = await this.repo.findOne({
            where: { idPermiso: id },
            relations: ['usuario', 'usuario.persona', 'rol', 'servicio', 'servicio.modulo'],
        });
        if (!permiso) throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
        return permiso;
    }

    // Permisos de un usuario — lo que puede hacer
    async obtenerPorUsuario(usuarioId: string): Promise<Permiso[]> {
        return await this.repo.find({
            where: { usuarioId },
            relations: ['rol', 'servicio', 'servicio.modulo', 'servicio.modulo.aplicativo'],
        });
    }

    // Permisos de un rol — todos los usuarios con ese rol
    async obtenerPorRol(rolId: string): Promise<Permiso[]> {
        return await this.repo.find({
            where: { rolId },
            relations: ['usuario', 'usuario.persona', 'servicio'],
        });
    }

    // Permisos de un servicio — quién puede acceder
    async obtenerPorServicio(servicioId: string): Promise<Permiso[]> {
        return await this.repo.find({
            where: { servicioId },
            relations: ['usuario', 'usuario.persona', 'rol'],
        });
    }

    async actualizar(id: string, dto: UpdatePermisoDto): Promise<Permiso> {
        const permiso = await this.obtenerPorId(id);
        Object.assign(permiso, dto);
        return await this.repo.save(permiso);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const permiso = await this.obtenerPorId(id);
        await this.repo.remove(permiso);
        return { mensaje: `Permiso con ID ${id} eliminado correctamente` };
    }
}
