export interface IPermiso {
    idPermiso: string;
    rolId: string;
    servicioId: string;
    leer?: boolean;
    escribir?: boolean;
    eliminar?: boolean;
}
