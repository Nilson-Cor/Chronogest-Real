import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Programa } from '../../infrastructure/persistence/programa.entity';
import { CreateProgramaDto } from '../dtos/create-programa.dto';
import { UpdateProgramaDto } from '../dtos/update-programa.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class ProgramasService {
    private get repo(): Repository<Programa> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Programa);
    }

    async crear(dto: CreateProgramaDto): Promise<Programa> {
        const programa = this.repo.create(dto);
        return await this.repo.save(programa);
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find();
        return list.map(p => ({
            id: p.idPrograma,
            idPrograma: p.idPrograma,
            nombre: p.nombre,
            tipo: p.tipo,
        }));
    }

    async obtenerPorId(id: string): Promise<Programa> {
        const programa = await this.repo.findOne({
            where: { idPrograma: id },
            relations: ['cursos', 'cursos.area', 'cursos.lider'],
         });
        if (!programa) throw new NotFoundException(`Programa con ID ${id} no encontrado`);
        return programa;
    }

    async obtenerPorTipo(tipo: string): Promise<Programa[]> {
        return await this.repo.find({
            where: { tipo: tipo as any },
            relations: ['cursos'],
        });
    }

    async actualizar(id: string, dto: UpdateProgramaDto): Promise<Programa> {
        const programa = await this.obtenerPorId(id);
        Object.assign(programa, dto);
        return await this.repo.save(programa);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const programa = await this.obtenerPorId(id);
        await this.repo.remove(programa);
        return { mensaje: `Programa con ID ${id} eliminado correctamente` };
    }
}
