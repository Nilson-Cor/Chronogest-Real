import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreateUsuarioDto } from '../../application/dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../../application/dtos/update-usuario.dto';
import { usuarioService } from '../../application/services/usuario.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class usuarioController {
    constructor(private readonly usuariosService: usuarioService) { }

    @Post()
    crear(@Body() dto: CreateUsuarioDto) {
        return this.usuariosService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.usuariosService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.usuariosService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
        return this.usuariosService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.usuariosService.eliminar(id);
    }
}
