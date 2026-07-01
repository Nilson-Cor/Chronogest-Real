import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CentroTenantContextService } from '../common/centro-tenant-context.service';
import * as fs from 'fs';

/** Carpeta 'adjuntos' segregada por tenant — evita que un archivo de un
 *  Centro de Formación quede alcanzable desde otro. 'default' es el
 *  fallback para el único caso en que UploadController se invoca sin
 *  contexto de tenant resuelto (no debería pasar en uso normal, ya que el
 *  endpoint exige JwtAuthGuard y el middleware de tenant corre antes). */
function slugTenantActual(): string {
    return CentroTenantContextService.hasContext() ? CentroTenantContextService.getSlug() : 'default';
}

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
    @Post('adjunto')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const dir = join(process.cwd(), 'uploads', slugTenantActual(), 'adjuntos');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, unique + extname(file.originalname));
            },
        }),
    }))
    uploadAdjunto(@UploadedFile() file: Express.Multer.File) {
        return { url: `/uploads/${slugTenantActual()}/adjuntos/${file.filename}`, filename: file.filename };
    }
}
