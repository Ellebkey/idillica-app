import { api } from '../lib/http';
import type { Cocina } from './types';

export function listCocinas(): Promise<Cocina[]> {
  return api<Cocina[]>('/cocinas');
}

export function getCocina(id: string): Promise<Cocina> {
  return api<Cocina>(`/cocinas/${id}`);
}

export interface CocinaInput {
  name: string;
  moneda?: string;
  impuestoDefault?: number;
  foodCostObjetivo?: number;
}

export function createCocina(input: CocinaInput): Promise<Cocina> {
  return api<Cocina>('/cocinas', { method: 'POST', body: input });
}

export function updateCocina(id: string, input: Partial<CocinaInput>): Promise<Cocina> {
  return api<Cocina>(`/cocinas/${id}`, { method: 'PUT', body: input });
}
