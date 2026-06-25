import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, Between } from 'typeorm';
import { Curso } from '../../infrastructure/persistence/curso.entity';
import { Programa } from '../../../programas/infrastructure/persistence/programa.entity';
import { CreateCursoDto } from '../dtos/create-curso.dto';
import { UpdateCursoDto } from '../dtos/update-curso.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class CursosService {
    private get repo(): Repository<Curso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Curso);
    }

    async crear(dto: CreateCursoDto): Promise<Curso> {
        const data: any = { ...dto };

        // Mapea idFicha → codigo (formato migración frontend)
        if (!data.codigo && data.idFicha) {
            data.codigo = String(data.idFicha);
        }

        // Mapea fechas alternativas enviadas por el migrador
        if (!data.fechaInicio && data.fechaInicioFicha) {
            data.fechaInicio = data.fechaInicioFicha;
        }
        if (!data.finLectiva && data.fechaFinLectiva) {
            data.finLectiva = data.fechaFinLectiva;
        }

        // Resuelve nombrePrograma → programaId (upsert automático de programa)
        if (!data.programaId && data.nombrePrograma) {
            const programaRepo = CentroTenantContextService.getEpsasDataSource().getRepository(Programa);
            let programa = await programaRepo.findOne({
                where: { nombre: data.nombrePrograma },
            });
            if (!programa) {
                programa = programaRepo.create({ nombre: data.nombrePrograma });
                programa = await programaRepo.save(programa);
            }
            data.programaId = programa.idPrograma;
        }

        const curso = this.repo.create(data as Curso);
        return await this.repo.save(curso);
    }

    /** Verifica si un curso existe por código (ID FICHA).
     *  Retorna { exists: true, data: Curso } o { exists: false }
     */
    async verificarExistencia(codigo: string): Promise<{ exists: boolean; data?: Curso }> {
        if (!codigo) return { exists: false };

        const curso = await this.repo.findOne({
            where: { codigo },
            relations: ['programa', 'area'],
        });

        return curso ? { exists: true, data: curso } : { exists: false };
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['area', 'programa', 'lider', 'ambiente'] });
        return list.map(c => ({
            id: c.idCurso,
            idCurso: c.idCurso,
            codigo: c.codigo,
            estado: c.estado,
            fechaInicio: c.fechaInicio,
            fechaFin: c.fechaFin,
            finLectiva: c.finLectiva,
            programaId: c.programaId,
            programa_nombre: (c as any).programa?.nombre ?? null,
            areaId: c.areaId,
            area_nombre: (c as any).area?.nombre ?? null,
            liderId: c.liderId,
            lider_nombre: (c as any).lider
                ? `${(c as any).lider.nombre} ${(c as any).lider.apellido ?? ''}`.trim()
                : null,
            ambienteId: c.ambienteId,
            ambiente_nombre: (c as any).ambiente?.nombre ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Curso> {
        const curso = await this.repo.findOne({
            where: { idCurso: id },
            relations: [
                'area',
                'area.sede',
                'programa',
                'lider',
                'lider.municipio',
                'matriculas',
                'matriculas.persona',
            ],
        });
        if (!curso) throw new NotFoundException(`Curso con ID ${id} no encontrado`);
        return curso;
    }

    // Cursos por área
    async obtenerPorArea(areaId: string): Promise<Curso[]> {
        return await this.repo.find({
            where: { areaId },
            relations: ['area', 'programa', 'lider'],
        });
    }

    // Cursos por programa
    async obtenerPorPrograma(programaId: string): Promise<Curso[]> {
        return await this.repo.find({
            where: { programaId },
            relations: ['area', 'programa', 'lider', 'matriculas'],
        });
    }

    // Cursos por líder (instructor)
    async obtenerPorLider(liderId: string): Promise<Curso[]> {
        return await this.repo.find({
            where: { liderId },
            relations: ['area', 'programa', 'matriculas'],
        });
    }

    // Cursos activos (fecha actual entre fechaInicio y fechaFin)
    async obtenerActivos(): Promise<Curso[]> {
        const hoy = new Date();
        return await this.repo.find({
            where: {
                fechaInicio: Between(new Date('2000-01-01'), hoy),
                fechaFin: Between(hoy, new Date('2100-01-01')),
            },
            relations: ['area', 'programa', 'lider'],
        });
    }

    // Curso con todos sus aprendices matriculados
    async obtenerConAprendices(id: string): Promise<Curso> {
        const curso = await this.repo.findOne({
            where: { idCurso: id },
            relations: [
                'matriculas',
                'matriculas.persona',
                'matriculas.persona.municipio',
                'lider',
                'programa',
                'area',
            ],
        });
        if (!curso) throw new NotFoundException(`Curso con ID ${id} no encontrado`);
        return curso;
    }

    async actualizar(id: string, dto: UpdateCursoDto): Promise<Curso> {
        const curso = await this.obtenerPorId(id);
        Object.assign(curso, dto);
        return await this.repo.save(curso);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const curso = await this.obtenerPorId(id);
        await this.repo.remove(curso);
        return { mensaje: `Curso con ID ${id} eliminado correctamente` };
    }
}
