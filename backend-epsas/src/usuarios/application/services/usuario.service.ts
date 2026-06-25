import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Usuario } from '../../infrastructure/persistence/usuario.entity';
import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';
import { Acceso } from '../../../accesos/infrastructure/persistence/acceso.entity';
import { Credencial } from '../../../credenciales/infrastructure/persistence/credencial.entity';
import { Permiso } from '../../../permisos/infrastructure/persistence/permiso.entity';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class usuarioService {
    private get repo(): Repository<Usuario> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Usuario);
    }

    // Crear un aplicativo
    async crear(dto: CreateUsuarioDto): Promise<Usuario> {

    const usuario = this.repo.create({
        persona: { idPersona: dto.personaId } as any,
        aplicativo: { idAplicativo: dto.aplicativoId } as any,
        estado: dto.estado ?? 'activo',
    });

    return await this.repo.save(usuario);
}


    // Obtener todos los usuarios
    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['persona', 'aplicativo'] });
        return list.map(u => ({
            id: u.idUsuario,
            idUsuario: u.idUsuario,
            estado: u.estado,
            personaId: (u as any).persona?.idPersona ?? null,
            persona_nombre: (u as any).persona
                ? `${(u as any).persona.nombre} ${(u as any).persona.apellido ?? ''}`.trim()
                : null,
            persona_doc: (u as any).persona?.cedula ?? null,
            cargo: (u as any).persona?.cargo ?? null,
            aplicativoId: (u as any).aplicativo?.idAplicativo ?? null,
            aplicativo_nombre: (u as any).aplicativo?.nombre ?? null,
        }));
    }

    // Obtener un aplicativo por ID
    async obtenerPorId(id: string): Promise<Usuario> {
        const usuario = await this.repo.findOne({ where: { idUsuario: id } });
        if (!usuario) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return usuario;
    }

    // Actualizar un aplicativo
    async actualizar(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
        const usuario = await this.obtenerPorId(id);
        Object.assign(usuario, dto);
        return await this.repo.save(usuario);
    }

    // Eliminar un aplicativo
    async eliminar(id: string): Promise<{ mensaje: string }> {
        const usuario = await this.obtenerPorId(id);
        const dataSource = CentroTenantContextService.getEpsasDataSource();
        await dataSource.transaction(async manager => {
            await manager.createQueryBuilder().delete().from(Acceso).where('"usuario" = :id', { id }).execute();
            await manager.createQueryBuilder().delete().from(Permiso).where('"usuario" = :id', { id }).execute();
            await manager.createQueryBuilder().delete().from(Credencial).where('"usuario" = :id', { id }).execute();
            await manager.remove(usuario);
        });
        return { mensaje: `Usuario con ID ${id} eliminado correctamente` };
    }
}
