import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CentroTenantRepository } from '../../infrastructure/persistence/centro-tenant.repository';
import { CentroTenant } from '../../infrastructure/entities/centro-tenant.entity';
import { CreateCentroTenantDto } from '../dtos/create-centro-tenant.dto';
import { UpdateCentroTenantDto } from '../dtos/update-centro-tenant.dto';

@Injectable()
export class CentroTenantAdminService {
  constructor(private readonly centroTenantRepo: CentroTenantRepository) {}

  // Crear un Centro de Formación (tenant)
  async crear(dto: CreateCentroTenantDto): Promise<CentroTenant> {
    const existente = await this.centroTenantRepo.obtenerPorSlug(dto.slug);
    if (existente) {
      throw new ConflictException(`Ya existe un Centro de Formación con el slug "${dto.slug}"`);
    }
    const centroTenant = this.centroTenantRepo.crear(dto);
    return await this.centroTenantRepo.guardar(centroTenant);
  }

  // Obtener todos los Centros de Formación
  async obtenerTodos(): Promise<CentroTenant[]> {
    return await this.centroTenantRepo.obtenerTodos();
  }

  // Obtener un Centro de Formación por UUID
  async obtenerPorId(id: string): Promise<CentroTenant> {
    const centroTenant = await this.centroTenantRepo.obtenerPorId(id);
    if (!centroTenant) {
      throw new NotFoundException(`Centro de Formación con ID ${id} no encontrado`);
    }
    return centroTenant;
  }

  // Obtener un Centro de Formación por slug (usado por CentroDataSourceFactory)
  async obtenerPorSlug(slug: string): Promise<CentroTenant> {
    const centroTenant = await this.centroTenantRepo.obtenerPorSlug(slug);
    if (!centroTenant) {
      throw new NotFoundException(`Centro de Formación con slug "${slug}" no encontrado`);
    }
    return centroTenant;
  }

  // Actualizar un Centro de Formación
  async actualizar(id: string, dto: UpdateCentroTenantDto): Promise<CentroTenant> {
    const centroTenant = await this.obtenerPorId(id);
    Object.assign(centroTenant, dto);
    return await this.centroTenantRepo.guardar(centroTenant);
  }

  // Eliminar (soft: cambia estado a 'inactivo')
  async eliminar(id: string): Promise<{ mensaje: string }> {
    const centroTenant = await this.obtenerPorId(id);
    centroTenant.estado = 'inactivo';
    await this.centroTenantRepo.guardar(centroTenant);
    return { mensaje: `Centro de Formación con ID ${id} marcado como inactivo` };
  }
}
