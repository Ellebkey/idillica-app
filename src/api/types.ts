export interface JWTResponse {
  token: string;
  refreshToken: string;
  // Filas antiguas podrían devolver roles como string en vez de arreglo
  roles: string[] | string;
  username: string;
  expiresIn: string;
  fullname?: string | null;
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    status?: number;
    details?: unknown;
  };
}

export type CocinaRole = 'owner' | 'editor' | 'viewer';

export interface Cocina {
  id: string;
  name: string;
  moneda: string;
  impuestoDefault: number;
  foodCostObjetivo: number;
  rol: CocinaRole;
  createdAt: string;
  updatedAt: string;
}
