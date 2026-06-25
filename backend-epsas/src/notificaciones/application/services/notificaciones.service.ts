import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notificacion } from '../../infrastructure/persistence/notificacion.entity';
import { Matricula } from '../../../matriculas/infrastructure/persistence/matricula.entity';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  private get notiRepo(): Repository<Notificacion> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Notificacion);
  }

  private get matriculaRepo(): Repository<Matricula> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Matricula);
  }

  findAll(): Promise<Notificacion[]> {
    return this.notiRepo.find({ order: { createdAt: 'DESC' } });
  }

  async countUnread(): Promise<number> {
    return this.notiRepo.count({ where: { leida: false } });
  }

  async marcarLeida(id: string): Promise<void> {
    await this.notiRepo.update(id, { leida: true });
  }

  async marcarTodasLeidas(): Promise<void> {
    await this.notiRepo
      .createQueryBuilder()
      .update(Notificacion)
      .set({ leida: true })
      .where('leida = false')
      .execute();
  }

  async generarPostMigracion(minAvance: number): Promise<void> {
    try {
      await this.notiRepo.delete({ tipo: 'aprendices_habilitados' });

      const matriculas = await this.matriculaRepo
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.persona', 'p')
        .leftJoinAndSelect('m.curso',   'c')
        .leftJoinAndSelect('c.programa', 'prog')
        .where('CAST(m.avance AS DECIMAL) >= :min', { min: minAvance })
        .orderBy('m.avance', 'DESC')
        .getMany();

      if (matriculas.length === 0) {
        this.logger.log('generarPostMigracion: ningún aprendiz supera el umbral.');
        return;
      }

      const aprendices = matriculas.map(m => ({
        nombre:   m.persona?.nombre ?? 'Sin nombre',
        cedula:   m.persona?.cedula ?? '',
        programa: (m.curso as any)?.programa?.nombre ?? '',
        avance:   Number(m.avance),
      }));

      const titulo  = `${aprendices.length} aprendiz${aprendices.length > 1 ? 'ces' : ''} habilitado${aprendices.length > 1 ? 's' : ''} para etapa práctica`;
      const mensaje = `Luego de la última migración, ${aprendices.length} aprendiz(ces) alcanzaron o superaron el ${minAvance}% de avance académico y ya pueden ser vinculados a una etapa práctica.`;

      await this.notiRepo.save(
        this.notiRepo.create({ tipo: 'aprendices_habilitados', titulo, mensaje, data: { minAvance, total: aprendices.length, aprendices }, leida: false }),
      );
      this.logger.log(`Notificación generada: ${aprendices.length} aprendices habilitados (umbral ${minAvance}%)`);
    } catch (err: any) {
      this.logger.error('Error generando notificación post-migración:', err?.message ?? err);
    }
  }
}
