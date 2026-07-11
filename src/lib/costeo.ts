// Motor de costos — port fiel de la clase `Component` del handoff (la
// especificación ejecutable). Los costos SIEMPRE se derivan en vivo del
// catálogo; nunca se guardan.
import type { Catalogo, Ingrediente, Receta, UnidadBase } from '../api/catalogo.api';

export type Nivel = 'verde' | 'ambar' | 'rojo' | 'gris';

/** Índices por id para que el motor camine el grafo sin buscar en arreglos */
export interface Indice {
  ingredientes: Map<string, Ingrediente>;
  recetas: Map<string, Receta>;
}

export function indexar(catalogo: Catalogo): Indice {
  return {
    ingredientes: new Map(catalogo.ingredientes.map((i) => [i.id, i])),
    recetas: new Map(catalogo.recetas.map((r) => [r.id, r])),
  };
}

export function productoActivo(ing: Ingrediente) {
  return ing.productos.find((p) => p.activo) ?? ing.productos[0];
}

/** ≈ ingCost(): precio del activo / cantidad presentación / (1 − merma/100) */
export function costoIngrediente(ing: Ingrediente): number {
  const prod = productoActivo(ing);
  if (!prod || prod.cantidad <= 0) {
    return 0;
  }
  const factor = 1 - ing.merma.pct / 100;
  return prod.precio / prod.cantidad / (factor > 0 ? factor : 1);
}

/**
 * ≈ recCost(): Σ líneas, recursivo en subrecetas. `lineasOverride` permite al
 * editor calcular con el borrador sin tocar el catálogo; `precioOverride`
 * permite a la pantalla de impacto recalcular con el precio viejo.
 */
export interface OpcionesCosto {
  lineasOverride?: { recetaId: string; lineas: { ingredienteId?: string; recetaId?: string; cantidad: number }[] };
  precioOverride?: { productoId: string; precio: number };
}

export function costoReceta(idx: Indice, recetaId: string, opts: OpcionesCosto = {}, visitadas = new Set<string>()): number {
  const receta = idx.recetas.get(recetaId);
  if (!receta || visitadas.has(recetaId)) {
    return 0;
  }
  visitadas.add(recetaId);

  const lineas =
    opts.lineasOverride && opts.lineasOverride.recetaId === recetaId
      ? opts.lineasOverride.lineas
      : receta.lineas;

  let total = 0;
  for (const linea of lineas) {
    if (linea.ingredienteId) {
      const ing = idx.ingredientes.get(linea.ingredienteId);
      if (ing) {
        total += linea.cantidad * costoIngredienteConOverride(ing, opts);
      }
    } else if (linea.recetaId) {
      const sub = idx.recetas.get(linea.recetaId);
      if (sub && sub.rendimientoKg > 0) {
        total += (linea.cantidad / sub.rendimientoKg) * costoReceta(idx, linea.recetaId, opts, visitadas);
      }
    }
  }
  visitadas.delete(recetaId);
  return total;
}

function costoIngredienteConOverride(ing: Ingrediente, opts: OpcionesCosto): number {
  const { precioOverride } = opts;
  if (!precioOverride) {
    return costoIngrediente(ing);
  }
  const prod = productoActivo(ing);
  if (!prod || prod.id !== precioOverride.productoId || prod.cantidad <= 0) {
    return costoIngrediente(ing);
  }
  const factor = 1 - ing.merma.pct / 100;
  return precioOverride.precio / prod.cantidad / (factor > 0 ? factor : 1);
}

/** ≈ fcPct(): null si la receta no tiene precio (subrecetas) */
export function foodCostPct(idx: Indice, recetaId: string, opts: OpcionesCosto = {}): number | null {
  const receta = idx.recetas.get(recetaId);
  if (!receta || !receta.precioVenta || receta.precioVenta <= 0) {
    return null;
  }
  return (costoReceta(idx, recetaId, opts) / receta.precioVenta) * 100;
}

/** ≈ level(): objetivo en % entero (30). ≤obj verde, ≤obj+10 ámbar, más rojo */
export function nivel(pct: number | null, objetivo: number): Nivel {
  if (pct == null) {
    return 'gris';
  }
  if (pct <= objetivo) {
    return 'verde';
  }
  if (pct <= objetivo + 10) {
    return 'ambar';
  }
  return 'rojo';
}

/** ≈ usesIng(): la receta usa el ingrediente, directo o vía subrecetas */
export function usaIngrediente(idx: Indice, recetaId: string, ingredienteId: string, visitadas = new Set<string>()): boolean {
  const receta = idx.recetas.get(recetaId);
  if (!receta || visitadas.has(recetaId)) {
    return false;
  }
  visitadas.add(recetaId);
  for (const linea of receta.lineas) {
    if (linea.ingredienteId === ingredienteId) {
      return true;
    }
    if (linea.recetaId && usaIngrediente(idx, linea.recetaId, ingredienteId, visitadas)) {
      return true;
    }
  }
  return false;
}

/** La receta `recetaId` alcanza a `targetId` por sus subrecetas (para ciclos) */
export function usaReceta(idx: Indice, recetaId: string, targetId: string, visitadas = new Set<string>()): boolean {
  if (recetaId === targetId) {
    return true;
  }
  const receta = idx.recetas.get(recetaId);
  if (!receta || visitadas.has(recetaId)) {
    return false;
  }
  visitadas.add(recetaId);
  return receta.lineas.some((l) => l.recetaId && usaReceta(idx, l.recetaId, targetId, visitadas));
}

/** ≈ opexRate(): Σ gastos mensuales / compras de ingredientes al mes */
export function tasaOperacion(cocina: Catalogo['cocina']): number {
  const gastos = cocina.gastoSueldos + cocina.gastoGas + cocina.gastoLuz + cocina.gastoEquipo;
  return cocina.comprasIngredientesMes > 0 ? gastos / cocina.comprasIngredientesMes : 0;
}

/** Días desde la última actualización del precio del producto ACTIVO */
export function diasDesdePrecio(ing: Ingrediente): number {
  const prod = productoActivo(ing);
  if (!prod) {
    return 0;
  }
  return Math.floor((Date.now() - new Date(prod.precioActualizadoAt).getTime()) / 86400000);
}

// ===== Inventario =====

/**
 * ≈ rawCost(): precio del producto activo / cantidad, SIN merma — lo que vale
 * lo que guardas en la alacena (la merma solo encarece lo que usas al cocinar).
 */
export function costoCrudo(ing: Ingrediente): number {
  const prod = productoActivo(ing);
  if (!prod || prod.cantidad <= 0) {
    return 0;
  }
  return prod.precio / prod.cantidad;
}

/** ≈ lowStock(), adaptado a prod: solo alerta cuando hay mínimo configurado */
export function quedaPoco(ing: Ingrediente): boolean {
  return ing.minimo > 0 && ing.existencia <= ing.minimo;
}

/** Días para caducar (negativo = ya caducó); null si no tiene fecha */
export function diasCaducidad(ing: Ingrediente): number | null {
  if (!ing.caducaAt) {
    return null;
  }
  return Math.ceil((new Date(ing.caducaAt).getTime() - Date.now()) / 86400000);
}

/**
 * ≈ gatherNeeds(): cuánto descuenta del inventario producir la receta UNA vez,
 * recursivo en subrecetas (ingredienteId → cantidad en unidad base). Espejo de
 * GatherNeeds del backend Go.
 */
export function necesidadesReceta(idx: Indice, recetaId: string): Map<string, number> {
  const acc = new Map<string, number>();
  juntarNecesidades(idx, recetaId, 1, acc, new Set());
  return acc;
}

function juntarNecesidades(idx: Indice, recetaId: string, mult: number, acc: Map<string, number>, visitadas: Set<string>) {
  const receta = idx.recetas.get(recetaId);
  if (!receta || visitadas.has(recetaId)) {
    return;
  }
  visitadas.add(recetaId);
  for (const linea of receta.lineas) {
    if (linea.ingredienteId) {
      acc.set(linea.ingredienteId, (acc.get(linea.ingredienteId) ?? 0) + linea.cantidad * mult);
    } else if (linea.recetaId) {
      const sub = idx.recetas.get(linea.recetaId);
      if (sub && sub.rendimientoKg > 0) {
        juntarNecesidades(idx, linea.recetaId, mult * (linea.cantidad / sub.rendimientoKg), acc, visitadas);
      }
    }
  }
  visitadas.delete(recetaId);
}

// ===== Formato (≈ fmt / fmtQty / unitWord del prototipo) =====

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function trim2(n: number): number {
  return parseFloat(n.toFixed(2));
}

export function fmtQty(q: number, u: UnidadBase): string {
  if (u === 'pieza') {
    return q === 1 ? '1 pza' : `${trim2(q)} pzas`;
  }
  if (u === 'L') {
    return q < 1 ? `${Math.round(q * 1000)} ml` : `${trim2(q)} L`;
  }
  return q < 1 ? `${Math.round(q * 1000)} g` : `${trim2(q)} kg`;
}

export function unitWord(u: UnidadBase): string {
  return u === 'pieza' ? 'pieza' : u === 'L' ? 'litro' : 'kilo';
}

/** ≈ unitShort(): la abreviatura que acompaña a los inputs numéricos */
export function unitShort(u: UnidadBase): string {
  return u === 'pieza' ? 'pza' : u;
}

/** Normalización de acentos para búsquedas (≈ norm del prototipo) */
export function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Colores del semáforo (SEM del prototipo) */
export const SEM: Record<Nivel, { bg: string; tx: string; dot: string; solid: string }> = {
  verde: { bg: '#EFF0E3', tx: '#59622B', dot: '#656D30', solid: '#656D30' },
  ambar: { bg: '#F6ECD9', tx: '#96691B', dot: '#C08A28', solid: '#C08A28' },
  rojo: { bg: '#F7E4E1', tx: '#A93226', dot: '#C0392B', solid: '#C0392B' },
  gris: { bg: '#ECEAE4', tx: '#6E6A5E', dot: '#A8A296', solid: '#A8A296' },
};

/** Colores de badge de merma por origen (MB del prototipo) */
export const MB: Record<string, { bg: string; tx: string }> = {
  referencia: { bg: '#ECEAE4', tx: '#6E6A5E' },
  manual: { bg: '#E3EAF2', tx: '#3F5E7E' },
  medido: { bg: '#EFF0E3', tx: '#59622B' },
};

/** Colores de la dona (top 5 + Otros) */
export const DONA_COLORES = ['#9D2C34', '#C56A4A', '#656D30', '#B8935A', '#7A5C49', '#D8CDBA'];
