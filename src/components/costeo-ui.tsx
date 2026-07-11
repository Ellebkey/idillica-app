// Componentes de costeo del handoff (nombres del README de diseño).
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/cn';
import { Icon } from './Icon';
import { Button } from './Button';
import { DONA_COLORES, MB, SEM, type Nivel } from '../lib/costeo';
import type { MermaOrigen } from '../api/catalogo.api';

/** Pill de semáforo con el food cost ("54%" sobre pastel del nivel) */
export function SemaforoMargen({ pct, nivel: n, className }: { pct: number | null; nivel: Nivel; className?: string }) {
  const c = SEM[n];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold', className)}
      style={{ background: c.bg, color: c.tx }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
      {pct == null ? '—' : `${Math.round(pct)}%`}
    </span>
  );
}

/** "Merma 25% · medido" con el color del origen */
export function BadgeMerma({ pct, origen }: { pct: number; origen: MermaOrigen }) {
  const c = MB[origen] ?? MB.referencia;
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-bold"
      style={{ background: c.bg, color: c.tx }}
    >
      {pct > 0 ? `Merma ${Math.round(pct)}% · ${origen}` : 'Sin merma'}
    </span>
  );
}

/** Punto ámbar 9px: precio >60 días sin actualizar */
export function PuntoViejo() {
  return <span className="inline-block h-[9px] w-[9px] flex-none rounded-full bg-ambar-600" aria-label="Precio viejo" />;
}

/** Chip de categoría (activa = choco sólido) */
export function ChipCategoria({ activa, children, onClick }: { activa: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-10 flex-none rounded-full border-[1.5px] px-4 text-[14px] font-semibold whitespace-nowrap',
        activa ? 'border-choco-700 bg-choco-700 text-crema-100' : 'border-line bg-card text-ink-2',
      )}
    >
      {children}
    </button>
  );
}

/** Toggle segmentado g/kg (o ml/L) que convierte el valor mostrado */
export function ToggleUnidad({
  opciones,
  valor,
  onChange,
  vertical,
}: {
  opciones: [string, string];
  valor: string;
  onChange: (u: string) => void;
  vertical?: boolean;
}) {
  return (
    <div className={cn('flex flex-none gap-1 rounded-xl bg-fill p-1', vertical && 'flex-col')}>
      {opciones.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={cn(
            'min-w-[44px] rounded-[10px] px-3 py-2 text-[13px] font-bold',
            valor === op ? 'bg-card text-ink shadow-sm' : 'text-ink-3',
          )}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

/** Stepper − N + (mín 1) */
export function Stepper({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  const boton = 'grid h-12 w-12 place-items-center rounded-xl bg-fill text-[22px] font-bold text-ink active:opacity-70';
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={boton} onClick={() => onChange(Math.max(1, valor - 1))}>−</button>
      <span className="min-w-[44px] text-center text-[20px] font-extrabold tabular-nums">{valor}</span>
      <button type="button" className={boton} onClick={() => onChange(valor + 1)}>+</button>
    </div>
  );
}

/** Buscador 52px con lupa */
export function Buscador({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-[52px] w-full items-center gap-2.5 rounded-[18px] border-[1.5px] border-line bg-card px-4">
      <Icon icon={MagnifyingGlassIcon} className="h-5 w-5 flex-none text-ink-3" />
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[15.5px] outline-none placeholder:text-ink-3"
      />
      {valor && (
        <button type="button" onClick={() => onChange('')} className="text-[13px] font-bold text-ink-3">✕</button>
      )}
    </label>
  );
}

/** Dona conic-gradient 120px: top 5 componentes + "Otros", centro con total */
export function DonaCosto({
  partes,
  total,
  size = 120,
}: {
  partes: { nombre: string; valor: number }[];
  total: number;
  size?: number;
}) {
  if (total <= 0 || partes.length === 0) {
    return null;
  }
  const top = [...partes].sort((a, b) => b.valor - a.valor);
  const visibles = top.slice(0, 5);
  const resto = top.slice(5).reduce((s, p) => s + p.valor, 0);
  const segmentos = resto > 0 ? [...visibles, { nombre: 'Otros', valor: resto }] : visibles;

  let acc = 0;
  const stops = segmentos
    .map((s, i) => {
      const desde = (acc / total) * 360;
      acc += s.valor;
      const hasta = (acc / total) * 360;
      return `${DONA_COLORES[i % DONA_COLORES.length]} ${desde}deg ${hasta}deg`;
    })
    .join(', ');

  return (
    <div className="flex items-center gap-[18px]">
      <div
        className="grid flex-none place-items-center rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
      >
        <div
          className="flex flex-col items-center justify-center rounded-full bg-card"
          style={{ width: size - 44, height: size - 44 }}
        >
          <span className="text-[16px] font-extrabold leading-tight">${Math.round(total)}</span>
          <span className="text-[10px] text-ink-2">total</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-[7px]">
        {segmentos.map((s, i) => (
          <div key={s.nombre} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: DONA_COLORES[i % DONA_COLORES.length] }} />
            <span className="min-w-0 flex-1 truncate font-semibold">{s.nombre}</span>
            <span className="font-extrabold tabular-nums">{Math.round((s.valor / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Estado vacío con guía amable */
export function EstadoVacio({ titulo, sub, children }: { titulo: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <img src="/logo-crema.png" alt="" className="h-16 w-16 rounded-2xl bg-burgundy-600 object-contain p-2" />
      <div className="text-[17px] font-extrabold">{titulo}</div>
      {sub && <p className="max-w-[300px] text-[14px] text-ink-2">{sub}</p>}
      {children}
    </div>
  );
}

/** Header de pantallas de detalle: back "‹" + título + acción derecha */
export function HeaderDetalle({
  titulo,
  onBack,
  right,
  children,
}: {
  titulo: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex-none px-3 pt-2 pb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Regresar"
          onClick={onBack ?? (() => navigate(-1))}
          className="grid h-12 w-12 flex-none place-items-center text-[26px] leading-none text-ink"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-[19px] font-extrabold tracking-[-0.3px]">{titulo}</div>
        {right}
      </div>
      {children}
    </header>
  );
}

/** Modal "¿Salir sin guardar?" */
export function ModalSalirSinGuardar({
  nombre,
  onSeguir,
  onSalir,
}: {
  nombre: string;
  onSeguir: () => void;
  onSalir: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-choco-900/40 p-6" onClick={onSeguir}>
      <div
        className="w-full max-w-[340px] rounded-[20px] bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[17px] font-extrabold">¿Salir sin guardar?</div>
        <p className="mt-1.5 text-[14px] text-ink-2">
          Tienes cambios en <b>{nombre}</b> que se perderían.
        </p>
        <div className="mt-5 space-y-2.5">
          <Button block onClick={onSeguir}>Seguir editando</Button>
          <Button block variant="danger" onClick={onSalir}>Salir y descartar</Button>
        </div>
      </div>
    </div>
  );
}

/** Expander "Ver las N restantes ▾ / Ver menos ▴" */
export function Expander({ abierto, restantes, onToggle }: { abierto: boolean; restantes: number; onToggle: () => void }) {
  if (restantes <= 0 && !abierto) {
    return null;
  }
  return (
    <button type="button" onClick={onToggle} className="w-full py-2.5 text-center text-[13.5px] font-bold text-burgundy-600">
      {abierto ? 'Ver menos ▴' : `Ver las ${restantes} restantes ▾`}
    </button>
  );
}
