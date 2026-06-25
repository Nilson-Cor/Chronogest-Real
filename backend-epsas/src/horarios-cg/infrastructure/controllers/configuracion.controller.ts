import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

/**
 * ConfiguracionController
 * El PIN de registro ahora vive en aplicativos.pin_registro (tabla de epsas_db).
 * La tabla configuracion_sistema fue eliminada.
 */
@UseGuards(JwtAuthGuard)
@Controller('configuracion')
export class ConfiguracionController {
    private get aplicativoRepo(): Repository<Aplicativo> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Aplicativo);
    }

    @Get()
    async get() {
        const apps = await this.aplicativoRepo.find({ take: 1 });
        const app = apps[0] ?? null;
        if (!app) return { id: null, pinRegistro: '1234' };
        return { id: app.idAplicativo, pinRegistro: (app as any).pinRegistro ?? '1234' };
    }

    @Put()
    async update(@Body() body: { pinRegistro?: string }) {
        const apps = await this.aplicativoRepo.find({ take: 1 });
        let app = apps[0] ?? null;
        if (!app) return { id: null, pinRegistro: '1234' };
        if (body.pinRegistro) (app as any).pinRegistro = body.pinRegistro;
        const saved = await this.aplicativoRepo.save(app);
        return { id: (saved as any).idAplicativo, pinRegistro: (saved as any).pinRegistro };
    }
}
