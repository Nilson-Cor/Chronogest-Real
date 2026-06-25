import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreateCredencialDto } from '../../application/dtos/create-credencial.dto';
import { UpdateCredencialDto } from '../../application/dtos/update-credencial.dto';
import { credencialService } from '../../application/services/credencial.service';

@Controller('credenciales')
@UseGuards(JwtAuthGuard)
export class credencialController {
    constructor(private readonly credencialService: credencialService) { }

    @Post()
    crear(@Body() dto: CreateCredencialDto) {
        return this.credencialService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.credencialService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.credencialService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateCredencialDto) {
        return this.credencialService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.credencialService.eliminar(id);
    }
}
