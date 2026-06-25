import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Acceso } from '../../accesos/infrastructure/persistence/acceso.entity';
import { tipoEstado } from '../../accesos/application/dtos/create-acceso.dto';
import { ACCESO_QUEUE } from '../queue.constants';
import { CentroDataSourceFactory } from '../../database/centro-datasource.factory';
export interface RegistrarAccesoJob {
  token: string;
  usuarioId: string;
  fechaIngreso: Date;
  centroSlug: string;
}

@Processor(ACCESO_QUEUE)
export class AccesoProcessor extends WorkerHost {
  constructor(private readonly centroDataSourceFactory: CentroDataSourceFactory) {
    super();
  }

  async process(job: Job<RegistrarAccesoJob>): Promise<void> {
    const { token, usuarioId, fechaIngreso, centroSlug } = job.data;

    // El worker corre fuera del ciclo de vida HTTP — no hay contexto de
    // CentroTenantContextService aquí, por eso el slug viaja en el job
    // y se resuelve el DataSource directo con el factory.
    const dataSource = await this.centroDataSourceFactory.getEpsasDataSource(centroSlug);
    const accesoRepository = dataSource.getRepository(Acceso);

    await accesoRepository.save(
      accesoRepository.create({
        token,
        usuarioId,
        fechaIngreso,
        estado: tipoEstado.ACTIVO,
      }),
    );
  }
}
