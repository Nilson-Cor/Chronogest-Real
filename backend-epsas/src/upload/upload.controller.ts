import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
    @Post('adjunto')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const dir = join(process.cwd(), 'uploads', 'adjuntos');
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
        return { url: `/uploads/adjuntos/${file.filename}`, filename: file.filename };
    }
}
