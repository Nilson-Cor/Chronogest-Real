process.env.TZ = process.env.TZ || 'America/Bogota';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Directorios de uploads
  const uploadsDir = join(process.cwd(), 'uploads');
  const adjuntosDir = join(uploadsDir, 'adjuntos');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(adjuntosDir)) fs.mkdirSync(adjuntosDir, { recursive: true });

  // Servir archivos estáticos de uploads
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  app.use(cookieParser());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permite localhost y 127.0.0.1 en cualquier puerto (dev)
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      const allowed = (process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean);
      callback(null, allowed.includes(origin));
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[ChronoGest + EPSAS] Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
