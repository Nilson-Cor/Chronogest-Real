import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CentroTenantAdminService } from '../../application/services/centro-tenant-admin.service';
import { CreateCentroTenantDto } from '../../application/dtos/create-centro-tenant.dto';
import { UpdateCentroTenantDto } from '../../application/dtos/update-centro-tenant.dto';
import { Public } from '../../../auth/public.decorator';
import { RootAuthGuard } from '../guards/root-auth.guard';

// @Public() saca esta ruta de los guards globales (JwtAuthGuard, TenantGuard,
// CentroTenantGuard, RebacGuard) — todos exigen un JWT de usuario normal o
// contexto de tenant, que no aplica aquí. RootAuthGuard es la única puerta.
@Public()
@UseGuards(RootAuthGuard)
@Controller('admin/centros-tenant')
export class CentroTenantAdminController {
  constructor(private readonly centroTenantAdminService: CentroTenantAdminService) {}

  @Post()
  crear(@Body() dto: CreateCentroTenantDto) {
    return this.centroTenantAdminService.crear(dto);
  }

  @Get()
  obtenerTodos() {
    return this.centroTenantAdminService.obtenerTodos();
  }

  @Get('slug/:slug')
  obtenerPorSlug(@Param('slug') slug: string) {
    return this.centroTenantAdminService.obtenerPorSlug(slug);
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.centroTenantAdminService.obtenerPorId(id);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateCentroTenantDto) {
    return this.centroTenantAdminService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.centroTenantAdminService.eliminar(id);
  }
}
