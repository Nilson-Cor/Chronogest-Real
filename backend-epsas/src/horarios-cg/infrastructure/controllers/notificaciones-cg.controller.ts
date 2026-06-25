import { Controller, Get, Patch, Param, UseGuards, Delete } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notificacion } from '../../../notificaciones/infrastructure/persistence/notificacion.entity';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesCGController {
    private get repo(): Repository<Notificacion> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Notificacion);
    }

    @Get()
    findAll() {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    @Patch(':id/leer')
    async marcarLeida(@Param('id') id: string) {
        const n = await this.repo.findOne({ where: { id } });
        if (n) { n.leida = true; return this.repo.save(n); }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const n = await this.repo.findOne({ where: { id } });
        if (n) return this.repo.remove(n);
    }
}
