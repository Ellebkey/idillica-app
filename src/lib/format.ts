/* Formato es-MX. El backend devuelve los DECIMAL como string ("45381.80") —
   pasa siempre por toNumber antes de operar o formatear. */

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
});

/** $135.35 */
export function formatMoney(value: string | number | null | undefined): string {
  return money.format(toNumber(value));
}

const moneyRound = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

/** $135 (copys compactos) */
export function formatMoneyRound(value: string | number | null | undefined): string {
  return moneyRound.format(toNumber(value));
}

const INT = new Intl.NumberFormat('es-MX');

/** 1,234 */
export function formatInt(value: number): string {
  return INT.format(value);
}

const PERCENT = new Intl.NumberFormat('es-MX', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Recibe una fracción (0.138 → "13.8%") */
export function formatPercent(fraction: string | number | null | undefined): string {
  return PERCENT.format(toNumber(fraction));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type FoodCostTone = 'good' | 'amber' | 'rose';

/**
 * Semáforo de rentabilidad a partir del food cost (fracción: costo / precio neto).
 * Verde ≤ objetivo, ámbar hasta objetivo + 10 pts, rojo por encima.
 * @param objetivo food cost objetivo de la cocina (default 0.30)
 */
export function foodCostTone(fraction: number, objetivo = 0.30): FoodCostTone {
  if (fraction <= objetivo) {
    return 'good';
  }
  if (fraction <= objetivo + 0.10) {
    return 'amber';
  }
  return 'rose';
}
