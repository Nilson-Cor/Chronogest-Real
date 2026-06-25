import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Credencial } from '../../infrastructure/persistence/credencial.entity';
import { CreateCredencialDto } from '../dtos/create-credencial.dto';
import { UpdateCredencialDto } from '../dtos/update-credencial.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class credencialService {
    private get repo(): Repository<Credencial> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Credencial);
    }

    // Crear un aplicativo
    async crear(dto: CreateCredencialDto): Promise<Credencial> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const credencial = this.repo.create({
        login: dto.login,
        password: hashedPassword,

        rol: { idRol: dto.rolId } as any,
        usuario: { idUsuario: dto.usuarioId } as any,
    });

    return await this.repo.save(credencial);
}

    // Obtener todas las credenciales
    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({
            relations: ['rol', 'usuario', 'usuario.persona'],
        });
        return list.map(c => ({
            id: c.idCredencial,
            idCredencial: c.idCredencial,
            login: c.login,
            usuarioId: (c as any).usuario?.idUsuario ?? null,
            usuario_nombre: (c as any).usuario?.persona
                ? `${(c as any).usuario.persona.nombre} ${(c as any).usuario.persona.apellido ?? ''}`.trim()
                : null,
            rolId: (c as any).rol?.idRol ?? null,
            rol_nombre: (c as any).rol?.nombre ?? null,
        }));
    }

    // Obtener un aplicativo por ID
    async obtenerPorId(id: string): Promise<Credencial> {
        const credencial = await this.repo.findOne({ where: { idCredencial: id } });
        if (!credencial) {
            throw new NotFoundException(`Credenciall con ID ${id} no encontrado`);
        }
        return credencial;
    }

    // Actualizar un aplicativo
    async actualizar(id: string, dto: UpdateCredencialDto): Promise<Credencial> {
        const credencial = await this.obtenerPorId(id);

        if (dto.password) {
            dto.password = await bcrypt.hash(dto.password, 10);
        }

        Object.assign(credencial, dto);
        return await this.repo.save(credencial);
    }

    // Eliminar un aplicativo
    async eliminar(id: string): Promise<{ mensaje: string }> {
        const credencial = await this.obtenerPorId(id);
        await this.repo.remove(credencial);
        return { mensaje: `Credencial con ID ${id} eliminado correctamente` };
    }
}
