import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Evento } from '../persistence/evento.entity';
import { Ambiente } from '../../../ambientes/infrastructure/persistence/ambiente.entity';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@UseGuards(JwtAuthGuard)
@Controller('eventos')
export class EventosController {
    private get repo(): Repository<Evento> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Evento);
    }

    private get ambienteRepo(): Repository<Ambiente> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Ambiente);
    }

    // "ubicaciones" se fusionó con "ambientes" (ver migración 001) — el
    // nombre exacto y el área del lugar del evento se resuelven aquí porque
    // viven en epsas_db, mientras que Evento vive en horarios_db (no se
    // puede JOIN entre las dos bases).
    private async conUbicacionNombre<T extends Evento>(
        eventos: T[],
    ): Promise<(T & { ubicacionNombre: string | null; ubicacionArea: string | null })[]> {
        const ids = [...new Set(eventos.map(e => e.ubicacionId).filter((v): v is string => !!v))];
        const ambientes = ids.length ? await this.ambienteRepo.findByIds(ids) : [];
        const map = new Map(ambientes.map(a => [a.idAmbiente, a]));
        return eventos.map(e => {
            const amb = e.ubicacionId ? map.get(e.ubicacionId) : undefined;
            return {
                ...e,
                ubicacionNombre: amb?.nombre ?? null,
                ubicacionArea: amb?.area?.nombre ?? null,
            };
        });
    }

    @Get()
    async findAll() {
        const eventos = await this.repo.find({ order: { fechaInicio: 'ASC' } });
        return this.conUbicacionNombre(eventos);
    }

    @Get('by-ficha/:fichaId')
    async byFicha(@Param('fichaId') fichaId: string) {
        const eventos = await this.repo
            .createQueryBuilder('e')
            .where(`e.fichas_participantes @> :fid::jsonb`, { fid: JSON.stringify([fichaId]) })
            .orderBy('e.fecha_inicio', 'ASC')
            .getMany();
        return this.conUbicacionNombre(eventos);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const evento = await this.repo.findOne({ where: { id } });
        if (!evento) return evento;
        const [enriched] = await this.conUbicacionNombre([evento]);
        return enriched;
    }

    @Post()
    create(@Body() dto: any) { return this.repo.save(this.repo.create(dto)); }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: any) {
        const e = await this.repo.findOne({ where: { id } });
        Object.assign(e!, dto);
        return this.repo.save(e!);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const e = await this.repo.findOne({ where: { id } });
        return this.repo.remove(e!);
    }
}
