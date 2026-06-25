import {
  Controller, Post, Get, Delete, Body,
  UseGuards, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MigracionService } from './migracion.service';
import * as path from 'path';
import * as fs   from 'fs';

@Controller('migracion')
@UseGuards(JwtAuthGuard)
export class MigracionController {
  constructor(private readonly migracionService: MigracionService) {}

  /**
   * POST /api/migracion/iniciar
   * Recibe el archivo Excel, lo guarda en disco y lanza el script
   * Python en segundo plano. Retorna inmediatamente.
   */
  @Post('iniciar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ts   = Date.now();
        const ext  = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
        cb(null, `migracion_${ts}_${base}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const ok = /\.(xlsx|xls)$/i.test(file.originalname);
      ok ? cb(null, true) : cb(new BadRequestException('Solo se permiten archivos .xlsx o .xls'), false);
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  }))
  iniciar(
    @UploadedFile() file: Express.Multer.File,
    @Body('minAvance') minAvanceStr?: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    const minAvance = minAvanceStr ? parseFloat(minAvanceStr) : 70;
    return this.migracionService.iniciarMigracion(file.path, isNaN(minAvance) ? 70 : minAvance);
  }

  /**
   * GET /api/migracion/estado
   * Retorna el estado actual de la migración + últimos 60 logs.
   * El frontend hace polling cada 2 segundos a este endpoint.
   */
  @Get('estado')
  estado() {
    return this.migracionService.getEstado();
  }

  /**
   * DELETE /api/migracion/resetear
   * Limpia el estado para permitir una nueva migración.
   */
  @Delete('resetear')
  resetear() {
    this.migracionService.resetear();
    return { message: 'Estado reiniciado.' };
  }
}
