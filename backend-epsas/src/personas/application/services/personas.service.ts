import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Persona } from '../../infrastructure/persistence/persona.entity';
import { CreatePersonaDto, tipoEstado } from '../dtos/create-persona.dto';
import { UpdatePersonaDto } from '../dtos/update-persona.dto';
import { Acceso } from '../../../accesos/infrastructure/persistence/acceso.entity';
import { Area } from '../../../areas/infrastructure/persistence/area.entity';
import { Credencial } from '../../../credenciales/infrastructure/persistence/credencial.entity';
import { Curso } from '../../../cursos/infrastructure/persistence/curso.entity';
import { Matricula } from '../../../matriculas/infrastructure/persistence/matricula.entity';
import { Permiso } from '../../../permisos/infrastructure/persistence/permiso.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';


@Injectable()
export class PersonasService {
    private get repo(): Repository<Persona> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
    }

    async crear(dto: CreatePersonaDto): Promise<Persona> {
        const data: any = { ...dto };

        // Alias de migración: mapea numeroDocumento → cedula
        if (!data.cedula && data.numeroDocumento) {
            data.cedula = +data.numeroDocumento;
        }

        // personas.estado solo admite 'activo' | 'inactivo'.
        // Cualquier otro estado del Excel (certificado, cancelado, etc.)
        // se registra en la base secundaria del ERP (proyecto aparte).
        const INACTIVOS = new Set([
            'certificado', 'retiro voluntario', 'cancelado', 'trasladado', 'aplazado',
        ]);
        const estadoRaw = String(data.estado ?? 'activo').trim().toLowerCase();
        data.estado = INACTIVOS.has(estadoRaw) ? tipoEstado.INACTIVO : tipoEstado.ACTIVO;

        // Los aprendices migrados siempre llevan cargo = 'aprendiz'
        if (!data.cargo) {
            data.cargo = 'aprendiz';
        }

        const persona = this.repo.create(data as Persona);
        return await this.repo.save(persona);
    }

    /** Verifica si una persona existe por cédula.
     *  Retorna { exists: true, data: Persona } o { exists: false }
     */
    async verificarExistencia(cedula: number): Promise<{ exists: boolean; data?: Persona }> {
        if (!cedula || isNaN(cedula)) return { exists: false };

        const persona = await this.repo.findOne({
            where: { cedula },
            relations: ['municipio'],
        });

        return persona ? { exists: true, data: persona } : { exists: false };
    }

    async obtenerTodos(): Promise<any[]> {
        const list = await this.repo.find({ relations: ['municipio'] });
        return list.map(p => ({
            id: p.idPersona,
            idPersona: p.idPersona,
            nombre: p.nombre,
            apellido: (p as any).apellido ?? '',
            tipoDoc: p.tipoDoc,
            cedula: p.cedula,
            identificacion: p.cedula,           // alias para tabla y getOpts
            correo: p.correo,
            telefono: p.telefono,
            direccion: p.direccion,
            genero: p.genero,
            cargo: p.cargo,
            estado: p.estado,
            esLider: (p as any).esLider ?? false,
            municipioId: (p as any).municipioId,
            municipio_nombre: (p as any).municipio?.nombre ?? null,
            fichaId: (p as any).fichaId ?? null,
        }));
    }

    async obtenerPorId(id: string): Promise<Persona> {
        const persona = await this.repo.findOne({
            where: { idPersona: id },
            relations: ['municipio', 'usuarios'],
        });
        if (!persona) throw new NotFoundException(`Persona con ID ${id} no encontrada`);
        return persona;
    }

    async obtenerPorCedula(cedula: number): Promise<Persona> {
        const persona = await this.repo.findOne({
            where: { cedula },
            relations: ['municipio'],
        });
        if (!persona) throw new NotFoundException(`Persona con cédula ${cedula} no encontrada`);
        return persona;
    }

    async obtenerActivos(): Promise<Persona[]> {
        return await this.repo.find({
            where: { estado: tipoEstado.ACTIVO },
            relations: ['municipio'],
        });
    }

    async obtenerPorCargo(cargo: string): Promise<Persona[]> {
        return await this.repo.find({
            where: { cargo: cargo as any },
            relations: ['municipio'],
        });
    }

    async actualizar(id: string, dto: UpdatePersonaDto): Promise<Persona> {
  const persona = await this.obtenerPorId(id);

  const { municipioId, ...resto } = dto as any;

  Object.assign(persona, resto);

  // Asigna el FK directamente sin tocar el objeto relación
  if (municipioId !== undefined) {
    (persona as any).municipioId = municipioId;
    persona.municipio = { idMunicipio: municipioId } as any;
  }

  return await this.repo.save(persona);
}

    async eliminar(id: string): Promise<{ mensaje: string }> {
        const persona = await this.obtenerPorId(id);
        const dataSource = CentroTenantContextService.getEpsasDataSource();
        await dataSource.transaction(async manager => {
            const usuarios = await manager.find(Usuario, {
                where: { persona: { idPersona: id } },
            });
            const usuarioIds = usuarios.map(usuario => usuario.idUsuario);

            if (usuarioIds.length) {
                await manager.createQueryBuilder().delete().from(Acceso).where('"usuario" IN (:...usuarioIds)', { usuarioIds }).execute();
                await manager.createQueryBuilder().delete().from(Permiso).where('"usuario" IN (:...usuarioIds)', { usuarioIds }).execute();
                await manager.createQueryBuilder().delete().from(Credencial).where('"usuario" IN (:...usuarioIds)', { usuarioIds }).execute();
                await manager.delete(Usuario, usuarioIds);
            }

            await manager.createQueryBuilder().delete().from(Matricula).where('"persona" = :id', { id }).execute();
            await manager.createQueryBuilder().update(Area).set({ liderId: null }).where('"lider_id" = :id', { id }).execute();
            await manager.createQueryBuilder().update(Curso).set({ liderId: null }).where('"lider" = :id', { id }).execute();
            await manager.delete(Persona, id);
        });
        return { mensaje: `Persona con ID ${id} eliminada correctamente` };
    }
}
