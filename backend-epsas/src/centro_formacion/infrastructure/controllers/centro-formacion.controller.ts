import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CentroFormacionService } from '../../application/services/centro-formacion.service';
import { CreateCentroFormacionDto } from '../../application/dtos/create-centro-formacion.dto';
import { UpdateCentroFormacionDto } from '../../application/dtos/update-centro-formacion.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('centro-formacion')
@UseGuards(JwtAuthGuard)
export class CentroFormacionController {
    constructor(private readonly centroFormacionService: CentroFormacionService) { }

    @Post()
    crear(@Body() dto: CreateCentroFormacionDto) {
        return this.centroFormacionService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.centroFormacionService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.centroFormacionService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateCentroFormacionDto) {
        return this.centroFormacionService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.centroFormacionService.eliminar(id);
    }
}
