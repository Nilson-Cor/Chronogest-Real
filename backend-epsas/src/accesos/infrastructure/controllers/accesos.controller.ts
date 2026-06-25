import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { accesoService } from '../../application/services/accesos.service';
import { CreateAccesoDto } from '../../application/dtos/create-acceso.dto';
import { UpdateAccesoDto } from '../../application/dtos/update-acceso.dto';

@Controller('accesos')
export class AccesosController {
  constructor(private readonly accesosService: accesoService) {}

  @Post()
  create(@Body() createAccesoDto: CreateAccesoDto) {
    return this.accesosService.create(createAccesoDto);
  }

  @Get()
  findAll() {
    return this.accesosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accesosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccesoDto: UpdateAccesoDto) {
    return this.accesosService.update(id, updateAccesoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accesosService.remove(id);
  }
}
