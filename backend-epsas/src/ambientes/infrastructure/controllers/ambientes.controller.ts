import {
    Controller, Get, Post, Body, Patch, Param,
    Delete, UseGuards, Query,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { AmbientesService } from '../../application/services/ambientes.service';
import { CreateAmbienteDto } from '../../application/dtos/create-ambiente.dto';
import { UpdateAmbienteDto } from '../../application/dtos/update-ambiente.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { Ambiente } from '../persistence/ambiente.entity';
import { AsignacionHorario } from '../../../horarios-cg/infrastructure/persistence/asignacion-horario.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Controller('ambientes')
@UseGuards(JwtAuthGuard)
export class AmbientesController {
    constructor(
        private readonly ambientesService: AmbientesService,
    ) {}

    private get ambienteRepo(): Repository<Ambiente> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Ambiente);
    }

    private get personaRepo(): Repository<Persona> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
    }

    private get cursoRepo(): Repository<Curso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Curso);
    }

    // AsignacionHorario vive en horarios_db — DataSource distinta a la de epsas_db
    private get asignacionRepo(): Repository<AsignacionHorario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(AsignacionHorario);
    }

    @Post()
    crear(@Body() dto: CreateAmbienteDto) { return this.ambientesService.crear(dto); }

    @Get()
    obtenerTodos() { return this.ambientesService.obtenerTodos(); }

    /** Rutas estaticas ANTES de :id - NestJS prioriza estaticas sobre dinamicas */

    /** GET /api/ambientes/tipos — lista de tipos únicos (Aula, Laboratorio, Auditorio, etc.) */
    @Get('tipos')
    tipos() { return this.ambientesService.obtenerTipos(); }

    @Get('disponibilidad')
    async disponibilidad(
        @Query('dia') dia?: string,
        @Query('jornada') jornada?: string,
        @Query('hora') hora?: string,
    ) {
        const todos = await this.ambienteRepo.find({ relations: ['area'] });

        const mapAmb = (a: Ambiente, disponible: boolean, prog: string | null, ficha: string | null) => ({
            id: a.idAmbiente, idAmbiente: a.idAmbiente, nombre: a.nombre, tipo: a.tipo,
            capacidad: a.capacidad, areaId: a.areaId, area_nombre: (a.area as any)?.nombre ?? null,
            disponible, programaOcupado: prog, fichaOcupado: ficha,
        });

        if (!dia && !jornada && !hora) {
            return todos.map(a => mapAmb(a, true, null, null));
        }

        let qb = this.asignacionRepo
            .createQueryBuilder('a')
            .innerJoin('a.horario', 'h');

        if (dia)    qb = qb.andWhere('h.dia_semana = :dia', { dia });
        if (jornada) qb = qb.andWhere('h.jornada = :jornada', { jornada });
        if (hora)   qb = qb.andWhere('h.hora_inicio <= :hora AND h.hora_fin >= :hora', { hora });

        const ocupados = await qb
            .select('a.ambiente_id', 'ambienteId')
            .addSelect('a.ficha_id', 'fichaId')
            .getRawMany();

        const fichaIds = [...new Set(ocupados.map((o: any) => o.fichaId).filter(Boolean))];
        const fichas = fichaIds.length
            ? await this.cursoRepo.find({ where: { idCurso: In(fichaIds) } })
            : [];
        const fichaMap = new Map(fichas.map(f => [f.idCurso, f]));

        const ocupadoMap = new Map<string, { programa: string | null; ficha: string | null }>();
        for (const o of ocupados) {
            if (o.ambienteId) {
                const curso = o.fichaId ? fichaMap.get(o.fichaId) : null;
                ocupadoMap.set(o.ambienteId, {
                    programa: (curso?.programa as any)?.nombre ?? null,
                    ficha: curso?.codigo ?? null,
                });
            }
        }

        return todos.map(a => mapAmb(
            a,
            !ocupadoMap.has(a.idAmbiente),
            ocupadoMap.get(a.idAmbiente)?.programa ?? null,
            ocupadoMap.get(a.idAmbiente)?.ficha ?? null,
        ));
    }

    @Get('libres-ahora')
    async libresAhora() {
        const todos   = await this.ambienteRepo.find();
        const activos = await this.asignacionRepo.find({ where: { activo: true } });
        const ocupadosSet = new Set(activos.map(a => a.ambienteId).filter(Boolean));
        return todos.filter(a => !ocupadosSet.has(a.idAmbiente));
    }

    @Get('disponibles-transversal')
    async disponiblesTransversal(@Query('dia') dia: string, @Query('jornada') jornada: string) {
        await this._deactivateStale();
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const diaHoy = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][now.getDay()];
        const pad = (n: number) => String(n).padStart(2, '0');
        const todayStr = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());

        const todos = await this.ambienteRepo.find({ relations: ['area'] });
        // Asignaciones para ese dia/jornada (JOIN con horario para filtrar por dia_semana y jornada)
        const asignaciones = await this.asignacionRepo
            .createQueryBuilder('a')
            .innerJoinAndSelect('a.horario', 'h')
            .where('h.dia_semana = :dia', { dia })
            .andWhere('h.jornada = :jornada', { jornada })
            .getMany();

        const asignPorAmb = new Map<string, AsignacionHorario>();
        for (const a of asignaciones) { if (a.ambienteId) asignPorAmb.set(a.ambienteId, a); }

        const isActive = (a: AsignacionHorario) => {
            if (!a.activo || a.horario?.diaSemana !== diaHoy || !a.ultimaActivacion) return false;
            const d = new Date(a.ultimaActivacion);
            const day = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
            if (day !== todayStr) return false;
            const [hh, mm] = (a.horario?.horaFin ?? '23:59').split(':').map(Number);
            return nowMin <= hh * 60 + mm;
        };

        const conflictos = [...asignPorAmb.values()].filter(a => !isActive(a));
        const instrIds = [...new Set(conflictos.map(a => a.instructorId).filter(Boolean))] as string[];
        const fichaIds = [...new Set(conflictos.map(a => a.fichaId).filter(Boolean))] as string[];
        const [personas, fichas] = await Promise.all([
            instrIds.length ? this.personaRepo.find({ where: { idPersona: In(instrIds) } }) : Promise.resolve([]),
            fichaIds.length ? this.cursoRepo.find({ where: { idCurso: In(fichaIds) } }) : Promise.resolve([]),
        ]);
        const pMap = new Map(personas.map((p: any) => [p.idPersona, ((p.nombre ?? '') + ' ' + (p.apellido ?? '')).trim()]));
        const fMap = new Map(fichas.map((f: any) => [f.idCurso, f.codigo ?? '']));

        const result: any[] = [];
        for (const a of todos) {
            const asig = asignPorAmb.get(a.idAmbiente);
            if (!asig) {
                result.push({ id: a.idAmbiente, nombre: a.nombre, area_nombre: (a.area as any)?.nombre ?? null, estado: 'libre' });
            } else if (!isActive(asig)) {
                result.push({ id: a.idAmbiente, nombre: a.nombre, area_nombre: (a.area as any)?.nombre ?? null, estado: 'conflicto',
                    horario: { horaInicio: asig.horario?.horaInicio, horaFin: asig.horario?.horaFin, minutosRetraso: asig.minutosRetraso ?? 0,
                        instructor: pMap.get(asig.instructorId ?? '') ?? null, ficha: fMap.get(asig.fichaId ?? '') ?? null } });
            }
        }
        return result;
    }

    /** Ruta dinamica al final */
    @Get(':id')
    obtenerPorId(@Param('id') id: string) { return this.ambientesService.obtenerPorId(id); }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateAmbienteDto) { return this.ambientesService.actualizar(id, dto); }

    @Delete(':id')
    eliminar(@Param('id') id: string) { return this.ambientesService.eliminar(id); }

    private async _deactivateStale(): Promise<void> {
        const pad2 = (n: number) => String(n).padStart(2, '0');
        const now    = new Date();
        const today  = now.getFullYear() + '-' + pad2(now.getMonth()+1) + '-' + pad2(now.getDate());
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const activos = await this.asignacionRepo.find({ where: { activo: true }, relations: ['horario'] });
        const stale = activos.filter(a => {
            if (!a.ultimaActivacion) return true;
            const d   = new Date(a.ultimaActivacion);
            const day = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
            if (day !== today) return true;
            if (!a.horario?.horaFin) return false;
            const [hh, mm] = a.horario.horaFin.split(':').map(Number);
            return nowMin > hh * 60 + mm;
        });
        if (stale.length) { for (const a of stale) a.activo = false; await this.asignacionRepo.save(stale); }
    }
}