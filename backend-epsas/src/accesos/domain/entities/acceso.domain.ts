export interface IAcceso {
    idAcceso?: string;
    token: string;
    usuarioId: string;
    fechaIngreso: Date;
    fechaSalida?: Date | null;
    estado: 'activo' | 'inactivo';
}
