import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SedeService } from '../../application/services/sede.service';
import { CreateSedeDto } from '../../application/dtos/create-sede.dto';
import { UpdateSedeDto } from '../../application/dtos/update-sede.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('sedes')
@UseGuards(JwtAuthGuard)
export class SedeController {
    constructor(private readonly sedeService: SedeService) { }

    @Post()
    crear(@Body() dto: CreateSedeDto) {
        return this.sedeService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.sedeService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.sedeService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateSedeDto) {
        return this.sedeService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.sedeService.eliminar(id);
    }
}
