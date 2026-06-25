import { Controller, Get, Post, Put, Delete, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { HorariosService } from '../../application/services/horarios.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('horarios')
export class HorariosController {
    constructor(private readonly service: HorariosService) {}

    @Get() findAll() { return this.service.findAll(); }
    @Get('stats') stats() { return this.service.stats(); }
    @Get('disponibles-ahora') disponiblesAhora() { return this.service.findDisponiblesAhora(); }
    @Get('by-instructor/:id') byInstructor(@Param('id') id: string) { return this.service.findByInstructor(id); }
    @Get('by-ficha/:id') byFicha(@Param('id') id: string) { return this.service.findByFicha(id); }
    @Get('by-ambiente/:id') byAmbiente(@Param('id') id: string) { return this.service.findByAmbiente(id); }
    @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

    @Post()
    async create(@Body() dto: any) {
        if (Array.isArray(dto.dias) && dto.dias.length > 0) {
            const results: any[] = [];
            for (const diaDto of dto.dias) {
                results.push(await this.service.create(diaDto));
            }
            return results;
        }
        return this.service.create(dto);
    }

    @Put(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
    @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
    @Patch(':id/toggle') toggle(@Param('id') id: string) { return this.service.toggleActivo(id); }
    @Patch(':id/play') play(@Param('id') id: string, @Body() body: any) { return this.service.play(id, body?.ambienteId, body?.ubicacionId, body?.ubicacionNombre); }
    @Patch(':id/finalizar') finalizar(@Param('id') id: string, @Body() body: { motivo: string }) { return this.service.finalizar(id, body.motivo); }
    @Patch(':id/finalizar-transversal') finalizarTransversal(@Param('id') id: string) { return this.service.finalizarTransversal(id); }
}
