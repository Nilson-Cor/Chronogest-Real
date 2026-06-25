
import { Controller, Get, Post, Put, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PersonasService } from '../../application/services/personas.service';
import { CreatePersonaDto } from '../../application/dtos/create-persona.dto';
import { UpdatePersonaDto } from '../../application/dtos/update-persona.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonasController {
    constructor(private readonly personasService: PersonasService) { }

    @Post()
    crear(@Body() dto: CreatePersonaDto) {
        return this.personasService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.personasService.obtenerTodos();
    }

    @Get('activos')
    obtenerActivos() {
        return this.personasService.obtenerActivos();
    }

    /** Verifica si una persona existe por número de documento.
     *  Uso: GET /personas/exists?identificacion=12345678
     *  Devuelve: { exists: boolean, data?: Persona }
     */
    @Get('exists')
    verificarExistencia(@Query('identificacion') identificacion: string) {
        return this.personasService.verificarExistencia(+identificacion);
    }

    @Get('cedula/:cedula')
    obtenerPorCedula(@Param('cedula') cedula: number) {
        return this.personasService.obtenerPorCedula(cedula);
    }

    @Get('cargo/:cargo')
    obtenerPorCargo(@Param('cargo') cargo: string) {
        return this.personasService.obtenerPorCargo(cargo);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.personasService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdatePersonaDto) {

        return this.personasService.actualizar(id, dto);
    }

    /** PUT alias de PATCH — necesario para compatibilidad con el módulo de migración */
    @Put(':id')
    actualizarPut(@Param('id') id: string, @Body() dto: UpdatePersonaDto) {

        return this.personasService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.personasService.eliminar(id);
    }
}
