// Entorno de produccion. Nginx sirve el frontend y el backend en el mismo origen,
// por eso la URL es relativa: Nginx hace proxy de /api/ hacia el backend.
export const environment = {
  production: true,
  apiUrl: '/api',
  apiOrigin: '',
};
