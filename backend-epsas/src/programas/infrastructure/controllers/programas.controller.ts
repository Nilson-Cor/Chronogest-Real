import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProgramasService } from '../../application/services/programas.service';
import { CreateProgramaDto } from '../../application/dtos/create-programa.dto';
import { UpdateProgramaDto } from '../../application/dtos/update-programa.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('programas')
@UseGuards(JwtAuthGuard)
export class ProgramasController {
    constructor(private readonly programasService: ProgramasService) { }

    @Post()
    crear(@Body() dto: CreateProgramaDto) {
        return this.programasService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.programasService.obtenerTodos();
    }

    @Get('tipo/:tipo')
    obtenerPorTipo(@Param('tipo') tipo: string) {
        return this.programasService.obtenerPorTipo(tipo);
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.programasService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateProgramaDto) {
        return this.programasService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.programasService.eliminar(id);
    }
}
