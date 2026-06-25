import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { Repository } from "typeorm";
import { Competencia } from "../persistence/competencia.entity";
import { AsignacionHorario } from "../persistence/asignacion-horario.entity";
import { JwtAuthGuard } from "../../../auth/jwt-auth.guard";
import { CentroTenantContextService } from "../../../common/centro-tenant-context.service";

@UseGuards(JwtAuthGuard)
@Controller("competencias")
export class CompetenciasController {
    private get repo(): Repository<Competencia> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Competencia);
    }

    private get asignacionRepo(): Repository<AsignacionHorario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(AsignacionHorario);
    }

    @Get()
    findAll() { return this.repo.find({ relations: ["asignacion", "asignacion.horario"] }); }

    @Get("by-horario/:id")
    async byHorario(@Param("id") id: string) {
        const asignacion = await this.asignacionRepo.findOne({ where: { id } });
        const comps = await this.repo.find({ where: { asignacionId: id } });
        if (!asignacion) return comps;
        return comps.filter(c => {
            const ti = c.instructorId != null, tf = c.fichaId != null;
            if (!ti && !tf) return true;
            if (ti && c.instructorId !== asignacion.instructorId) return false;
            if (tf && c.fichaId !== asignacion.fichaId) return false;
            return true;
        });
    }

    @Get("instructor/:id")
    byInstructor(@Param("id") id: string) {
        return this.repo
            .createQueryBuilder("c")
            .innerJoinAndSelect("c.asignacion", "a")
            .innerJoinAndSelect("a.horario", "h")
            .where("c.instructor_id = :id OR (c.instructor_id IS NULL AND a.instructor_id = :id)", { id })
            .orderBy("c.created_at", "DESC")
            .getMany();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.repo.findOne({ where: { id }, relations: ["asignacion", "asignacion.horario"] });
    }

    @Post()
    async create(@Body() dto: any) {
        const comp = this.repo.create({ ...dto, resultados: dto.resultados ?? [] }) as unknown as Competencia;
        // Copiar instructor y ficha de la asignacion al momento de creacion
        if (dto.asignacionId && (comp.instructorId === undefined || comp.instructorId === null)) {
            const asignacion = await this.asignacionRepo.findOne({ where: { id: dto.asignacionId } });
            if (asignacion) {
                comp.instructorId = asignacion.instructorId ?? null;
                comp.fichaId      = asignacion.fichaId      ?? null;
            }
        }
        return this.repo.save(comp);
    }

    @Put(":id")
    async update(@Param("id") id: string, @Body() dto: any) {
        const c = await this.repo.findOne({ where: { id } });
        const { instructorId: _i, fichaId: _f, ...rest } = dto;
        Object.assign(c!, rest);
        return this.repo.save(c!);
    }

    @Delete(":id")
    async remove(@Param("id") id: string) {
        const c = await this.repo.findOne({ where: { id } });
        return this.repo.remove(c!);
    }
}