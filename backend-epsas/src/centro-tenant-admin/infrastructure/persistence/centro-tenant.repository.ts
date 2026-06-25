import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CentroTenant } from '../entities/centro-tenant.entity';

@Injectable()
export class CentroTenantRepository {
  constructor(
    @InjectRepository(CentroTenant, 'masterConnection')
    private readonly repo: Repository<CentroTenant>,
  ) {}

  crear(data: Partial<CentroTenant>): CentroTenant {
    return this.repo.create(data);
  }

  guardar(centroTenant: CentroTenant): Promise<CentroTenant> {
    return this.repo.save(centroTenant);
  }

  obtenerTodos(): Promise<CentroTenant[]> {
    return this.repo.find();
  }

  obtenerPorId(id: string): Promise<CentroTenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  obtenerPorSlug(slug: string): Promise<CentroTenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  eliminar(centroTenant: CentroTenant): Promise<CentroTenant> {
    return this.repo.remove(centroTenant);
  }
}
