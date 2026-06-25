import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ── Fichas (horarios_db) ──────────────────────────────────────
  getFichas() { return this.http.get<any[]>(`${BASE}/fichas`); }
  createFicha(d: any) { return this.http.post(`${BASE}/fichas`, d); }
  updateFicha(id: number, d: any) { return this.http.put(`${BASE}/fichas/${id}`, d); }
  deleteFicha(id: number) { return this.http.delete(`${BASE}/fichas/${id}`); }

  // ── Ambientes (horarios_db) ───────────────────────────────────
  getAmbientes() { return this.http.get<any[]>(`${BASE}/ambientes`); }
  getAmbientesDisponibilidad(dia?: string, jornada?: string, hora?: string) {
    const p: string[] = [];
    if (dia)     p.push(`dia=${dia}`);
    if (jornada) p.push(`jornada=${jornada}`);
    if (hora)    p.push(`hora=${hora}`);
    return this.http.get<any[]>(`${BASE}/ambientes/disponibilidad${p.length ? '?' + p.join('&') : ''}`);
  }
  createAmbiente(d: any) { return this.http.post(`${BASE}/ambientes`, d); }
  updateAmbiente(id: number, d: any) { return this.http.put(`${BASE}/ambientes/${id}`, d); }
  deleteAmbiente(id: number) { return this.http.delete(`${BASE}/ambientes/${id}`); }

  // ── Horarios (horarios_db) ────────────────────────────────────
  getHorarios() { return this.http.get<any[]>(`${BASE}/horarios`); }
  getHorariosByInstructor(id: number) { return this.http.get<any[]>(`${BASE}/horarios/by-instructor/${id}`); }
  getHorariosByFicha(id: number) { return this.http.get<any[]>(`${BASE}/horarios/by-ficha/${id}`); }
  getHorariosByAmbiente(id: number) { return this.http.get<any[]>(`${BASE}/horarios/by-ambiente/${id}`); }
  createHorario(d: any) { return this.http.post(`${BASE}/horarios`, d); }
  updateHorario(id: number, d: any) { return this.http.put(`${BASE}/horarios/${id}`, d); }
  toggleHorario(id: number) { return this.http.patch(`${BASE}/horarios/${id}/toggle`, {}); }
  playHorario(id: number, payload: { ambienteId?: number; ubicacionId?: number; ubicacionNombre?: string } = {}) {
    return this.http.patch(`${BASE}/horarios/${id}/play`, payload);
  }
  finalizarHorario(id: number, motivo: string) { return this.http.patch(`${BASE}/horarios/${id}/finalizar`, { motivo }); }
  deleteHorario(id: number) { return this.http.delete(`${BASE}/horarios/${id}`); }
  getHorariosStats() { return this.http.get<any>(`${BASE}/horarios/stats`); }

  // ── Instructores (horarios_db) ────────────────────────────────
  getInstructores() { return this.http.get<any[]>(`${BASE}/instructores`); }
  getInstructor(id: number | string) { return this.http.get<any>(`${BASE}/instructores/${id}`); }
  updateInstructor(id: number, d: any) { return this.http.put(`${BASE}/instructores/${id}`, d); }
  setInstructorLider(id: number, esLider: boolean, areaLiderada?: string) {
    return this.http.patch(`${BASE}/instructores/${id}/lider`, { esLider, areaLiderada });
  }
  setInstructorTransversal(id: number, esTransversal: boolean) {
    return this.http.patch(`${BASE}/instructores/${id}/transversal`, { esTransversal });
  }
  getInstructoresStats() { return this.http.get<any>(`${BASE}/instructores/stats`); }

  // ── Transversal ───────────────────────────────────────────────
  getAmbientesLibresAhora() { return this.http.get<any[]>(`${BASE}/ambientes/libres-ahora`); }
  getAmbientesDisponiblesTransversal(dia: string, jornada: string) {
    return this.http.get<any[]>(`${BASE}/ambientes/disponibles-transversal?dia=${dia}&jornada=${jornada}`);
  }
  finalizarHorarioTransversal(id: number) { return this.http.patch(`${BASE}/horarios/${id}/finalizar-transversal`, {}); }

  // ── Aprendices (horarios_db) ──────────────────────────────────
  getAprendices() { return this.http.get<any[]>(`${BASE}/aprendices`); }
  getAprendiz(id: number | string) { return this.http.get<any>(`${BASE}/aprendices/${id}`); }
  updateAprendiz(id: number, d: any) { return this.http.put(`${BASE}/aprendices/${id}`, d); }

  // ── Administradores (horarios_db) ─────────────────────────────
  getAdministradores() { return this.http.get<any[]>(`${BASE}/administradores`); }

  // ── Competencias (horarios_db) ────────────────────────────────
  getCompetencias() { return this.http.get<any[]>(`${BASE}/competencias`); }
  /** Historial global de competencias con instructor_nombre, ficha_codigo, diasClase y horario resueltos */
  getCompetenciasAdmin() { return this.http.get<any[]>(`${BASE}/horarios-admin/competencias`); }
  getCompetenciasByHorario(id: number) { return this.http.get<any[]>(`${BASE}/competencias/horario/${id}`); }
  getCompetenciasByInstructor(id: number) { return this.http.get<any[]>(`${BASE}/competencias/instructor/${id}`); }
  createCompetencia(d: any) { return this.http.post(`${BASE}/competencias`, d); }
  updateCompetencia(id: number, d: any) { return this.http.put(`${BASE}/competencias/${id}`, d); }
  deleteCompetencia(id: number) { return this.http.delete(`${BASE}/competencias/${id}`); }

  // ── Solicitudes (horarios_db) ─────────────────────────────────
  getSolicitudes() { return this.http.get<any[]>(`${BASE}/solicitudes-cambio`); }
  getSolicitudesByInstructor(id: number) {
    return this.http.get<any[]>(`${BASE}/solicitudes-cambio/instructor/${id}`);
  }
  createSolicitud(d: any) { return this.http.post(`${BASE}/solicitudes-cambio`, d); }
  responderSolicitud(id: number, estado: string, respuestaAdmin?: string) {
    return this.http.patch(`${BASE}/solicitudes-cambio/${id}/responder`, { estado, respuestaAdmin });
  }
  cancelarSolicitud(id: number) {
    return this.http.patch(`${BASE}/solicitudes-cambio/${id}/cancelar`, {});
  }
  deleteSolicitud(id: number) {
    return this.http.delete(`${BASE}/solicitudes-cambio/${id}`);
  }
  countSolicitudesPendientes() {
    return this.http.get<number>(`${BASE}/solicitudes-cambio/pendientes/count`);
  }

  // ── Notificaciones (horarios_db) ──────────────────────────────
  getNotificaciones(destinatarioId: number, destinatarioRol: string) {
    return this.http.get<any[]>(
      `${BASE}/notificaciones?destinatarioId=${destinatarioId}&destinatarioRol=${destinatarioRol}`
    );
  }
  marcarNotificacionLeida(id: number) {
    return this.http.patch(`${BASE}/notificaciones/${id}/leer`, {});
  }
  marcarNotificacionesTodasLeidas(rol: string) {
    return this.http.patch(`${BASE}/notificaciones/leer-todas/rol?destinatarioRol=${rol}`, {});
  }

  // ── Eventos (horarios_db) ─────────────────────────────────────
  getEventos() { return this.http.get<any[]>(`${BASE}/eventos`); }
  /** Eventos donde la ficha (UUID) está en fichasParticipantes — filtrado en el backend */
  getEventosByFicha(fichaId: string) { return this.http.get<any[]>(`${BASE}/eventos/by-ficha/${fichaId}`); }
  createEvento(d: any) { return this.http.post(`${BASE}/eventos`, d); }
  updateEvento(id: number, d: any) { return this.http.put(`${BASE}/eventos/${id}`, d); }
  deleteEvento(id: number) { return this.http.delete(`${BASE}/eventos/${id}`); }

  // ── Ubicaciones → ahora unificadas en Ambientes ──────────────
  /** @deprecated usar getAmbientes() */
  getUbicaciones() { return this.http.get<any[]>(`${BASE}/ambientes`); }
  getUbicacionesTipos() { return this.http.get<string[]>(`${BASE}/ambientes/tipos`); }
  getUbicacionesPorTipo(tipo: string) { return this.http.get<any[]>(`${BASE}/ambientes?tipo=${tipo}`); }
  getUbicacionesDisponiblesTransversal(tipo: string, dia: string, jornada: string) {
    return this.http.get<any[]>(`${BASE}/ambientes/disponibles-transversal?tipo=${encodeURIComponent(tipo)}&dia=${dia}&jornada=${jornada}`);
  }
  createUbicacion(d: any) { return this.http.post(`${BASE}/ambientes`, d); }
  updateUbicacion(id: any, d: any) { return this.http.patch(`${BASE}/ambientes/${id}`, d); }
  deleteUbicacion(id: any) { return this.http.delete(`${BASE}/ambientes/${id}`); }

  // ── Configuracion (horarios_db) ───────────────────────────────
  getConfiguracion() { return this.http.get<any>(`${BASE}/configuracion`); }
  updatePin(pin: string) { return this.http.patch(`${BASE}/configuracion/pin`, { pin }); }

  // ── Upload ────────────────────────────────────────────────────
  uploadFoto(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${BASE}/upload/foto`, fd);
  }
  uploadAdjunto(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string; nombre: string }>(`${BASE}/upload/adjunto`, fd);
  }

  // ══════════════════════════════════════════════════════════════
  // PROYECTO FORMATIVO DB
  // ══════════════════════════════════════════════════════════════

  // ── Centros de Formación ──────────────────────────────────────
  getCentros() { return this.http.get<any[]>(`${BASE}/formativo/centros`); }
  createCentro(d: any) { return this.http.post(`${BASE}/formativo/centros`, d); }
  updateCentro(id: number, d: any) { return this.http.put(`${BASE}/formativo/centros/${id}`, d); }
  deleteCentro(id: number) { return this.http.delete(`${BASE}/formativo/centros/${id}`); }

  // ── Sedes ─────────────────────────────────────────────────────
  getSedes() { return this.http.get<any[]>(`${BASE}/formativo/sedes`); }
  createSede(d: any) { return this.http.post(`${BASE}/formativo/sedes`, d); }
  updateSede(id: number, d: any) { return this.http.put(`${BASE}/formativo/sedes/${id}`, d); }
  deleteSede(id: number) { return this.http.delete(`${BASE}/formativo/sedes/${id}`); }

  // ── Departamentos ─────────────────────────────────────────────
  getDepartamentos() { return this.http.get<any[]>(`${BASE}/formativo/departamentos`); }
  createDepartamento(d: any) { return this.http.post(`${BASE}/formativo/departamentos`, d); }
  updateDepartamento(id: number, d: any) { return this.http.put(`${BASE}/formativo/departamentos/${id}`, d); }
  deleteDepartamento(id: number) { return this.http.delete(`${BASE}/formativo/departamentos/${id}`); }

  // ── Municipios ────────────────────────────────────────────────
  getMunicipios() { return this.http.get<any[]>(`${BASE}/formativo/municipios`); }
  createMunicipio(d: any) { return this.http.post(`${BASE}/formativo/municipios`, d); }
  updateMunicipio(id: number, d: any) { return this.http.put(`${BASE}/formativo/municipios/${id}`, d); }
  deleteMunicipio(id: number) { return this.http.delete(`${BASE}/formativo/municipios/${id}`); }

  // ── Ambientes ─────────────────────────────────────────────────
  getAmbientesFormativo() { return this.http.get<any[]>(`${BASE}/formativo/ambientes`); }
  createAmbienteFormativo(d: any) { return this.http.post(`${BASE}/formativo/ambientes`, d); }
  updateAmbienteFormativo(id: number, d: any) { return this.http.put(`${BASE}/formativo/ambientes/${id}`, d); }
  deleteAmbienteFormativo(id: number) { return this.http.delete(`${BASE}/formativo/ambientes/${id}`); }

  // ── Áreas ─────────────────────────────────────────────────────
  getAreas() { return this.http.get<any[]>(`${BASE}/formativo/areas`); }
  createArea(d: any) { return this.http.post(`${BASE}/formativo/areas`, d); }
  updateArea(id: number, d: any) { return this.http.put(`${BASE}/formativo/areas/${id}`, d); }
  deleteArea(id: number) { return this.http.delete(`${BASE}/formativo/areas/${id}`); }

  // ── Programas ─────────────────────────────────────────────────
  getProgramas() { return this.http.get<any[]>(`${BASE}/formativo/programas`); }
  createPrograma(d: any) { return this.http.post(`${BASE}/formativo/programas`, d); }
  updatePrograma(id: number, d: any) { return this.http.put(`${BASE}/formativo/programas/${id}`, d); }
  deletePrograma(id: number) { return this.http.delete(`${BASE}/formativo/programas/${id}`); }

  // ── Personas ──────────────────────────────────────────────────
  getPersonas() { return this.http.get<any[]>(`${BASE}/formativo/personas`); }
  createPersona(d: any) { return this.http.post(`${BASE}/formativo/personas`, d); }
  updatePersona(id: number, d: any) { return this.http.put(`${BASE}/formativo/personas/${id}`, d); }
  deletePersona(id: number) { return this.http.delete(`${BASE}/formativo/personas/${id}`); }

  // ── Cursos (Fichas formativas de proyecto_formativo_db) ───────
  getCursos() { return this.http.get<any[]>(`${BASE}/formativo/cursos`); }
  createCurso(d: any) { return this.http.post(`${BASE}/formativo/cursos`, d); }
  updateCurso(id: number, d: any) { return this.http.put(`${BASE}/formativo/cursos/${id}`, d); }
  deleteCurso(id: number) { return this.http.delete(`${BASE}/formativo/cursos/${id}`); }

  // ── Matrículas ────────────────────────────────────────────────
  getMatriculas() { return this.http.get<any[]>(`${BASE}/formativo/matriculas`); }
  createMatricula(d: any) { return this.http.post(`${BASE}/formativo/matriculas`, d); }
  updateMatricula(id: number, d: any) { return this.http.put(`${BASE}/formativo/matriculas/${id}`, d); }
  deleteMatricula(id: number) { return this.http.delete(`${BASE}/formativo/matriculas/${id}`); }

  // ── Aplicativos ───────────────────────────────────────────────
  getAplicativos() { return this.http.get<any[]>(`${BASE}/formativo/aplicativos`); }
  createAplicativo(d: any) { return this.http.post(`${BASE}/formativo/aplicativos`, d); }
  updateAplicativo(id: number, d: any) { return this.http.put(`${BASE}/formativo/aplicativos/${id}`, d); }
  deleteAplicativo(id: number) { return this.http.delete(`${BASE}/formativo/aplicativos/${id}`); }

  // ── Roles ─────────────────────────────────────────────────────
  getRoles() { return this.http.get<any[]>(`${BASE}/formativo/roles`); }
  createRol(d: any) { return this.http.post(`${BASE}/formativo/roles`, d); }
  updateRol(id: number, d: any) { return this.http.put(`${BASE}/formativo/roles/${id}`, d); }
  deleteRol(id: number) { return this.http.delete(`${BASE}/formativo/roles/${id}`); }

  // ── Módulos ───────────────────────────────────────────────────
  getModulos() { return this.http.get<any[]>(`${BASE}/formativo/modulos`); }
  createModulo(d: any) { return this.http.post(`${BASE}/formativo/modulos`, d); }
  updateModulo(id: number, d: any) { return this.http.put(`${BASE}/formativo/modulos/${id}`, d); }
  deleteModulo(id: number) { return this.http.delete(`${BASE}/formativo/modulos/${id}`); }

  // ── Servicios ─────────────────────────────────────────────────
  getServicios() { return this.http.get<any[]>(`${BASE}/formativo/servicios`); }
  createServicio(d: any) { return this.http.post(`${BASE}/formativo/servicios`, d); }
  updateServicio(id: number, d: any) { return this.http.put(`${BASE}/formativo/servicios/${id}`, d); }
  deleteServicio(id: number) { return this.http.delete(`${BASE}/formativo/servicios/${id}`); }

  // ── Usuarios (proyecto_formativo_db) ──────────────────────────
  getUsuariosFormativo() { return this.http.get<any[]>(`${BASE}/formativo/usuarios`); }
  createUsuarioFormativo(d: any) { return this.http.post(`${BASE}/formativo/usuarios`, d); }
  updateUsuarioFormativo(id: number, d: any) { return this.http.put(`${BASE}/formativo/usuarios/${id}`, d); }
  deleteUsuarioFormativo(id: number) { return this.http.delete(`${BASE}/formativo/usuarios/${id}`); }

  // ── Credenciales ──────────────────────────────────────────────
  getCredenciales() { return this.http.get<any[]>(`${BASE}/formativo/credenciales`); }
  createCredencial(d: any) { return this.http.post(`${BASE}/formativo/credenciales`, d); }
  updateCredencial(id: number, d: any) { return this.http.put(`${BASE}/formativo/credenciales/${id}`, d); }
  deleteCredencial(id: number) { return this.http.delete(`${BASE}/formativo/credenciales/${id}`); }

  // ── Permisos ──────────────────────────────────────────────────
  getPermisos() { return this.http.get<any[]>(`${BASE}/formativo/permisos`); }
  createPermiso(d: any) { return this.http.post(`${BASE}/formativo/permisos`, d); }
  updatePermiso(id: number, d: any) { return this.http.put(`${BASE}/formativo/permisos/${id}`, d); }
  deletePermiso(id: number) { return this.http.delete(`${BASE}/formativo/permisos/${id}`); }

  // ── Accesos (solo lectura) ────────────────────────────────────
  getAccesos(limit?: number) {
    return this.http.get<any[]>(`${BASE}/formativo/accesos${limit ? '?limit=' + limit : ''}`);
  }

  // ══════════════════════════════════════════════════════════════
  // HORARIOS ADMIN (horarios_db)
  // ══════════════════════════════════════════════════════════════
  getHAdmins() { return this.http.get<any[]>(`${BASE}/horarios-admin/administradores`); }
  createHAdmin(d: any) { return this.http.post<any>(`${BASE}/horarios-admin/administradores`, d); }
  updateHAdmin(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/administradores/${id}`, d); }
  deleteHAdmin(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/administradores/${id}`); }

  getHInstructores() { return this.http.get<any[]>(`${BASE}/horarios-admin/instructores`); }
  createHInstructor(d: any) { return this.http.post<any>(`${BASE}/horarios-admin/instructores`, d); }
  updateHInstructor(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/instructores/${id}`, d); }
  deleteHInstructor(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/instructores/${id}`); }

  getHAprendices() { return this.http.get<any[]>(`${BASE}/horarios-admin/aprendices`); }
  createHAprendiz(d: any) { return this.http.post<any>(`${BASE}/horarios-admin/aprendices`, d); }
  updateHAprendiz(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/aprendices/${id}`, d); }
  deleteHAprendiz(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/aprendices/${id}`); }

  getHFichas() { return this.http.get<any[]>(`${BASE}/horarios-admin/fichas`); }
  createHFicha(d: any) { return this.http.post<any>(`${BASE}/horarios-admin/fichas`, d); }
  updateHFicha(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/fichas/${id}`, d); }
  deleteHFicha(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/fichas/${id}`); }

  getHAmbientes() { return this.http.get<any[]>(`${BASE}/horarios-admin/ambientes`); }
  createHAmbiente(d: any) { return this.http.post<any>(`${BASE}/horarios-admin/ambientes`, d); }
  updateHAmbiente(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/ambientes/${id}`, d); }
  deleteHAmbiente(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/ambientes/${id}`); }

  getHHorarios() { return this.http.get<any[]>(`${BASE}/horarios-admin/horarios`); }
  deleteHHorario(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/horarios/${id}`); }

  getHCompetencias() { return this.http.get<any[]>(`${BASE}/horarios-admin/competencias`); }
  deleteHCompetencia(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/competencias/${id}`); }

  getHEventos() { return this.http.get<any[]>(`${BASE}/horarios-admin/eventos`); }
  createHEvento(d: any) { return this.http.post<any>(`${BASE}/horarios-admin/eventos`, d); }
  updateHEvento(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/eventos/${id}`, d); }
  deleteHEvento(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/eventos/${id}`); }

  getHSolicitudes() { return this.http.get<any[]>(`${BASE}/horarios-admin/solicitudes`); }
  getHNotificaciones() { return this.http.get<any[]>(`${BASE}/horarios-admin/notificaciones`); }
  deleteHNotificacion(id: number) { return this.http.delete<any>(`${BASE}/horarios-admin/notificaciones/${id}`); }

  getHConfiguracion() { return this.http.get<any[]>(`${BASE}/horarios-admin/configuracion`); }
  updateHConfiguracion(id: number, d: any) { return this.http.put<any>(`${BASE}/horarios-admin/configuracion/${id}`, d); }

  getHFichasOpts() { return this.http.get<any[]>(`${BASE}/horarios-admin/opts/fichas`); }
}
