import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, Request, BadRequestException, ConflictException } from "@nestjs/common";
import { Repository, Not } from "typeorm";
import { SolicitudCambio } from "../persistence/solicitud-cambio.entity";
import { AsignacionHorario } from "../persistence/asignacion-horario.entity";
import { Competencia } from "../persistence/competencia.entity";
import { Persona } from "../../../personas/infrastructure/persistence/persona.entity";
import { JwtAuthGuard } from "../../../auth/jwt-auth.guard";
import { CentroTenantContextService } from "../../../common/centro-tenant-context.service";

function esVacio(v: any): boolean {
    if (v === undefined || v === null) return true;
    if (typeof v === "string" && (v.trim() === "" || v === "null" || v === "undefined" || v === "NaN")) return true;
    if (typeof v === "number" && isNaN(v)) return true;
    return false;
}
function limpiarDto(dto: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(dto).filter(([, v]) => !esVacio(v)));
}

@UseGuards(JwtAuthGuard)
@Controller("solicitudes-cambio")
export class SolicitudesController {
    private get repo(): Repository<SolicitudCambio> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(SolicitudCambio);
    }

    private get asignacionRepo(): Repository<AsignacionHorario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(AsignacionHorario);
    }

    private get competenciaRepo(): Repository<Competencia> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Competencia);
    }

    private get personaRepo(): Repository<Persona> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
    }

    @Get() findAll() { return this.repo.find({ relations: ["asignacion", "asignacion.horario"], order: { createdAt: "DESC" } }); }

    @Get("instructor/:id")
    byInstructor(@Param("id") id: string) {
        return this.repo.find({ where: { instructorId: id }, relations: ["asignacion", "asignacion.horario"], order: { createdAt: "DESC" } });
    }

    @Get("pendientes/count")
    async pendientesCount() { return this.repo.count({ where: { estado: "pendiente" } }); }

    @Get(":id")
    findOne(@Param("id") id: string) { return this.repo.findOne({ where: { id }, relations: ["asignacion", "asignacion.horario"] }); }

    @Post()
    create(@Body() dto: any, @Request() req: any) {
        const s = this.repo.create({ ...dto, instructorId: dto.instructorId ?? req.user?.id, fecha: new Date(), estado: "pendiente" });
        return this.repo.save(s);
    }

    @Put(":id")
    async update(@Param("id") id: string, @Body() dto: any) {
        const s = await this.repo.findOne({ where: { id } });
        Object.assign(s!, dto);
        return this.repo.save(s!);
    }

    @Patch(":id/aprobar")
    async aprobar(@Param("id") id: string, @Body() body: any) {
        const s = await this.repo.findOne({ where: { id } });
        s!.estado = "aprobado"; s!.respuestaAdmin = body.respuesta ?? "";
        return this.repo.save(s!);
    }

    @Patch(":id/rechazar")
    async rechazar(@Param("id") id: string, @Body() body: any) {
        const s = await this.repo.findOne({ where: { id } });
        s!.estado = "rechazado"; s!.respuestaAdmin = body.respuesta ?? "";
        return this.repo.save(s!);
    }

    @Patch(":id/responder")
    async responder(@Param("id") id: string, @Body() body: any) {
        const s = await this.repo.findOne({ where: { id }, relations: ["asignacion", "asignacion.horario"] });
        if (!s) throw new BadRequestException("Solicitud no encontrada");
        s.estado = body.estado ?? s.estado;
        s.respuestaAdmin = body.respuestaAdmin ?? "";

        if ((s.estado === "aprobado" || s.estado === "aprobada") && s.asignacionId && s.horarioPropuesto) {
            const asignacion = await this.asignacionRepo.findOne({ where: { id: s.asignacionId }, relations: ["horario"] });
            if (asignacion) {
                const prop = s.horarioPropuesto as Record<string, any>;
                const diaEf     = !esVacio(prop["diaSemana"])    ? prop["diaSemana"]    : asignacion.horario?.diaSemana;
                const jornadaEf = !esVacio(prop["jornada"])      ? prop["jornada"]      : asignacion.horario?.jornada;
                const hiEf      = !esVacio(prop["horaInicio"])   ? prop["horaInicio"]   : asignacion.horario?.horaInicio;
                const hfEf      = !esVacio(prop["horaFin"])      ? prop["horaFin"]      : asignacion.horario?.horaFin;
                const fichaEf   = !esVacio(prop["fichaId"])      ? prop["fichaId"]      : asignacion.fichaId;
                const instrEf   = !esVacio(prop["instructorId"]) ? prop["instructorId"] : asignacion.instructorId;
                const ambEf     = !esVacio(prop["ambienteId"])   ? prop["ambienteId"]   : asignacion.ambienteId;

                const solapan = (i1: string, f1: string, i2: string, f2: string) => {
                    const m = (t: string) => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };
                    return m(i1) < m(f2) && m(f1) > m(i2);
                };

                if (fichaEf) {
                    const conf = await this.asignacionRepo.createQueryBuilder("a")
                        .innerJoin("a.horario", "h")
                        .where("h.dia_semana = :dia", { dia: diaEf })
                        .andWhere("h.jornada = :jornada", { jornada: jornadaEf })
                        .andWhere("a.ficha_id = :fid", { fid: fichaEf })
                        .andWhere("a.id != :aid", { aid: asignacion.id })
                        .getOne();
                    if (conf && solapan(hiEf, hfEf, conf.horario?.horaInicio ?? "", conf.horario?.horaFin ?? ""))
                        throw new ConflictException("La ficha ya tiene un horario que se superpone en ese dia y jornada");
                }

                const oldInstrId = asignacion.instructorId;
                const oldFichaId = asignacion.fichaId;
                const instrCambio = !esVacio(prop["instructorId"]) && prop["instructorId"] !== oldInstrId;
                const fichaCambio = !esVacio(prop["fichaId"])      && prop["fichaId"]      !== oldFichaId;

                // Actualizar asignacion
                const asignPatch = limpiarDto({
                    fichaId: prop["fichaId"], ambienteId: prop["ambienteId"], instructorId: prop["instructorId"],
                    ubicacionTransversalId: prop["ubicacionTransversalId"],
                });
                Object.assign(asignacion, asignPatch);

                // Actualizar horario plantilla si hay cambios de tiempo
                const horarioPatch = limpiarDto({ diaSemana: prop["diaSemana"], jornada: prop["jornada"], horaInicio: prop["horaInicio"], horaFin: prop["horaFin"] });
                if (Object.keys(horarioPatch).length && asignacion.horario) {
                    Object.assign(asignacion.horario, horarioPatch);
                    // Nota: el horario se guarda en cascade a traves de la relacion
                }

                if (instrCambio && instrEf) {
                    const nuevoInstr = await this.personaRepo.findOne({ where: { idPersona: instrEf } });
                    if (nuevoInstr?.esTransversal) {
                        asignacion.ambienteId = null as any;
                        asignacion.ubicacionTransversalId = null as any;
                        asignacion.ubicacionTransversalNombre = null as any;
                    }
                }

                await this.asignacionRepo.save(asignacion);

                if (instrCambio || fichaCambio) {
                    const comps = await this.competenciaRepo.find({ where: { asignacionId: asignacion.id } });
                    for (const comp of comps) {
                        if (comp.instructorId == null && oldInstrId) comp.instructorId = oldInstrId;
                        if (comp.fichaId == null && oldFichaId) comp.fichaId = oldFichaId;
                        const im = comp.instructorId != null && comp.instructorId !== instrEf;
                        const fm = comp.fichaId      != null && comp.fichaId      !== fichaEf;
                        if (im || fm) {
                            const otro = comp.instructorId
                                ? await this.asignacionRepo.findOne({ where: { instructorId: comp.instructorId, ...(comp.fichaId ? { fichaId: comp.fichaId } : {}), id: Not(asignacion.id) as any } })
                                : null;
                            if (otro) comp.asignacionId = otro.id;
                            await this.competenciaRepo.save(comp);
                        }
                    }
                }
            }
        }
        return this.repo.save(s);
    }

    @Patch(":id/cancelar")
    async cancelar(@Param("id") id: string) {
        const s = await this.repo.findOne({ where: { id } });
        if (!s) return { error: "No encontrada" };
        s.estado = "cancelada";
        return this.repo.save(s);
    }

    @Delete(":id")
    async remove(@Param("id") id: string) {
        const s = await this.repo.findOne({ where: { id } });
        return this.repo.remove(s!);
    }
}