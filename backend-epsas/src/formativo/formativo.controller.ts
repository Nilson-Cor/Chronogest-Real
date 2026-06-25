import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

// Servicios inyectados vía módulos importados
import { PersonasService } from '../personas/application/services/personas.service';
import { AreasService } from '../areas/application/services/areas.service';
import { AmbientesService } from '../ambientes/application/services/ambientes.service';

// Repositorios resueltos dinámicamente (entidades sin módulo propio en FormativoModule)
import { Repository } from 'typeorm';
import { Departamento } from '../departamentos/infrastructure/persistence/departamento.entity';
import { Municipio } from '../municipios/infrastructure/persistence/municipio.entity';
import { CentroFormacion } from '../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Sede } from '../sedes/infrastructure/persistence/sede.entity';
import { Ambiente } from '../ambientes/infrastructure/persistence/ambiente.entity';
import { Programa } from '../programas/infrastructure/persistence/programa.entity';
import { Curso } from '../cursos/infrastructure/persistence/curso.entity';
import { Matricula } from '../matriculas/infrastructure/persistence/matricula.entity';
import { Aplicativo } from '../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Rol } from '../roles/infrastructure/persistence/rol.entity';
import { Modulo } from '../modulos/infrastructure/persistence/modulo.entity';
import { Servicio } from '../servicios/infrastructure/persistence/servicio.entity';
import { Usuario } from '../usuarios/infrastructure/persistence/usuario.entity';
import { Credencial } from '../credenciales/infrastructure/persistence/credencial.entity';
import { Permiso } from '../permisos/infrastructure/persistence/permiso.entity';
import { Acceso } from '../accesos/infrastructure/persistence/acceso.entity';
import { Persona } from '../personas/infrastructure/persistence/persona.entity';
import * as bcrypt from 'bcrypt';
import { CentroTenantContextService } from '../common/centro-tenant-context.service';

@UseGuards(JwtAuthGuard)
@Controller('formativo')
export class FormativoController {
    constructor(
        private readonly personasService: PersonasService,
        private readonly areasService: AreasService,
        private readonly ambientesService: AmbientesService,
    ) {}

    private get centroRepo(): Repository<CentroFormacion> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(CentroFormacion);
    }
    private get sedeRepo(): Repository<Sede> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Sede);
    }
    private get ambienteRepo(): Repository<Ambiente> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Ambiente);
    }
    private get programaRepo(): Repository<Programa> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Programa);
    }
    private get cursoRepo(): Repository<Curso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Curso);
    }
    private get matriculaRepo(): Repository<Matricula> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Matricula);
    }
    private get aplicativoRepo(): Repository<Aplicativo> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Aplicativo);
    }
    private get rolRepo(): Repository<Rol> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Rol);
    }
    private get moduloRepo(): Repository<Modulo> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Modulo);
    }
    private get servicioRepo(): Repository<Servicio> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Servicio);
    }
    private get usuarioRepo(): Repository<Usuario> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Usuario);
    }
    private get credencialRepo(): Repository<Credencial> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Credencial);
    }
    private get permisoRepo(): Repository<Permiso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Permiso);
    }
    private get accesoRepo(): Repository<Acceso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Acceso);
    }
    private get personaRepo(): Repository<Persona> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
    }
    private get deptoRepo(): Repository<Departamento> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Departamento);
    }
    private get municipioRepo(): Repository<Municipio> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Municipio);
    }

    // ── CENTROS ─────────────────────────────────────────────────────────────
    @Get('centros')
    async getCentros() {
        const list = await this.centroRepo.find({ relations: ['municipio'], order: { nombre: 'ASC' } });
        return list.map(c => ({
            id: c.idCentro,
            idCentro: c.idCentro,
            nombre: c.nombre,
            direccion: c.direccion,
            municipioId: c.municipioId,
            municipio_nombre: (c as any).municipio?.nombre ?? null,
        }));
    }

    @Post('centros')
    createCentro(@Body() b: any) {
        return this.centroRepo.save(this.centroRepo.create(b));
    }

    @Put('centros/:id')
    async updateCentro(@Param('id') id: string, @Body() b: any) {
        await this.centroRepo.update(id, { nombre: b.nombre, direccion: b.direccion, municipioId: b.municipioId });
        return this.centroRepo.findOne({ where: { idCentro: id } });
    }

    @Delete('centros/:id')
    async deleteCentro(@Param('id') id: string) {
        await this.centroRepo.delete(id);
        return { ok: true };
    }

    // ── SEDES ────────────────────────────────────────────────────────────────
    @Get('sedes')
    async getSedes() {
        const list = await this.sedeRepo.find({ relations: ['centroFormacion'], order: { nombre: 'ASC' } });
        return list.map(s => ({
            id: String(s.idSede),
            idSede: String(s.idSede),
            nombre: s.nombre,
            centroFormacionId: s.centroFormacionId,
            centro_nombre: (s as any).centroFormacion?.nombre ?? null,
        }));
    }

    @Post('sedes')
    async createSede(@Body() b: any) {
        const s = this.sedeRepo.create({ nombre: b.nombre, centroFormacionId: b.centroFormacionId });
        return this.sedeRepo.save(s);
    }

    @Put('sedes/:id')
    async updateSede(@Param('id') id: string, @Body() b: any) {
        await this.sedeRepo.update(id, { nombre: b.nombre, centroFormacionId: b.centroFormacionId });
        const s = await this.sedeRepo.findOne({ where: { idSede: id as any }, relations: ['centroFormacion'] });
        return s ? { id: String(s.idSede), idSede: String(s.idSede), nombre: s.nombre, centroFormacionId: s.centroFormacionId, centro_nombre: (s as any).centroFormacion?.nombre ?? null } : null;
    }

    @Delete('sedes/:id')
    async deleteSede(@Param('id') id: string) {
        await this.sedeRepo.delete(id);
        return { ok: true };
    }

    // ── DEPARTAMENTOS ────────────────────────────────────────────────────────
    @Public()
    @Get('departamentos')
    async getDepartamentos() {
        const list = await this.deptoRepo.find({ order: { nombre: 'ASC' } });
        return list.map(d => ({ id: d.idDepartamento, idDepartamento: d.idDepartamento, nombre: d.nombre }));
    }

    @Post('departamentos')
    async createDepto(@Body() b: any) {
        const d = this.deptoRepo.create({ nombre: b.nombre });
        const saved = await this.deptoRepo.save(d);
        return { id: saved.idDepartamento, idDepartamento: saved.idDepartamento, nombre: saved.nombre };
    }

    @Put('departamentos/:id')
    async updateDepto(@Param('id') id: string, @Body() b: any) {
        await this.deptoRepo.update(id, { nombre: b.nombre });
        const d = await this.deptoRepo.findOne({ where: { idDepartamento: id } });
        return { id: d!.idDepartamento, idDepartamento: d!.idDepartamento, nombre: d!.nombre };
    }

    @Delete('departamentos/:id')
    async deleteDepto(@Param('id') id: string) {
        await this.deptoRepo.delete(id);
        return { ok: true };
    }

    // ── MUNICIPIOS ────────────────────────────────────────────────────────────
    @Public()
    @Get('municipios')
    async getMunicipios() {
        const list = await this.municipioRepo.find({ relations: ['departamento'], order: { nombre: 'ASC' } });
        return list.map(m => ({
            id: m.idMunicipio,
            idMunicipio: m.idMunicipio,
            nombre: m.nombre,
            departamentoId: m.departamentoId,
            departamento_nombre: (m as any).departamento?.nombre ?? null,
        }));
    }

    @Post('municipios')
    async createMunicipio(@Body() b: any) {
        const m = this.municipioRepo.create({ nombre: b.nombre, departamentoId: b.departamentoId });
        const saved = await this.municipioRepo.save(m);
        return { id: saved.idMunicipio, idMunicipio: saved.idMunicipio, nombre: saved.nombre, departamentoId: saved.departamentoId };
    }

    @Put('municipios/:id')
    async updateMunicipio(@Param('id') id: string, @Body() b: any) {
        await this.municipioRepo.update(id, { nombre: b.nombre, departamentoId: b.departamentoId });
        const m = await this.municipioRepo.findOne({ where: { idMunicipio: id }, relations: ['departamento'] });
        return {
            id: m!.idMunicipio, idMunicipio: m!.idMunicipio,
            nombre: m!.nombre, departamentoId: m!.departamentoId,
            departamento_nombre: (m as any)!.departamento?.nombre ?? null,
        };
    }

    @Delete('municipios/:id')
    async deleteMunicipio(@Param('id') id: string) {
        await this.municipioRepo.delete(id);
        return { ok: true };
    }

    // ── ÁREAS ─────────────────────────────────────────────────────────────────
    @Get('areas')
    getAreas() { return this.areasService.obtenerTodos(); }

    @Post('areas')
    async createArea(@Body() b: any) {
        const result = await this.areasService.crear({ nombre: b.nombre, sedeId: b.sedeId, liderId: b.liderId });
        // Sincronizar esLider en la Persona asignada como líder
        if (b.liderId) {
            await this.personaRepo.update(b.liderId, { esLider: true, areaLiderada: b.nombre } as any);
        }
        return result;
    }

    @Put('areas/:id')
    async updateArea(@Param('id') id: string, @Body() b: any) {
        // Obtener el líder anterior antes de actualizar
        const areaActual = await this.areasService.obtenerPorId(id);
        const liderAnteriorId = areaActual.liderId;

        const result = await this.areasService.actualizar(id, { nombre: b.nombre, sedeId: b.sedeId, liderId: b.liderId } as any);

        // Siempre sincronizar el líder actual (sin importar si cambió o no)
        if (b.liderId) {
            await this.personaRepo.update(b.liderId, { esLider: true, areaLiderada: b.nombre } as any);
        }
        // Si el líder cambió, quitar el rol al anterior
        if (liderAnteriorId && liderAnteriorId !== b.liderId) {
            await this.personaRepo.update(liderAnteriorId, { esLider: false, areaLiderada: null } as any);
        }
        // Si se quitó el líder (b.liderId vacío)
        if (!b.liderId && liderAnteriorId) {
            await this.personaRepo.update(liderAnteriorId, { esLider: false, areaLiderada: null } as any);
        }

        return result;
    }

    @Delete('areas/:id')
    async deleteArea(@Param('id') id: string) {
        // 1. Limpiar esLider del instructor líder de esta área
        const area = await this.areasService.obtenerPorId(id);
        if (area.liderId) {
            await this.personaRepo.update(area.liderId, { esLider: false, areaLiderada: null } as any);
        }
        // 2. Desvincular AMBIENTES que apuntan a esta área (FK: ambientes.area → areas)
        await this.ambienteRepo.update({ areaId: id } as any, { areaId: null } as any);
        // 3. Desvincular CURSOS que apuntan a esta área (FK: cursos.area → areas)
        await this.cursoRepo.update({ areaId: id } as any, { areaId: null } as any);
        // 4. Eliminar el área (ya sin referencias)
        return this.areasService.eliminar(id);
    }

    // ── AMBIENTES (unificado: incluye aulas, labs, auditorios, etc.) ──────────
    @Get('ambientes')
    async getAmbientes() {
        const list = await this.ambienteRepo.find({ relations: ['sede', 'municipio', 'area'], order: { nombre: 'ASC' } });
        return list.map(a => ({
            id: a.idAmbiente,
            idAmbiente: a.idAmbiente,
            nombre: a.nombre,
            tipo: a.tipo,
            estado: (a as any).estado ?? 'activo',
            capacidad: a.capacidad,
            sedeId: a.sedeId,
            sede_nombre: (a as any).sede?.nombre ?? null,
            municipioId: a.municipioId,
            municipio_nombre: (a as any).municipio?.nombre ?? null,
            areaId: a.areaId,
            area_nombre: (a as any).area?.nombre ?? null,
        }));
    }

    @Post('ambientes')
    async createAmbiente(@Body() b: any) {
        const a = this.ambienteRepo.create({
            nombre: b.nombre, tipo: b.tipo ?? 'Aula',
            estado: b.estado ?? 'activo',
            capacidad: b.capacidad,
            sedeId: b.sedeId, municipioId: b.municipioId, areaId: b.areaId,
        });
        return this.ambienteRepo.save(a);
    }

    @Put('ambientes/:id')
    async updateAmbiente(@Param('id') id: string, @Body() b: any) {
        await this.ambienteRepo.update(id, {
            nombre: b.nombre, tipo: b.tipo,
            estado: b.estado,
            capacidad: b.capacidad,
            sedeId: b.sedeId, municipioId: b.municipioId, areaId: b.areaId,
        });
        return this.ambienteRepo.findOne({ where: { idAmbiente: id }, relations: ['sede', 'municipio', 'area'] });
    }

    @Delete('ambientes/:id')
    async deleteAmbiente(@Param('id') id: string) { await this.ambienteRepo.delete(id); return { ok: true }; }

    // ── PROGRAMAS ─────────────────────────────────────────────────────────────
    @Get('programas')
    async getProgramas() {
        const list = await this.programaRepo.find({ order: { nombre: 'ASC' } });
        return list.map(p => ({ id: p.idPrograma, idPrograma: p.idPrograma, nombre: p.nombre, tipo: (p as any).tipo }));
    }

    @Post('programas')
    async createPrograma(@Body() b: any) {
        const saved = (await this.programaRepo.save(this.programaRepo.create(b))) as unknown as Programa;
        return { id: saved.idPrograma, idPrograma: saved.idPrograma, nombre: saved.nombre, tipo: (saved as any).tipo };
    }

    @Put('programas/:id')
    async updatePrograma(@Param('id') id: string, @Body() b: any) {
        await this.programaRepo.update(id, b);
        const p = await this.programaRepo.findOne({ where: { idPrograma: id } });
        return { id: p!.idPrograma, idPrograma: p!.idPrograma, nombre: p!.nombre, tipo: (p as any)!.tipo };
    }

    @Delete('programas/:id')
    async deletePrograma(@Param('id') id: string) { await this.programaRepo.delete(id); return { ok: true }; }

    // ── PERSONAS ──────────────────────────────────────────────────────────────
    @Get('personas')
    getPersonas() { return this.personasService.obtenerTodos(); }

    @Post('personas')
    createPersona(@Body() b: any) {
        return this.personasService.crear({ ...b, cedula: b.cedula ?? b.identificacion });
    }

    @Put('personas/:id')
    updatePersona(@Param('id') id: string, @Body() b: any) { return this.personasService.actualizar(id, b); }

    @Delete('personas/:id')
    deletePersona(@Param('id') id: string) { return this.personasService.eliminar(id); }

    // ── CURSOS (FICHAS) ───────────────────────────────────────────────────────
    @Get('cursos')
    async getCursos() {
        const list = await this.cursoRepo.find({ relations: ['area', 'programa', 'lider', 'ambiente'] });
        return list.map(c => ({
            id: c.idCurso,
            idCurso: c.idCurso,
            codigo: c.codigo,
            estado: c.estado,
            fechaInicio: c.fechaInicio,
            fechaFin: c.fechaFin,
            finLectiva: c.finLectiva,
            programaId: c.programaId,
            programa_nombre: (c as any).programa?.nombre ?? null,
            areaId: c.areaId,
            area_nombre: (c as any).area?.nombre ?? null,
            liderId: c.liderId,
            lider_nombre: (c as any).lider
                ? `${(c as any).lider.nombre} ${(c as any).lider.apellido ?? ''}`.trim()
                : null,
            ambienteId: c.ambienteId,
            ambiente_nombre: (c as any).ambiente?.nombre ?? null,
        }));
    }

    @Post('cursos')
    async createCurso(@Body() b: any) {
        const c = this.cursoRepo.create({
            codigo: b.codigo,
            estado: b.estado,
            fechaInicio: b.fechaInicio   || null,
            fechaFin: b.fechaFin         || null,
            finLectiva: b.finLectiva     || null,
            areaId: b.areaId             || null,
            programaId: b.programaId     || null,
            liderId: b.liderId           || null,
            ambienteId: b.ambienteId     || null,
        });
        return this.cursoRepo.save(c);
    }

    @Put('cursos/:id')
    async updateCurso(@Param('id') id: string, @Body() b: any) {
        await this.cursoRepo.update(id, {
            codigo: b.codigo,
            estado: b.estado,
            fechaInicio: b.fechaInicio   || null,
            fechaFin: b.fechaFin         || null,
            finLectiva: b.finLectiva     || null,
            areaId: b.areaId             || null,
            programaId: b.programaId     || null,
            liderId: b.liderId           || null,
            ambienteId: b.ambienteId     || null,
        });
        return this.cursoRepo.findOne({ where: { idCurso: id }, relations: ['area', 'programa', 'lider', 'ambiente'] });
    }

    @Delete('cursos/:id')
    async deleteCurso(@Param('id') id: string) { await this.cursoRepo.delete(id); return { ok: true }; }

    // ── MATRÍCULAS ────────────────────────────────────────────────────────────
    @Get('matriculas')
    async getMatriculas() {
        const list = await this.matriculaRepo.find({
            relations: ['persona', 'curso'],
            order: { idMatricula: 'DESC' },
        });
        return list.map(m => ({
            id: m.idMatricula,
            idMatricula: m.idMatricula,
            personaId: m.idPersona,
            cursoId: m.idCurso,
            persona_nombre: (m as any).persona
                ? `${(m as any).persona.nombre} ${(m as any).persona.apellido ?? ''}`.trim()
                : null,
            persona_doc: (m as any).persona?.cedula ?? null,
            curso_codigo: (m as any).curso?.codigo ?? null,
            fecha_matricula: m.fechaMatricula,
            fechaMatricula: m.fechaMatricula,
            estado: m.estado,
            avance: m.avance,
        }));
    }

    @Post('matriculas')
    async createMatricula(@Body() b: any) {
        const m = this.matriculaRepo.create({
            idPersona: b.persona,
            idCurso: b.curso,
            persona: { idPersona: b.persona } as any,
            curso: { idCurso: b.curso } as any,
            estado: b.estado ?? 'activo',
            fechaMatricula: b.fechaMatricula ?? null,
        });
        return this.matriculaRepo.save(m);
    }

    @Put('matriculas/:id')
    async updateMatricula(@Param('id') id: string, @Body() b: any) {
        await this.matriculaRepo.update(id, { estado: b.estado });
        return this.matriculaRepo.findOne({ where: { idMatricula: id } });
    }

    @Delete('matriculas/:id')
    async deleteMatricula(@Param('id') id: string) { await this.matriculaRepo.delete(id); return { ok: true }; }

    // ── APLICATIVOS ────────────────────────────────────────────────────────────
    @Get('aplicativos')
    async getAplicativos() {
        const list = await this.aplicativoRepo.find({ order: { nombre: 'ASC' } });
        return list.map(a => ({ id: a.idAplicativo, idAplicativo: a.idAplicativo, nombre: a.nombre }));
    }

    @Post('aplicativos')
    async createAplicativo(@Body() b: any) {
        const saved = (await this.aplicativoRepo.save(this.aplicativoRepo.create(b))) as unknown as Aplicativo;
        return { id: saved.idAplicativo, idAplicativo: saved.idAplicativo, nombre: saved.nombre };
    }

    @Put('aplicativos/:id')
    async updateAplicativo(@Param('id') id: string, @Body() b: any) {
        await this.aplicativoRepo.update(id, { nombre: b.nombre });
        const a = await this.aplicativoRepo.findOne({ where: { idAplicativo: id } });
        return { id: a!.idAplicativo, idAplicativo: a!.idAplicativo, nombre: a!.nombre };
    }

    @Delete('aplicativos/:id')
    async deleteAplicativo(@Param('id') id: string) { await this.aplicativoRepo.delete(id); return { ok: true }; }

    // ── ROLES ──────────────────────────────────────────────────────────────────
    @Get('roles')
    async getRoles() {
        const list = await this.rolRepo.find({ relations: ['aplicativo'], order: { nombre: 'ASC' } });
        return list.map(r => ({
            id: r.idRol,
            idRol: r.idRol,
            nombre: r.nombre,
            aplicativoId: r.aplicativoId,
            aplicativo_nombre: (r as any).aplicativo?.nombre ?? null,
        }));
    }

    @Post('roles')
    async createRol(@Body() b: any) {
        const r = this.rolRepo.create({ nombre: b.nombre, aplicativoId: b.aplicativoId });
        return this.rolRepo.save(r);
    }

    @Put('roles/:id')
    async updateRol(@Param('id') id: string, @Body() b: any) {
        await this.rolRepo.update(id, { nombre: b.nombre, aplicativoId: b.aplicativoId });
        return this.rolRepo.findOne({ where: { idRol: id }, relations: ['aplicativo'] });
    }

    @Delete('roles/:id')
    async deleteRol(@Param('id') id: string) { await this.rolRepo.delete(id); return { ok: true }; }

    // ── MÓDULOS ────────────────────────────────────────────────────────────────
    @Get('modulos')
    async getModulos() {
        const list = await this.moduloRepo.find({ relations: ['aplicativo'], order: { modulo: 'ASC' } });
        return list.map(m => ({
            id: String(m.idModulo),
            idModulo: String(m.idModulo),
            nombre: (m as any).modulo ?? '',
            aplicativoId: m.aplicativoId,
            aplicativo_nombre: (m as any).aplicativo?.nombre ?? null,
        }));
    }

    @Post('modulos')
    async createModulo(@Body() b: any) {
        const saved = (await this.moduloRepo.save(
            this.moduloRepo.create({ modulo: b.nombre, aplicativoId: b.aplicativoId } as any),
        )) as unknown as Modulo;
        return { id: String(saved.idModulo), idModulo: String(saved.idModulo), nombre: (saved as any).modulo ?? '', aplicativoId: saved.aplicativoId };
    }

    @Put('modulos/:id')
    async updateModulo(@Param('id') id: string, @Body() b: any) {
        await this.moduloRepo.update(id, { modulo: b.nombre } as any);
        const m = await this.moduloRepo.findOne({ where: { idModulo: id }, relations: ['aplicativo'] });
        return m ? { id: String(m.idModulo), idModulo: String(m.idModulo), nombre: (m as any).modulo ?? '', aplicativoId: m.aplicativoId, aplicativo_nombre: (m as any).aplicativo?.nombre ?? null } : null;
    }

    @Delete('modulos/:id')
    async deleteModulo(@Param('id') id: string) { await this.moduloRepo.delete(id); return { ok: true }; }

    // ── SERVICIOS ──────────────────────────────────────────────────────────────
    @Get('servicios')
    async getServicios() {
        const list = await this.servicioRepo.find({ relations: ['modulo'], order: { nombre: 'ASC' } });
        return list.map(s => ({
            id: String(s.idServicio),
            idServicio: String(s.idServicio),
            nombre: s.nombre,
            url: s.url,
            moduloId: String(s.moduloId),
            modulo_nombre: (s as any).modulo?.modulo ?? null,
        }));
    }

    @Post('servicios')
    async createServicio(@Body() b: any) {
        const saved = (await this.servicioRepo.save(
            this.servicioRepo.create({ nombre: b.nombre, url: b.url, modulo: { idModulo: b.moduloId } as any }),
        )) as Servicio;
        return { id: String(saved.idServicio), idServicio: String(saved.idServicio), nombre: saved.nombre, url: saved.url, moduloId: String(saved.moduloId) };
    }

    @Put('servicios/:id')
    async updateServicio(@Param('id') id: string, @Body() b: any) {
        await this.servicioRepo.update(id, { nombre: b.nombre, url: b.url });
        return this.servicioRepo.findOne({ where: { idServicio: id }, relations: ['modulo'] });
    }

    @Delete('servicios/:id')
    async deleteServicio(@Param('id') id: string) { await this.servicioRepo.delete(id); return { ok: true }; }

    // ── USUARIOS ────────────────────────────────────────────────────────────────
    @Get('usuarios')
    async getUsuarios() {
        const list = await this.usuarioRepo.find({ relations: ['persona', 'aplicativo'] });
        return list.map(u => ({
            id: u.idUsuario,
            idUsuario: u.idUsuario,
            estado: u.estado,
            personaId: (u as any).persona?.idPersona ?? null,
            persona_nombre: (u as any).persona
                ? `${(u as any).persona.nombre} ${(u as any).persona.apellido ?? ''}`.trim()
                : null,
            persona_doc: (u as any).persona?.cedula ?? null,
            cargo: (u as any).persona?.cargo ?? null,
            aplicativoId: (u as any).aplicativo?.idAplicativo ?? null,
            aplicativo_nombre: (u as any).aplicativo?.nombre ?? null,
        }));
    }

    @Post('usuarios')
    async createUsuario(@Body() b: any) {
        return this.usuarioRepo.save(this.usuarioRepo.create({
            persona: { idPersona: b.personaId } as any,
            aplicativo: { idAplicativo: b.aplicativoId } as any,
            estado: b.estado ?? 'activo',
        }));
    }

    @Put('usuarios/:id')
    async updateUsuario(@Param('id') id: string, @Body() b: any) {
        await this.usuarioRepo.update(id, { estado: b.estado });
        return this.usuarioRepo.findOne({ where: { idUsuario: id }, relations: ['persona', 'aplicativo'] });
    }

    @Delete('usuarios/:id')
    async deleteUsuario(@Param('id') id: string) {
        await CentroTenantContextService.getEpsasDataSource().transaction(async manager => {
            // El usuario es la entidad padre: PostgreSQL impide eliminarlo mientras
            // existan sesiones, permisos o credenciales que todavía lo referencien.
            await manager.createQueryBuilder().delete().from(Acceso).where('"usuario" = :id', { id }).execute();
            await manager.createQueryBuilder().delete().from(Permiso).where('"usuario" = :id', { id }).execute();
            await manager.createQueryBuilder().delete().from(Credencial).where('"usuario" = :id', { id }).execute();
            await manager.delete(Usuario, id);
        });
        return { ok: true };
    }

    // ── CREDENCIALES ──────────────────────────────────────────────────────────
    @Get('credenciales')
    async getCredenciales() {
        const list = await this.credencialRepo.find({ relations: ['usuario', 'usuario.persona', 'rol'] });
        return list.map(c => ({
            id: c.idCredencial,
            idCredencial: c.idCredencial,
            login: c.login,
            usuarioId: (c as any).usuario?.idUsuario ?? null,
            usuario_nombre: (c as any).usuario?.persona
                ? `${(c as any).usuario.persona.nombre} ${(c as any).usuario.persona.apellido ?? ''}`.trim()
                : null,
            rolId: (c as any).rol?.idRol ?? null,
            rol_nombre: (c as any).rol?.nombre ?? null,
        }));
    }

    @Post('credenciales')
    async createCredencial(@Body() b: any) {
        const hash = await bcrypt.hash(b.password, 10);
        return this.credencialRepo.save(this.credencialRepo.create({
            login: b.login,
            password: hash,
            rol: b.rolId ? { idRol: b.rolId } as any : undefined,
            usuario: { idUsuario: b.usuarioId } as any,
        }));
    }

    @Put('credenciales/:id')
    async updateCredencial(@Param('id') id: string, @Body() b: any) {
        const credencial = await this.credencialRepo.findOne({ where: { idCredencial: id } });
        if (!credencial) throw new Error('Credencial no encontrada');
        if (b.login) credencial.login = b.login;
        if (b.password) credencial.password = await bcrypt.hash(b.password, 10);
        // Actualizar rol: b.rolId = UUID asigna el rol; b.rolId = '' o null lo quita
        if (b.rolId !== undefined) {
            (credencial as any).rol = b.rolId ? { idRol: b.rolId } : null;
        }
        await this.credencialRepo.save(credencial);
        const updated = await this.credencialRepo.findOne({
            where: { idCredencial: id },
            relations: ['usuario', 'usuario.persona', 'rol'],
        });
        return {
            id: updated!.idCredencial,
            idCredencial: updated!.idCredencial,
            login: updated!.login,
            usuarioId: (updated as any).usuarioId ?? null,
            usuario_nombre: (updated as any).usuario?.persona
                ? `${(updated as any).usuario.persona.nombre} ${(updated as any).usuario.persona.apellido ?? ''}`.trim()
                : null,
            rolId: (updated as any).rol?.idRol ?? null,
            rol_nombre: (updated as any).rol?.nombre ?? null,
        };
    }

    @Delete('credenciales/:id')
    async deleteCredencial(@Param('id') id: string) { await this.credencialRepo.delete(id); return { ok: true }; }

    // ── PERMISOS ──────────────────────────────────────────────────────────────
    @Get('permisos')
    async getPermisos() {
        const list = await this.permisoRepo.find({ relations: ['usuario', 'usuario.persona', 'rol', 'servicio'] });
        return list.map(p => ({
            id: String(p.idPermiso),
            idPermiso: String(p.idPermiso),
            usuarioId: p.usuarioId,
            usuario_nombre: (p as any).usuario?.persona
                ? `${(p as any).usuario.persona.nombre} ${(p as any).usuario.persona.apellido ?? ''}`.trim()
                : null,
            rolId: p.rolId,
            rol_nombre: (p as any).rol?.nombre ?? null,
            servicioId: String(p.servicioId),
            servicio_nombre: (p as any).servicio?.nombre ?? null,
        }));
    }

    @Post('permisos')
    async createPermiso(@Body() b: any) {
        return this.permisoRepo.save(this.permisoRepo.create({
            usuario: { idUsuario: b.usuarioId } as any,
            rol: b.rolId ? { idRol: b.rolId } as any : undefined,
            servicio: { idServicio: b.servicioId } as any,
        }));
    }

    @Delete('permisos/:id')
    async deletePermiso(@Param('id') id: string) { await this.permisoRepo.delete(id); return { ok: true }; }

    // ── ACCESOS (solo lectura) ─────────────────────────────────────────────────
    @Get('accesos')
    async getAccesos(@Query('limit') limit = '100') {
        const list = await this.accesoRepo.find({
            relations: ['usuario', 'usuario.persona'],
            order: { fechaIngreso: 'DESC' },
            take: +limit,
        });
        return list.map(a => ({
            id: a.idAcceso,
            idAcceso: a.idAcceso,
            usuarioId: a.usuarioId,
            usuario_nombre: (a as any).usuario?.persona
                ? `${(a as any).usuario.persona.nombre} ${(a as any).usuario.persona.apellido ?? ''}`.trim()
                : null,
            fechaIngreso: a.fechaIngreso,
            fechaSalida: a.fechaSalida,
            estado: a.estado,
        }));
    }
}
