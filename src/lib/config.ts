// Same-origin por defecto: en dev/preview Vite hace proxy de /api al backend
// (ver vite.config.ts). Define VITE_API_URL solo para apuntar a un backend
// remoto — ese origen debe estar permitido en el CORS del backend.
export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api';
