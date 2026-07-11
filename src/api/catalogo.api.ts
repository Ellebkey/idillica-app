// Tipos y llamadas del catálogo — espejo de los DTOs del backend Go.
// El backend persiste; el motor de costos (lib/costeo.ts) calcula en vivo.
import { api } from '../lib/http';

export type UnidadBase = 'kg' | 'L' | 'pieza';
export type MermaOrigen = 'referencia' | 'manual' | 'medido';
export type Escalado = 'normal' | 'leudante' | 'sazon';

export interface HistorialPrecio {
  precio: number;
  fecha: string;
}

export interface Producto {
  id: string;
  marca: string;
  presentacion: string;
  cantidad: number; // contenido en unidad base
  precio: number;
  proveedor: string;
  activo: boolean;
  orden: number;
  precioActualizadoAt: string;
  historial: HistorialPrecio[];
}

export interface Ingrediente {
  id: string;
  nombre: string;
  unidadBase: UnidadBase;
  merma: { pct: number; origen: MermaOrigen };
  existencia: number; // en unidad base
  minimo: number; // 0 = sin alerta "queda poco"
  caducaAt: string | null; // YYYY-MM-DD
  escalado: Escalado; // cómo sube al multiplicar una receta
  productos: Producto[];
}

export interface Herramienta {
  id: string;
  nombre: string;
  detalle: string;
  estado: string;
}

export interface Linea {
  id: string;
  ingredienteId?: string;
  recetaId?: string;
  cantidad: number; // unidad base del ingrediente, o kg si es subreceta
  orden: number;
}

export interface Receta {
  id: string;
  nombre: string;
  categoria: string;
  porciones: number;
  etiqueta: string;
  etiquetaSingular: string;
  rendimientoKg: number;
  precioVenta: number | null;
  ivaPct: number;
  esSubreceta: boolean;
  alergenos: string[];
  pasos: string[];
  fotos: string[];
  lineas: Linea[];
}

export interface CocinaCatalogo {
  id: string;
  name: string;
  moneda: string;
  impuestoDefault: number;
  foodCostObjetivo: number; // fracción (0.30)
  gastoSueldos: number;
  gastoGas: number;
  gastoLuz: number;
  gastoEquipo: number;
  comprasIngredientesMes: number;
  rol: 'owner' | 'editor' | 'viewer';
}

export interface Catalogo {
  cocina: CocinaCatalogo;
  ingredientes: Ingrediente[];
  recetas: Receta[];
  herramientas: Herramienta[];
  categorias: string[];
  alergenos: string[];
}

// ===== Entradas =====

export interface ProductoInput {
  marca: string;
  presentacion: string;
  cantidad: number;
  precio: number;
  proveedor?: string;
}

export interface CreateIngredienteInput {
  nombre: string;
  unidadBase: UnidadBase;
  mermaPct?: number;
  mermaOrigen?: MermaOrigen;
  existencia?: number;
  minimo?: number;
  escalado?: Escalado;
  productos: ProductoInput[];
}

export interface ConteoItem {
  ingredienteId: string;
  cantidad: number;
}

export interface HerramientaInput {
  nombre: string;
  detalle?: string;
  estado?: string;
}

export interface LineaInput {
  ingredienteId?: string;
  recetaId?: string;
  cantidad: number;
}

export interface SaveRecetaInput {
  nombre: string;
  categoria: string;
  porciones: number;
  etiqueta: string;
  etiquetaSingular: string;
  rendimientoKg: number;
  precioVenta: number | null;
  ivaPct: number;
  esSubreceta: boolean;
  alergenos: string[];
  pasos: string[];
  fotos: string[];
  lineas: LineaInput[];
}

export interface UpdateCocinaInput {
  foodCostObjetivo?: number;
  impuestoDefault?: number;
  moneda?: string;
  gastoSueldos?: number;
  gastoGas?: number;
  gastoLuz?: number;
  gastoEquipo?: number;
  comprasIngredientesMes?: number;
}

// ===== Llamadas =====

export function getCatalogo(cocinaId: string): Promise<Catalogo> {
  return api<Catalogo>(`/cocinas/${cocinaId}/catalogo`);
}

export function crearIngrediente(cocinaId: string, input: CreateIngredienteInput): Promise<Ingrediente> {
  return api<Ingrediente>(`/cocinas/${cocinaId}/ingredientes`, { method: 'POST', body: input });
}

export function nuevoPrecio(productoId: string, precio: number): Promise<Ingrediente> {
  return api<Ingrediente>(`/productos/${productoId}/precio`, { method: 'PUT', body: { precio } });
}

export function agregarProducto(ingredienteId: string, input: ProductoInput): Promise<Ingrediente> {
  return api<Ingrediente>(`/ingredientes/${ingredienteId}/productos`, { method: 'POST', body: input });
}

export function activarProducto(ingredienteId: string, productoId: string): Promise<Ingrediente> {
  return api<Ingrediente>(`/ingredientes/${ingredienteId}/producto-activo/${productoId}`, { method: 'PUT' });
}

export function setMerma(ingredienteId: string, pct: number, origen: MermaOrigen): Promise<Ingrediente> {
  return api<Ingrediente>(`/ingredientes/${ingredienteId}/merma`, { method: 'PUT', body: { pct, origen } });
}

export function agregarMedicion(
  ingredienteId: string,
  pesos: { pesoEntero: number; pesoLimpio: number; aprovechado: number },
): Promise<Ingrediente> {
  return api<Ingrediente>(`/ingredientes/${ingredienteId}/mediciones`, { method: 'POST', body: pesos });
}

export function crearReceta(cocinaId: string, input: SaveRecetaInput): Promise<Receta> {
  return api<Receta>(`/cocinas/${cocinaId}/recetas`, { method: 'POST', body: input });
}

export function guardarReceta(recetaId: string, input: SaveRecetaInput): Promise<Receta> {
  return api<Receta>(`/recetas/${recetaId}`, { method: 'PUT', body: input });
}

export function eliminarReceta(recetaId: string): Promise<void> {
  return api<void>(`/recetas/${recetaId}`, { method: 'DELETE' });
}

export function actualizarCocina(cocinaId: string, input: UpdateCocinaInput): Promise<CocinaCatalogo> {
  return api<CocinaCatalogo>(`/cocinas/${cocinaId}`, { method: 'PUT', body: input });
}

// ===== Inventario =====

/** Suma unidades × contenido a la existencia; si el precio cambió, lo registra */
export function registrarCompra(ingredienteId: string, unidades: number, precio: number): Promise<Ingrediente> {
  return api<Ingrediente>(`/ingredientes/${ingredienteId}/compra`, { method: 'POST', body: { unidades, precio } });
}

/** Conteo físico: fija la existencia de varios ingredientes de golpe */
export function aplicarConteo(cocinaId: string, items: ConteoItem[]): Promise<Ingrediente[]> {
  return api<Ingrediente[]>(`/cocinas/${cocinaId}/conteo`, { method: 'POST', body: { items } });
}

/** Descuenta del inventario lo que la receta necesita (incluye subrecetas),
 *  multiplicado por el factor de escalado ("produje ×3"). */
export function producirReceta(recetaId: string, factor = 1): Promise<Ingrediente[]> {
  return api<Ingrediente[]>(`/recetas/${recetaId}/producir`, { method: 'POST', body: { factor } });
}

/** Cambia cómo escala un ingrediente al multiplicar recetas */
export function setEscalado(ingredienteId: string, escalado: Escalado): Promise<Ingrediente> {
  return api<Ingrediente>(`/ingredientes/${ingredienteId}`, { method: 'PUT', body: { escalado } });
}

export function crearHerramienta(cocinaId: string, input: HerramientaInput): Promise<Herramienta> {
  return api<Herramienta>(`/cocinas/${cocinaId}/herramientas`, { method: 'POST', body: input });
}
