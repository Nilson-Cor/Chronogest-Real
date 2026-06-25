import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ServicioService } from '../../application/services/servicio.service';
import { CreateServicioDto } from '../../application/dto/create-servicio.dto';
import { UpdateServicioDto } from '../../application/dto/update-servicio.dto';

@Controller('servicios')
export class ServicioController {
    constructor(private readonly servicioService: ServicioService) { }

    @Post()
    crear(@Body() dto: CreateServicioDto) {
        return this.servicioService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.servicioService.obtenerTodos();
    }

    @Get('modulo/:id')
    obtenerPorModulo(@Param('id') id: string) {
        return this.servicioService.obtenerPorModulo(id);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.servicioService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateServicioDto) {
        return this.servicioService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.servicioService.eliminar(id);
    }
}