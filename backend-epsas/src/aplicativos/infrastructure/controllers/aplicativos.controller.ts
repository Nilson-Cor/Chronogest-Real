import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreateAplicativoDto } from '../../application/dtos/create-aplicativo.dto';
import { UpdateAplicativoDto } from '../../application/dtos/update-aplicativo.dto';
import { aplicativosService } from '../../application/services/aplicativos.service';


@Controller('aplicativos')
@UseGuards(JwtAuthGuard)
export class aplicativosController {
    constructor(private readonly aplicativosService: aplicativosService) { }

    @Post()
    crear(@Body() dto: CreateAplicativoDto) {
        return this.aplicativosService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.aplicativosService.obtenerTodos();
    }

    @Get(':id/menu')
    obtenerMenu(@Param('id') id: string) {
        return this.aplicativosService.obtenerMenu(id);
    }
    
    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.aplicativosService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateAplicativoDto) {
        return this.aplicativosService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.aplicativosService.eliminar(id);
    }
}
