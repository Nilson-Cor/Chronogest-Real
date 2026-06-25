import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { AsignacionHorario } from '../persistence/asignacion-horario.entity';
import { Competencia } from '../persistence/competencia.entity';
import { SolicitudCambio } from '../persistence/solicitud-cambio.entity';
import { Evento } from '../persistence/evento.entity';
import { Notificacion } from '../../../notificaciones/infrastructure/persistence/notificacion.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { Ambiente } from '../../../ambientes/infrastructure/persistence/ambiente.entity';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { HorariosService } from '../../application/services/horarios.service';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@UseGuards(JwtAuthGuard)
@Controller('horarios-admin')
export class HorariosAdminController {
    constructor(private readonly horariosService: HorariosService) {}

    private get asignacionRepo(): Repository<AsignacionHorario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(AsignacionHorario);
    }

    private get competenciaRepo(): Repository<Competencia> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Competencia);
    }

    private get solicitudRepo(): Repository<SolicitudCambio> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(SolicitudCambio);
    }

    private get eventoRepo(): Repository<Evento> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Evento);
    }

    private get notiRepo(): Repository<Notificacion> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Notificacion);
    }

    private get personaRepo(): Repository<Persona> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
    }

    private get cursoRepo(): Repository<Curso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Curso);
    }

    private get ambienteRepo(): Repository<Ambiente> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Ambiente);
    }

    private get aplicativoRepo(): Repository<Aplicativo> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Aplicativo);
    }

    private nombreCompleto(p: Persona | undefined | null): string | null {
        if (!p) return null;
        return (`${p.nombre ?? ''} ${(p as any).apellido ?? ''}`).trim() || null;
    }

    @Get('horarios')
    async getHorarios() {
        await this.horariosService.deactivateStale().catch(() => {});
        // Ahora consultamos asignaciones (que contienen instructor, ficha, ambiente)
        // y cargamos la relacion horario (plantilla de tiempo)
        const list = await this.asignacionRepo.find({ relations: ['horario'] });
        const instructorIds = [...new Set(list.map(a => a.instructorId).filter((v): v is string => !!v))];
        const fichaIds      = [...new Set(list.map(a => a.fichaId).filter((v): v is string => !!v))];
        const ambienteIds   = [...new Set(list.map(a => a.ambienteId).filter((v): v is string => !!v))];
        const instructores  = instructorIds.length ? await this.personaRepo.findByIds(instructorIds) : [] as Persona[];
        const fichas        = fichaIds.length      ? await this.cursoRepo.findByIds(fichaIds)        : [] as Curso[];
        const ambientes     = ambienteIds.length   ? await this.ambienteRepo.findByIds(ambienteIds)  : [] as Ambiente[];
        const iMap = new Map<string, Persona>(instructores.map(p => [p.idPersona, p] as [string, Persona]));
        const fMap = new Map<string, Curso>(fichas.map(c => [c.idCurso, c] as [string, Curso]));
        const aMap = new Map<string, Ambiente>(ambientes.map(a => [a.idAmbiente, a] as [string, Ambiente]));
        return list
            .sort((a, b) => {
                const da = (a.horario?.diaSemana ?? '') + (a.horario?.horaInicio ?? '');
                const db = (b.horario?.diaSemana ?? '') + (b.horario?.horaInicio ?? '');
                return da.localeCompare(db);
            })
            .map(a => ({
                id:                a.id,
                dia_semana:        a.horario?.diaSemana,
                jornada:           a.horario?.jornada,
                hora_inicio:       a.horario?.horaInicio,
                hora_fin:          a.horario?.horaFin,
                ficha_codigo:      a.fichaId    ? (fMap.get(a.fichaId)?.codigo    ?? null) : null,
                instructor_nombre: a.instructorId ? this.nombreCompleto(iMap.get(a.instructorId) ?? null) : null,
                ambiente_nombre:   a.ambienteId ? (aMap.get(a.ambienteId)?.nombre ?? null) : null,
                activo:            a.activo,
            }));
    }

    @Delete('horarios/:id')
    async deleteHorario(@Param('id') id: string) {
        // id = asignacion.id; el service elimina la asignacion y la plantilla si queda huerfana
        await this.horariosService.remove(id).catch(() => {});
        return { ok: true };
    }

    @Get('competencias')
    async getCompetencias() {
        // Cargar competencias con asignacion y horario anidado
        const list = await this.competenciaRepo.find({
            relations: ['asignacion', 'asignacion.horario'],
            order: { createdAt: 'DESC' },
        });

        const resolveInstructorId = (c: Competencia): string | null =>
            c.instructorId ?? (c.asignacion as any)?.instructorId ?? null;
        const resolveFichaId = (c: Competencia): string | null =>
            c.fichaId ?? (c.asignacion as any)?.fichaId ?? null;

        const instructorIds = [...new Set(list.map(resolveInstructorId).filter((v): v is string => !!v))];
        const fichaIds      = [...new Set(list.map(resolveFichaId).filter((v): v is string => !!v))];
        const instructores  = instructorIds.length ? await this.personaRepo.findByIds(instructorIds) : [] as Persona[];
        const fichas        = fichaIds.length      ? await this.cursoRepo.findByIds(fichaIds)        : [] as Curso[];
        const iMap = new Map<string, Persona>(instructores.map(p => [p.idPersona, p] as [string, Persona]));
        const fMap = new Map<string, Curso>(fichas.map(c => [c.idCurso, c] as [string, Curso]));
        return list.map(c => {
            const instrId = resolveInstructorId(c);
            const fichaId = resolveFichaId(c);
            const ficha = fichaId ? fMap.get(fichaId) : null;
            return {
                // Campos de identificación
                id:                c.id,
                nombre:            c.nombre,
                resultados:        c.resultados ?? [],
                createdAt:         c.createdAt,
                // Campos resueltos (instructor, ficha)
                instructor_nombre: instrId ? this.nombreCompleto(iMap.get(instrId) ?? null) : null,
                ficha_codigo:      ficha?.codigo ?? null,
                ficha_programa:    (ficha as any)?.programa?.nombre ?? null,
                // Día y hora del horario (via asignacion → horario)
                dia_semana:        (c.asignacion as any)?.horario?.diaSemana  ?? null,
                hora_inicio:       (c.asignacion as any)?.horario?.horaInicio ?? null,
                hora_fin:          (c.asignacion as any)?.horario?.horaFin    ?? null,
                // Período de la competencia
                fecha_inicio:      c.fechaInicio,
                fecha_fin:         c.fechaFin,
                // Horas de formación
                horas_requeridas:  c.horasRequeridas,
                diasClase:         c.diasClase ?? [],
                dias_clase_count:  c.diasClase?.length ?? 0,
                // Horario completo (para calcHorasCompetencia y popover de días)
                horario:           (c.asignacion as any)?.horario ?? null,
            };
        });
    }

    @Delete('competencias/:id')
    async deleteCompetencia(@Param('id') id: string) {
        await this.competenciaRepo.delete(id);
        return { ok: true };
    }

    @Get('eventos')
    async getEventos() {
        const eventos = await this.eventoRepo.find({ order: { fechaInicio: 'ASC' } });
        const ids = [...new Set(eventos.map(e => e.ubicacionId).filter((v): v is string => !!v))];
        const ambientes = ids.length ? await this.ambienteRepo.findByIds(ids) : [];
        const map = new Map(ambientes.map(a => [a.idAmbiente, a]));
        return eventos.map(e => {
            const amb = e.ubicacionId ? map.get(e.ubicacionId) : undefined;
            return { ...e, ubicacionNombre: amb?.nombre ?? null, ubicacionArea: (amb as any)?.area?.nombre ?? null };
        });
    }

    @Post('eventos')
    createEvento(@Body() b: any) { return this.eventoRepo.save(this.eventoRepo.create(b)); }

    @Put('eventos/:id')
    async updateEvento(@Param('id') id: string, @Body() b: any) {
        await this.eventoRepo.update(id, b);
        return this.eventoRepo.findOne({ where: { id } });
    }

    @Delete('eventos/:id')
    async deleteEvento(@Param('id') id: string) {
        await this.eventoRepo.delete(id);
        return { ok: true };
    }

    @Get('solicitudes')
    async getSolicitudes() {
        const list = await this.solicitudRepo.find({ order: { createdAt: 'DESC' } });
        const ids = [...new Set(list.map(s => s.instructorId).filter(Boolean))];
        const personas = ids.length ? await this.personaRepo.findByIds(ids) : [];
        const pMap = new Map(personas.map(p => [p.idPersona, p]));
        return list.map(s => ({
            id:               s.id,
            instructor_nombre: this.nombreCompleto(pMap.get(s.instructorId)) ?? s.instructorId,
            estado:           s.estado,
            razon:            s.razon,
            respuesta_admin:  s.respuestaAdmin,
            fecha:            s.fecha ?? s.createdAt,
        }));
    }

    @Get('notificaciones')
    async getNotificaciones() {
        const list = await this.notiRepo.find({ order: { createdAt: 'DESC' } });
        return list.map(n => ({
            id:               n.id,
            tipo:             n.tipo,
            titulo:           n.titulo,
            mensaje:          n.mensaje,
            destinatario_id:  (n.data as any)?.destinatarioId   ?? null,
            destinatario_rol: (n.data as any)?.destinatarioRol  ?? null,
            leida:            n.leida,
            fecha:            n.createdAt,
        }));
    }

    @Delete('notificaciones/:id')
    async deleteNotificacion(@Param('id') id: string) {
        await this.notiRepo.delete(id);
        return { ok: true };
    }

    @Get('configuracion')
    async getConfiguracion() {
        const apps = await this.aplicativoRepo.find({ take: 1 });
        const app = apps[0] ?? null;
        if (!app) return [{ id: null, pin_registro: '1234' }];
        return [{ id: app.idAplicativo, pin_registro: (app as any).pinRegistro ?? '1234' }];
    }

    @Put('configuracion/:id')
    async updateConfiguracion(@Param('id') id: string, @Body() b: any) {
        const pin = b.pin_registro ?? b.pinRegistro ?? '1234';
        await this.aplicativoRepo.update(id, { pinRegistro: pin } as any);
        const apps2 = await this.aplicativoRepo.find({ where: { idAplicativo: id } as any, take: 1 });
        const a = apps2[0] ?? null;
        return { id: a?.idAplicativo ?? id, pin_registro: (a as any)?.pinRegistro ?? pin };
    }

    @Get('opts/fichas')
    async getOptsFichas() {
        const list = await this.cursoRepo.find();
        return list.map(c => ({ id: c.idCurso, label: c.codigo ?? c.idCurso }));
    }
}
