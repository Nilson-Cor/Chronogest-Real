
import { Controller, Get, Post, Put, Body, Patch, Param, Delete, UseGuards, Query, ParseFloatPipe } from '@nestjs/common';

import { MatriculasService } from '../../application/services/matriculas.service';
import { CreateMatriculaDto } from '../../application/dtos/create-matricula.dto';
import { UpdateMatriculaDto } from '../../application/dtos/update-matricula.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('matriculas')
//@UseGuards(JwtAuthGuard)
export class MatriculasController {
    constructor(private readonly matriculasService: MatriculasService) { }

    @Post()
    crear(@Body() dto: CreateMatriculaDto) {
        return this.matriculasService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.matriculasService.obtenerTodos();
    }

    /** Verifica si una matrícula existe por cédula del aprendiz y código de ficha.
     *  Uso: GET /matriculas/exists?numeroDocumento=12345678&fichaNumero=2711641
     *  Devuelve: { exists: boolean, data?: Matricula }
     */
    @Get('exists')
    verificarExistencia(
        @Query('numeroDocumento') numeroDocumento: string,
        @Query('fichaNumero') fichaNumero: string,
    ) {
        return this.matriculasService.verificarExistencia(+numeroDocumento, fichaNumero);
    }

    @Get('persona/:id')
    obtenerPorPersona(@Param('id') id: string) {
        return this.matriculasService.obtenerPorPersona(id);
    }

    @Get('curso/:id')
    obtenerPorCurso(@Param('id') id: string) {
        return this.matriculasService.obtenerPorCurso(id);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.matriculasService.obtenerPorId(id);
    }

    /** PATCH /matriculas/:id/avance  — actualiza SOLO el porcentaje de avance */
    @Patch(':id/avance')
    actualizarAvance(
        @Param('id') id: string,
        @Body('avance', ParseFloatPipe) avance: number,
    ) {
        return this.matriculasService.actualizarAvance(id, avance);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateMatriculaDto) {
        return this.matriculasService.actualizar(id, dto);
    }

    /** PUT alias de PATCH — necesario para compatibilidad con el módulo de migración */
    @Put(':id')
    actualizarPut(@Param('id') id: string, @Body() dto: UpdateMatriculaDto) {
        return this.matriculasService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.matriculasService.eliminar(id);
    }
}
