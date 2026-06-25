import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CursosService } from '../../application/services/cursos.service';
import { CreateCursoDto } from '../../application/dtos/create-curso.dto';
import { UpdateCursoDto } from '../../application/dtos/update-curso.dto';

@Controller('cursos')
@UseGuards(JwtAuthGuard)
export class CursosController {
    constructor(private readonly cursosService: CursosService) { }

    @Post()
    crear(@Body() dto: CreateCursoDto) {
        return this.cursosService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.cursosService.obtenerTodos();
    }

    @Get('activos')
    obtenerActivos() {
        return this.cursosService.obtenerActivos();
    }

    /** Verifica si un curso (ficha) existe por código.
     *  Uso: GET /cursos/exists?codigo=2711641
     *  Devuelve: { exists: boolean, data?: Curso }
     */
    @Get('exists')
    verificarExistencia(@Query('codigo') codigo: string) {
        return this.cursosService.verificarExistencia(codigo);
    }

    @Get(':id/aprendices')
    obtenerConAprendices(@Param('id') id: string) {
        return this.cursosService.obtenerConAprendices(id);
    }

    @Get('area/:id')
    obtenerPorArea(@Param('id') id: string) {
        return this.cursosService.obtenerPorArea(id);
    }

    @Get('programa/:id')
    obtenerPorPrograma(@Param('id') id: string) {
        return this.cursosService.obtenerPorPrograma(id);
    }

    @Get('lider/:id')
    obtenerPorLider(@Param('id') id: string) {
        return this.cursosService.obtenerPorLider(id);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.cursosService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateCursoDto) {
        return this.cursosService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.cursosService.eliminar(id);
    }
}
