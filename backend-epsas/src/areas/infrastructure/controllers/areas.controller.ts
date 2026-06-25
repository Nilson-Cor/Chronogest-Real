import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AreasService } from '../../application/services/areas.service';
import { CreateAreaDto } from '../../application/dtos/create-area.dto';
import { UpdateAreaDto } from '../../application/dtos/update-area.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('areas')
@UseGuards(JwtAuthGuard)
export class AreasController {
    constructor(private readonly areasService: AreasService) { }

    @Post()
    crear(@Body() dto: CreateAreaDto) {
        return this.areasService.crear(dto);
    }

    @Get()
    obtenerTodos() {
        return this.areasService.obtenerTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id') id: string) {
        return this.areasService.obtenerPorId(id);
    }

    @Patch(':id')
    actualizar(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
        return this.areasService.actualizar(id, dto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.areasService.eliminar(id);
    }
}
