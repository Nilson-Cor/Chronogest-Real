import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ModuloService } from '../../application/services/modulos.service';
import { CreateModuloDto } from '../../application/dtos/create-modulo.dto';
import { UpdateModuloDto } from '../../application/dtos/update-modulo.dto';

@Controller('modulos')
export class ModuloController {
    constructor(private readonly moduloService: ModuloService) {}

    @Post()
    crear(@Body() dto: CreateModuloDto) {
        return this.moduloService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.moduloService.obtenerTodos();
    }

    @Get('aplicativo/:id')
    obtenerPorAplicativo(@Param('id') id: string) {
        return this.moduloService.obtenerPorAplicativo(id);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.moduloService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateModuloDto) {
        return this.moduloService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.moduloService.eliminar(id);
    }
}