import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Departamento } from '../../infrastructure/persistence/departamento.entity';
import { CreateDepartamentoDto } from '../dtos/create-departamento.dto';
import { UpdateDepartamentoDto } from '../dtos/update-departamento.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class DepartamentosService {
    private get repo(): Repository<Departamento> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Departamento);
    }

    // Crear un departamento
    async crear(dto: CreateDepartamentoDto): Promise<Departamento> {
        const departamento = this.repo.create(dto);
        return await this.repo.save(departamento);
    }

    // Obtener todos los departamentos
    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find();
        return list.map(d => ({
            id: d.idDepartamento,
            idDepartamento: d.idDepartamento,
            nombre: d.nombre,
        }));
    }

    // Obtener un departamento por ID
    async obtenerPorId(id: string): Promise<Departamento> {
        const departamento = await this.repo.findOne({
            where: { idDepartamento: id },
            relations: ['municipios'],
        });
        if (!departamento) {
            throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
        }
        return departamento;
    }

    // Actualizar un departamento
    async actualizar(id: string, dto: UpdateDepartamentoDto): Promise<Departamento> {
        const departamento = await this.obtenerPorId(id);
        Object.assign(departamento, dto);
        return await this.repo.save(departamento);
    }

    // Eliminar un departamento
    async eliminar(id: string): Promise<{ mensaje: string }> {
        const departamento = await this.obtenerPorId(id);
        await this.repo.remove(departamento);
        return { mensaje: `Departamento con ID ${id} eliminado correctamente` };
    }
}
