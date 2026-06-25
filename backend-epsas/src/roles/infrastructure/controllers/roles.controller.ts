import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreateRolDto } from '../../application/dtos/create-roles.dto';
import { UpdateRolDto } from '../../application/dtos/update.roles.dto';
import { rolService } from '../../application/services/roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class rolController {
    constructor(private readonly rolesService: rolService) { }

    @Post()
    crear(@Body() dto: CreateRolDto) {
        return this.rolesService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.rolesService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.rolesService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateRolDto) {
        return this.rolesService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.rolesService.eliminar(id);
    }
}
