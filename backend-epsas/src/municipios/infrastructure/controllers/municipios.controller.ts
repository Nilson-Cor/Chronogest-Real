import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MunicipiosService } from '../../application/services/municipios.service';
import { CreateMunicipioDto } from '../../application/dtos/create-municipio.dto';
import { UpdateMunicipioDto } from '../../application/dtos/update-municipio.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('municipios')
@UseGuards(JwtAuthGuard)
export class MunicipiosController {
    constructor(private readonly municipiosService: MunicipiosService) { }

    @Post()
    crear(@Body() dto: CreateMunicipioDto) {
        return this.municipiosService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.municipiosService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.municipiosService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateMunicipioDto) {
        return this.municipiosService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.municipiosService.eliminar(id);
    }
}
