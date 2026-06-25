import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Horario, DiaSemana, Jornada } from "../../infrastructure/persistence/horario.entity";
import { AsignacionHorario } from "../../infrastructure/persistence/asignacion-horario.entity";
import { Competencia } from "../../infrastructure/persistence/competencia.entity";
import { CentroTenantContextService } from "../../../common/centro-tenant-context.service";

/**
 * HorariosService
 * El "id" externo (usado por el frontend) = AsignacionHorario.id
 * Combina Horario (plantilla dia/hora) + AsignacionHorario (instructor,ficha,ambiente,sesion)
 * para devolver objetos con el mismo shape que antes de la reestructuracion.
 */
@Injectable()
export class HorariosService {
    private get horarioRepo(): Repository<Horario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Horario);
    }

    private get asignacionRepo(): Repository<AsignacionHorario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(AsignacionHorario);
    }

    private get competenciaRepo(): Repository<Competencia> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Competencia);
    }

    // helpers
    private toView(a: AsignacionHorario): any {
        const h = a.horario;
        return {
            id: a.id,
            diaSemana: h?.diaSemana,
            jornada: h?.jornada,
            horaInicio: h?.horaInicio,
            horaFin: h?.horaFin,
            fichaId: a.fichaId,
            ambienteId: a.ambienteId,
            instructorId: a.instructorId,
            activo: a.activo,
            ultimaActivacion: a.ultimaActivacion,
            minutosRetraso: a.minutosRetraso,
            motivoFinalizacion: a.motivoFinalizacion,
            ubicacionTransversalId: a.ubicacionTransversalId,
            ubicacionTransversalNombre: a.ubicacionTransversalNombre,
            competencias: a.competencias ?? [],
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            _horarioId: h?.id,
        };
    }

    private filtrarCompetencias(views: any[]): any[] {
        return views.map(v => ({
            ...v,
            competencias: (v.competencias ?? []).filter((c: any) => {
                const ti = c.instructorId != null, tf = c.fichaId != null;
                if (!ti && !tf) return true;
                if (ti && c.instructorId !== v.instructorId) return false;
                if (tf && c.fichaId !== v.fichaId) return false;
                return true;
            }),
        }));
    }

    private detectarJornada(horaInicio?: string): Jornada {
        if (!horaInicio) return Jornada.MANANA;
        const [h] = horaInicio.split(":").map(Number);
        if (isNaN(h)) return Jornada.MANANA;
        if (h < 12) return Jornada.MANANA;
        if (h < 18) return Jornada.TARDE;
        return Jornada.NOCHE;
    }

    private readonly JORNADA_HORAS: Record<string, { inicio: string; fin: string }> = {
        manana: { inicio: "07:00", fin: "12:00" },
        tarde:  { inicio: "13:00", fin: "17:00" },
        noche:  { inicio: "18:00", fin: "20:00" },
    };

    private toUuid(v: any): string | null {
        if (!v || v === "null" || v === "undefined") return null;
        const s = String(v).trim();
        if (s === "" || s === "NaN" || /^\d+$/.test(s)) return null;
        return s;
    }

    private sanitizeDto(dto: any): any {
        const jornada = (dto.jornada || this.detectarJornada(dto.horaInicio)) as string;
        const def = this.JORNADA_HORAS[jornada] ?? { inicio: "07:00", fin: "12:00" };
        return {
            ...dto,
            jornada,
            horaInicio: dto.horaInicio || def.inicio,
            horaFin: dto.horaFin || def.fin,
            fichaId: this.toUuid(dto.fichaId),
            ambienteId: this.toUuid(dto.ambienteId),
            instructorId: this.toUuid(dto.instructorId),
            ubicacionTransversalId: this.toUuid(dto.ubicacionTransversalId),
        };
    }

    async findAll() {
        // Sin esto, una asignación "activada" (play) seguía marcada como
        // en curso para siempre después de terminar su jornada — antes solo
        // se desactivaba al consultar el panel interno /horarios-admin.
        await this.deactivateStale().catch(() => {});
        const list = await this.asignacionRepo.find({
            relations: ["horario", "competencias"],
        });
        return this.filtrarCompetencias(list.map(a => this.toView(a)));
    }

    async findByInstructor(instructorId: string) {
        await this.deactivateStale().catch(() => {});
        const list = await this.asignacionRepo.find({
            where: { instructorId },
            relations: ["horario", "competencias"],
        });
        return this.filtrarCompetencias(list.map(a => this.toView(a)));
    }

    async findByFicha(fichaId: string) {
        await this.deactivateStale().catch(() => {});
        const list = await this.asignacionRepo.find({
            where: { fichaId },
            relations: ["horario", "competencias"],
        });
        return this.filtrarCompetencias(list.map(a => this.toView(a)));
    }

    async findByAmbiente(ambienteId: string) {
        const list = await this.asignacionRepo.find({
            where: { ambienteId },
            relations: ["horario", "competencias"],
        });
        return this.filtrarCompetencias(list.map(a => this.toView(a)));
    }

    async findOne(id: string) {
        const a = await this.asignacionRepo.findOne({
            where: { id },
            relations: ["horario", "competencias"],
        });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        return this.filtrarCompetencias([this.toView(a)])[0];
    }

    async stats() {
        const total = await this.asignacionRepo.count();
        const activos = await this.asignacionRepo.count({ where: { activo: true } });
        return { total, activos };
    }

    async findDisponiblesAhora() {
        const now = new Date();
        const hora = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
        const dias = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
        const dia = dias[now.getDay()];
        const list = await this.asignacionRepo
            .createQueryBuilder("a")
            .innerJoinAndSelect("a.horario", "h")
            .where("h.dia_semana = :dia", { dia })
            .andWhere("h.hora_inicio <= :hora", { hora })
            .andWhere("h.hora_fin >= :hora", { hora })
            .getMany();
        return list.map(a => this.toView(a));
    }

    async create(dto: any) {
        await this.validarConflictos(dto);
        const s = this.sanitizeDto(dto);
        const horario = (await this.horarioRepo.save(
            this.horarioRepo.create({
                diaSemana: s.diaSemana,
                jornada: s.jornada,
                horaInicio: s.horaInicio,
                horaFin: s.horaFin,
            } as any)
        )) as unknown as Horario;
        const asignacion = (await this.asignacionRepo.save(
            this.asignacionRepo.create({
                horarioId: horario.id,
                fichaId: s.fichaId,
                ambienteId: s.ambienteId,
                instructorId: s.instructorId,
            })
        )) as unknown as AsignacionHorario;
        const result = await this.asignacionRepo.findOne({
            where: { id: asignacion.id },
            relations: ["horario", "competencias"],
        });
        return this.toView(result!);
    }

    async update(id: string, dto: any) {
        const a = await this.asignacionRepo.findOne({ where: { id }, relations: ["horario"] });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        const s = this.sanitizeDto(dto);
        const horarioPatch: any = {};
        if (s.diaSemana)  horarioPatch.diaSemana  = s.diaSemana;
        if (s.jornada)    horarioPatch.jornada    = s.jornada;
        if (s.horaInicio) horarioPatch.horaInicio = s.horaInicio;
        if (s.horaFin)    horarioPatch.horaFin    = s.horaFin;
        if (Object.keys(horarioPatch).length) await this.horarioRepo.update(a.horarioId, horarioPatch);
        if (s.fichaId     !== undefined) a.fichaId     = s.fichaId;
        if (s.ambienteId  !== undefined) a.ambienteId  = s.ambienteId;
        if (s.instructorId !== undefined) a.instructorId = s.instructorId;
        await this.asignacionRepo.save(a);
        return this.findOne(id);
    }

    async remove(id: string) {
        const a = await this.asignacionRepo.findOne({ where: { id } });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        const horarioId = a.horarioId;
        await this.asignacionRepo.remove(a);
        const remaining = await this.asignacionRepo.count({ where: { horarioId } });
        if (remaining === 0) await this.horarioRepo.delete(horarioId);
        return { message: "Horario eliminado" };
    }

    async play(id: string, ambienteId?: string, ubicacionId?: string, ubicacionNombre?: string) {
        const a = await this.asignacionRepo.findOne({ where: { id }, relations: ["horario"] });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        a.activo = true;
        a.ultimaActivacion = new Date();
        a.minutosRetraso = 0;
        if (ambienteId)      a.ambienteId               = ambienteId;
        if (ubicacionId)     a.ubicacionTransversalId   = ubicacionId;
        if (ubicacionNombre) a.ubicacionTransversalNombre = ubicacionNombre;
        await this.asignacionRepo.save(a);
        return this.findOne(id);
    }

    async finalizar(id: string, motivo: string) {
        const a = await this.asignacionRepo.findOne({ where: { id } });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        a.activo = false;
        a.motivoFinalizacion = motivo;
        await this.asignacionRepo.save(a);
        return this.findOne(id);
    }

    async finalizarTransversal(id: string) {
        const a = await this.asignacionRepo.findOne({ where: { id } });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        a.activo = false;
        a.motivoFinalizacion = "Finalizacion transversal";
        a.ambienteId = null as any;
        a.ubicacionTransversalId = null as any;
        a.ubicacionTransversalNombre = null as any;
        await this.asignacionRepo.save(a);
        return this.findOne(id);
    }

    async toggleActivo(id: string) {
        const a = await this.asignacionRepo.findOne({ where: { id } });
        if (!a) throw new NotFoundException("Horario " + id + " no encontrado");
        a.activo = !a.activo;
        if (a.activo) a.ultimaActivacion = new Date();
        await this.asignacionRepo.save(a);
        return this.findOne(id);
    }

    async deactivateStale(): Promise<number> {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const today = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate());
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const activos = await this.asignacionRepo.find({ where: { activo: true }, relations: ["horario"] });
        const stale = activos.filter(a => {
            if (!a.ultimaActivacion) return true;
            const d = new Date(a.ultimaActivacion);
            const day = d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
            if (day !== today) return true;
            if (!a.horario?.horaFin) return false;
            const [hh, mm] = a.horario.horaFin.split(":").map(Number);
            return nowMin > hh * 60 + mm;
        });
        if (!stale.length) return 0;
        for (const a of stale) { a.activo = false; }
        await this.asignacionRepo.save(stale);
        return stale.length;
    }

    private async validarConflictos(dto: any) {
        if (!dto.fichaId && !dto.instructorId && !dto.ambienteId) return;
        const s = this.sanitizeDto(dto);
        const qb = this.asignacionRepo
            .createQueryBuilder("a")
            .innerJoin("a.horario", "h")
            .where("h.dia_semana = :dia", { dia: s.diaSemana })
            .andWhere("h.jornada = :jornada", { jornada: s.jornada });
        if (s.fichaId) {
            const conf = await qb.clone().andWhere("a.ficha_id = :fid", { fid: s.fichaId }).getOne();
            if (conf) throw new BadRequestException("La ficha ya tiene un horario en esa jornada y dia");
        }
    }
}