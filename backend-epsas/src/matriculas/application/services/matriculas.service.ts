import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Matricula } from '../../infrastructure/persistence/matricula.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { CreateMatriculaDto } from '../dtos/create-matricula.dto';
import { UpdateMatriculaDto } from '../dtos/update-matricula.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class MatriculasService {
    private get repo(): Repository<Matricula> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Matricula);
    }

    async crear(dto: CreateMatriculaDto): Promise<Matricula> {
        const dtoAny = dto as any;

        // Modo migración: resuelve por cédula + código de ficha
        if (dtoAny.cedula && dtoAny.fichaNumero) {
            const dataSource = CentroTenantContextService.getEpsasDataSource();
            const personaRepo = dataSource.getRepository(Persona);
            const cursoRepo   = dataSource.getRepository(Curso);

            const persona = await personaRepo.findOne({
                where: { cedula: +dtoAny.cedula },
            });
            if (!persona) {
                throw new NotFoundException(
                    `Persona con cédula ${dtoAny.cedula} no encontrada al crear matrícula`,
                );
            }

            const curso = await cursoRepo.findOne({
                where: { codigo: String(dtoAny.fichaNumero) },
            });
            if (!curso) {
                throw new NotFoundException(
                    `Curso con código ${dtoAny.fichaNumero} no encontrado al crear matrícula`,
                );
            }

            // Estado original del Excel (certificado, cancelado, etc.) queda en
            // matriculas.estado como referencia local; la lógica de negocio
            // detallada se procesa en la base secundaria del ERP aparte.
            const matricula = new Matricula();
            matricula.idPersona = persona.idPersona;
            matricula.idCurso   = curso.idCurso;
            matricula.persona   = persona;
            matricula.curso     = curso;
            matricula.estado        = dtoAny.estado ?? null;
            matricula.fechaMatricula = dtoAny.fechaMatricula ? new Date(dtoAny.fechaMatricula) : null;

            return await this.repo.save(matricula);
        }

        // Modo normal: UUIDs directos
        const matricula = new Matricula();
        matricula.idPersona      = dto.persona!;
        matricula.idCurso        = dto.curso!;
        matricula.persona        = { idPersona: dto.persona } as Persona;
        matricula.curso          = { idCurso: dto.curso } as Curso;
        matricula.estado         = (dto as any).estado ?? null;
        matricula.fechaMatricula = (dto as any).fechaMatricula ? new Date((dto as any).fechaMatricula) : null;
        return await this.repo.save(matricula);
    }

    /** Verifica si una matrícula existe buscando por cédula + código de ficha.
     *  Retorna { exists: true, data: Matricula } o { exists: false }
     */
    async verificarExistencia(
        cedula: number,
        fichaNumero: string,
    ): Promise<{ exists: boolean; data?: Matricula }> {
        if (!cedula || !fichaNumero) return { exists: false };

        const matricula = await this.repo
            .createQueryBuilder('m')
            .innerJoinAndSelect('m.persona', 'p')
            .innerJoinAndSelect('m.curso', 'c')
            .where('CAST(p.cedula AS BIGINT) = :cedula', { cedula })
            .andWhere('c.codigo = :fichaNumero', { fichaNumero })
            .getOne();

        return matricula ? { exists: true, data: matricula } : { exists: false };
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({
            relations: ['persona', 'curso', 'curso.programa', 'curso.area'],
        });
        return list.map(m => ({
            id: m.idMatricula,
            idMatricula: m.idMatricula,
            personaId: m.idPersona,
            cursoId: m.idCurso,
            persona_nombre: m.persona
                ? `${m.persona.nombre} ${(m.persona as any).apellido ?? ''}`.trim()
                : null,
            persona_doc: (m.persona as any)?.cedula ?? null,
            curso_codigo: (m.curso as any)?.codigo ?? null,
            fecha_matricula: m.fechaMatricula,
            fechaMatricula: m.fechaMatricula,
            estado: m.estado,
            avance: m.avance,
        }));
    }

    async obtenerPorId(id: string): Promise<Matricula> {
        const matricula = await this.repo.findOne({
            where: { idMatricula: id },
            relations: [
                'persona',
                'persona.municipio',
                'curso',
                'curso.programa',
                'curso.area',
                'curso.lider',
            ],
        });
        if (!matricula) throw new NotFoundException(`Matrícula con ID ${id} no encontrada`);
        return matricula;
    }

    async obtenerPorPersona(idPersona: string): Promise<Matricula[]> {
        return await this.repo.find({
            where: { idPersona },
            relations: ['curso', 'curso.programa', 'curso.area', 'curso.lider'],
        });
    }

    // Matrículas de un curso — lista de aprendices
    async obtenerPorCurso(idCurso: string): Promise<Matricula[]> {
        return await this.repo.find({
            where: { idCurso },
            relations: ['persona', 'persona.municipio'],
        });
    }
    async actualizarAvance(id: string, avance: number): Promise<{ avance: number }> {
        await this.repo
            .createQueryBuilder()
            .update(Matricula)
            .set({ avance })
            .where('idMatricula = :id', { id })
            .execute();
        return { avance };
    }

    async actualizar(id: string, dto: UpdateMatriculaDto): Promise<Matricula> {
        const matricula = await this.obtenerPorId(id);
        Object.assign(matricula, dto);
        return await this.repo.save(matricula);
    }

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const matricula = await this.obtenerPorId(id);
        await this.repo.remove(matricula);
        return { mensaje: `Matrícula con ID ${id} eliminada correctamente` };
    }
}
