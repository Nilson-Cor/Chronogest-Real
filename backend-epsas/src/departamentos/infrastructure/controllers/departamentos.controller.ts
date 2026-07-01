import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { DepartamentosService } from '../../application/services/departamentos.service';
import { CreateDepartamentoDto } from '../../application/dtos/create-departamento.dto';
import { UpdateDepartamentoDto } from '../../application/dtos/update-departamento.dto';

@Controller('departamentos')
@UseGuards(JwtAuthGuard)
export class DepartamentosController {
    constructor(private readonly departamentosService: DepartamentosService) { }

    @Post()
    crear(@Body() dto: CreateDepartamentoDto) {
        return this.departamentosService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.departamentosService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.departamentosService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateDepartamentoDto) {
        return this.departamentosService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.departamentosService.eliminar(id);
    }
}
