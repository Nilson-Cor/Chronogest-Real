import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PermisoService } from '../../application/services/permisos.service';
import { CreatePermisoDto } from '../../application/dtos/create-permisos.dto';
import { UpdatePermisoDto } from '../../application/dtos/update-permisos.dto';


@Controller('permisos')
export class PermisoController {
    constructor(private readonly permisoService: PermisoService) {}

    @Post()
    crear(@Body() dto: CreatePermisoDto) {
        return this.permisoService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.permisoService.obtenerTodos();
    }

    @Get('usuario/:id')
    obtenerPorUsuario(@Param('id') id: string) {
        return this.permisoService.obtenerPorUsuario(id);
    }

    @Get('rol/:id')
    obtenerPorRol(@Param('id') id: string) {
        return this.permisoService.obtenerPorRol(id);
    }

    @Get('servicio/:id')
    obtenerPorServicio(@Param('id') id: string) {
        return this.permisoService.obtenerPorServicio(id);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.permisoService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdatePermisoDto) {
        return this.permisoService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.permisoService.eliminar(id);
    }
}