process.env.TZ = process.env.TZ || 'America/Bogota';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import * as fs from 'fs';
import { static as serveStatic } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { verify as verifyJwt } from 'jsonwebtoken';

/**
 * Antes, /uploads/* se servía con app.useStaticAssets(), que es Express
 * puro por fuera del pipeline de guards de Nest — CUALQUIERA con la URL de
 * un adjunto o foto de perfil podía verlo, sin sesión y sin distinguir
 * tenants. Este middleware exige el mismo JWT que usa el resto de la API
 * (cookie 'token' o header Authorization) antes de servir el archivo,
 * manteniendo exactamente la misma ruta base (/uploads/...) para no romper
 * URLs ya guardadas en BD.
 *
 * Los archivos nuevos se guardan en /uploads/<slug>/adjuntos/... (ver
 * upload.controller.ts) — aquí, además del JWT, se exige que el <slug> de
 * la carpeta coincida con el centroSlug del token, para que un usuario
 * autenticado de un tenant no pueda ver archivos de otro adivinando la URL.
 * Las rutas viejas sin carpeta de tenant (/uploads/adjuntos/...) se dejan
 * pasar tal cual por compatibilidad con archivos previos a esta migración.
 */
function requireAuthForUploads(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const token = req.cookies?.token ?? bearer;

  if (!token) {
    res.status(401).json({ message: 'No autenticado' });
    return;
  }
  try {
    const payload = verifyJwt(token, process.env.JWT_SECRET as string) as { centroSlug?: string };
    const primerSegmento = req.path.split('/').filter(Boolean)[0];
    const esRutaLegacyPlana = primerSegmento === 'adjuntos';
    if (!esRutaLegacyPlana && payload.centroSlug && primerSegmento !== payload.centroSlug) {
      res.status(403).json({ message: 'Sin acceso a los archivos de este Centro de Formación' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Directorios de uploads
  const uploadsDir = join(process.cwd(), 'uploads');
  const adjuntosDir = join(uploadsDir, 'adjuntos');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(adjuntosDir)) fs.mkdirSync(adjuntosDir, { recursive: true });

  // cookieParser debe ir ANTES del middleware de uploads para que req.cookies
  // esté disponible al validar el JWT.
  app.use(cookieParser());

  // Servir archivos de uploads solo a peticiones autenticadas (ver comentario arriba)
  app.use('/uploads', requireAuthForUploads, serveStatic(uploadsDir));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

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
