/**
 * HorariosCompatController
 * Rutas de compatibilidad con el frontend Chronogest.
 */
import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, UseGuards,
    UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { Public } from '../../../auth/public.decorator';
import { HorariosService } from '../../application/services/horarios.service';
import { Horario } from '../persistence/horario.entity';
import { AsignacionHorario } from '../persistence/asignacion-horario.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { Ambiente } from '../../../ambientes/infrastructure/persistence/ambiente.entity';
import { Acceso } from '../../../accesos/infrastructure/persistence/acceso.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { Area } from '../../../areas/infrastructure/persistence/area.entity';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

function nombreCompleto(p: Persona): string {
    return `${p.nombre ?? ''} ${(p as any).apellido ?? ''}`.trim();
}

@UseGuards(JwtAuthGuard)
@Controller()
export class HorariosCompatController {
    constructor(private readonly horariosService: HorariosService) {}

    private get horarioRepo(): Repository<Horario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(Horario);
    }

    private get asignacionRepo(): Repository<AsignacionHorario> {
        return CentroTenantContextService.getHorariosDataSource().getRepository(AsignacionHorario);
    }

    private get personaRepo(): Repository<Persona> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
    }

    private get cursoRepo(): Repository<Curso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Curso);
    }

    private get ambienteRepo(): Repository<Ambiente> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Ambiente);
    }

    private get accesoRepo(): Repository<Acceso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Acceso);
    }

    private get usuarioRepo(): Repository<Usuario> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Usuario);
    }

    private get areaRepo(): Repository<Area> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Area);
    }

    private async personasConSesion(cargo: string): Promise<any[]> {
        const personas = await this.personaRepo.find({ where: { cargo: cargo as any } });
        if (!personas.length) return [];

        const personaIds = personas.map(p => p.idPersona);
        const rows: { personaId: string; usuarioId: string }[] = await this.usuarioRepo
            .createQueryBuilder('u')
            .select('u."idUsuario"', 'usuarioId')
            .addSelect('u.persona', 'personaId')
            .where('u.persona IN (:...ids)', { ids: personaIds })
            .getRawMany();

        const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activePersonaIds = new Set<string>();

        for (const row of rows) {
            try {
                const count = await this.accesoRepo
                    .createQueryBuilder('a')
                    .where('a.usuarioId = :uid', { uid: row.usuarioId })
                    .andWhere('a.fechaIngreso >= :desde', { desde })
                    .andWhere('a.fechaSalida IS NULL')
                    .andWhere("a.estado = 'activo'")
                    .getCount();
                if (count > 0) activePersonaIds.add(row.personaId);
            } catch { /* Si falla la consulta de accesos, sesionActiva = false */ }
        }

        return personas.map(p => ({
            id:           p.idPersona,
            nombre:       p.nombre ?? '',
            apellido:     (p as any).apellido ?? '',
            tipoDoc:      p.tipoDoc ?? 'CC',
            numDoc:       String(p.cedula ?? ''),
            correo:       p.correo ?? '',
            telefono:     String((p as any).telefono ?? ''),
            fotoPerfil:   (p as any).fotoPerfil ?? null,
            municipio:    (p.municipio as any)?.nombre ?? '',
            estado:       p.estado ?? 'activo',
            esLider:      p.esLider ?? false,
            areaLiderada: p.areaLiderada ?? null,
            esTransversal:(p as any).esTransversal ?? false,
            sesionActiva: activePersonaIds.has(p.idPersona),
        }));
    }

    @Get('instructores')
    getInstructores() { return this.personasConSesion('instructor'); }

    @Get('instructores/stats')
    async getInstructoresStats() {
        const total   = await this.personaRepo.count({ where: { cargo: 'instructor' as any } });
        const lideres = await this.personaRepo.count({ where: { cargo: 'instructor' as any, esLider: true } });
        return { total, lideres };
    }

    @Get('instructores/:id')
    async getInstructorById(@Param('id') id: string) {
        const p = await this.personaRepo.findOne({ where: { idPersona: id } });
        if (!p) return null;
        return {
            id: p.idPersona, nombre: p.nombre ?? '', apellido: (p as any).apellido ?? '',
            tipoDoc: p.tipoDoc ?? 'CC', numDoc: String(p.cedula ?? ''), correo: p.correo ?? '',
            esLider: p.esLider ?? false, areaLiderada: p.areaLiderada ?? null,
            esTransversal: (p as any).esTransversal ?? false,
        };
    }

    @Put('instructores/:id')
    async updateInstructor(@Param('id') id: string, @Body() dto: any) {
        await this.personaRepo.update(id, dto);
        return this.personaRepo.findOne({ where: { idPersona: id } });
    }

    @Patch('instructores/:id/lider')
    async setLider(@Param('id') id: string, @Body() body: { esLider: boolean; areaLiderada?: string }) {
        await this.personaRepo.update(id, { esLider: body.esLider, areaLiderada: body.esLider ? (body.areaLiderada ?? null) : null } as any);
        if (body.esLider && body.areaLiderada) {
            const area = await this.areaRepo.findOne({ where: { nombre: body.areaLiderada } });
            if (area) await this.areaRepo.update(area.idArea, { liderId: id } as any);
        } else if (!body.esLider) {
            await this.areaRepo.update({ liderId: id } as any, { liderId: null } as any);
        }
        const p = await this.personaRepo.findOne({ where: { idPersona: id } });
        if (!p) return null;
        return {
            id: p.idPersona, nombre: p.nombre ?? '', apellido: (p as any).apellido ?? '',
            tipoDoc: p.tipoDoc ?? 'CC', numDoc: String(p.cedula ?? ''), correo: p.correo ?? '',
            municipio: (p.municipio as any)?.nombre ?? '', esLider: p.esLider ?? false,
            areaLiderada: p.areaLiderada ?? null, esTransversal: (p as any).esTransversal ?? false,
        };
    }

    @Patch('instructores/:id/transversal')
    async setTransversal(@Param('id') id: string, @Body() body: { esTransversal: boolean }) {
        await this.personaRepo.update(id, { esTransversal: body.esTransversal } as any);
        const p = await this.personaRepo.findOne({ where: { idPersona: id } });
        if (!p) return null;
        return {
            id: p.idPersona, nombre: p.nombre ?? '', apellido: (p as any).apellido ?? '',
            tipoDoc: p.tipoDoc ?? 'CC', numDoc: String(p.cedula ?? ''), correo: p.correo ?? '',
            municipio: (p.municipio as any)?.nombre ?? '', esLider: p.esLider ?? false,
            areaLiderada: p.areaLiderada ?? null, esTransversal: (p as any).esTransversal ?? false,
        };
    }

    @Get('administradores')
    getAdministradores() { return this.personasConSesion('administrador'); }

    @Get('aprendices')
    async getAprendices() {
        const base = await this.personasConSesion('aprendiz');
        const personas = await this.personaRepo.find({ where: { cargo: 'aprendiz' as any }, relations: ['ficha', 'ficha.programa'] });
        const fichaMap = new Map(personas.map(p => [p.idPersona, (p as any).ficha ?? null]));
        return base.map(r => {
            const ficha = fichaMap.get(r.id);
            return { ...r, ficha: ficha ? { id: ficha.idCurso, codigo: ficha.codigo ?? '', programa: (ficha.programa as any)?.nombre ?? '' } : null };
        });
    }

    @Get('aprendices/:id')
    async getAprendizById(@Param('id') id: string) {
        const p = await this.personaRepo.findOne({ where: { idPersona: id }, relations: ['ficha', 'ficha.programa'] });
        if (!p) return null;
        const ficha = (p as any).ficha ?? null;
        return {
            id: p.idPersona, nombre: p.nombre ?? '', apellido: (p as any).apellido ?? '',
            fichaId: (p as any).fichaId ?? null,
            ficha: ficha ? { id: ficha.idCurso, codigo: ficha.codigo ?? '', programa: (ficha.programa as any)?.nombre ?? '' } : null,
        };
    }

    @Put('aprendices/:id')
    async updateAprendiz(@Param('id') id: string, @Body() dto: any) {
        await this.personaRepo.update(id, dto);
        return this.personaRepo.findOne({ where: { idPersona: id } });
    }

    @Public()
    @Get('fichas')
    async getFichas() {
        const list = await this.cursoRepo.find({ relations: ['area', 'programa'], order: { codigo: 'ASC' } });
        return list.map(f => ({
            id: f.idCurso, idCurso: f.idCurso, codigo: f.codigo ?? '',
            programa: (f.programa as any)?.nombre ?? (f.programa as any)?.programa ?? '',
            area: (f.area as any)?.nombre ?? (f.area as any)?.area ?? '',
            estado: f.estado ?? 'activo',
        }));
    }

    @Post('fichas')
    createFicha(@Body() dto: any) { return this.cursoRepo.save(this.cursoRepo.create(dto)); }

    @Put('fichas/:id')
    async updateFicha(@Param('id') id: string, @Body() dto: any) {
        await this.cursoRepo.update(id, dto);
        return this.cursoRepo.findOne({ where: { idCurso: id } });
    }

    @Delete('fichas/:id')
    async deleteFicha(@Param('id') id: string) {
        await this.cursoRepo.delete(id);
        return { ok: true };
    }

    // ambientes/disponibilidad, ambientes/libres-ahora y ambientes/disponibles-transversal
    // fueron movidos a AmbientesController para evitar conflicto con GET /ambientes/:id.
    // ubicaciones/tipos y ubicaciones/disponibles-transversal
    // fueron movidos a UbicacionesController para evitar conflicto con GET /ubicaciones/:id.

    @Post('upload/foto')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const dir = join(process.cwd(), 'uploads', 'fotos');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, unique + extname(file.originalname));
            },
        }),
    }))
    uploadFoto(@UploadedFile() file: Express.Multer.File) {
        return { url: `/uploads/fotos/${file.filename}`, filename: file.filename };
    }
}
