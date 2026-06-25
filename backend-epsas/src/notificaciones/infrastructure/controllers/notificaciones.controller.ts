import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificacionesService } from '../../application/services/notificaciones.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly svc: NotificacionesService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get('count')
  async count() { return { count: await this.svc.countUnread() }; }

  @Patch('leer-todas')
  async leerTodas() {
    await this.svc.marcarTodasLeidas();
    return { message: 'Todas las notificaciones marcadas como leídas.' };
  }

  @Patch(':id/leer')
  async leer(@Param('id') id: string) {
    await this.svc.marcarLeida(id);
    return { message: 'Notificación marcada como leída.' };
  }
}
