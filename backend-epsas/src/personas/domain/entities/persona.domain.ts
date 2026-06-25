export interface IPersona {
    idPersona: string;
    nombre: string;
    apellido?: string;
    tipoDoc?: string;
    cedula?: number;
    correo?: string;
    telefono?: number;
    cargo?: string;
    estado?: string;
    municipioId?: string;
    fichaId?: string | null;
    esLider?: boolean;
    areaLiderada?: string | null;
    esTransversal?: boolean;
}
