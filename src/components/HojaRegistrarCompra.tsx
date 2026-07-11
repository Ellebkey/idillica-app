// HojaRegistrarCompra — "llegué del súper con más": suma unidades del producto
// activo a la existencia y, si el precio cambió, lo registra de una vez.
import { useState } from 'react';
import { Button } from './Button';
import { fmtQty, productoActivo } from '../lib/costeo';
import { useCatalogo } from '../state/CatalogoContext';
import type { Ingrediente } from '../api/catalogo.api';

export function HojaRegistrarCompra({
  ingrediente,
  onClose,
  onSaved,
}: {
  ingrediente: Ingrediente;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { registrarCompra } = useCatalogo();
  const producto = productoActivo(ingrediente);
  const [unidades, setUnidades] = useState(1);
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : '');
  const [guardando, setGuardando] = useState(false);

  if (!producto) {
    return null;
  }

  const precioNum = parseFloat(precio);
  const valido = Number.isFinite(precioNum) && precioNum > 0;
  const entra = unidades * producto.cantidad;

  async function guardar() {
    if (!valido || guardando) {
      return;
    }
    setGuardando(true);
    try {
      await registrarCompra(ingrediente.id, unidades, precioNum);
      onClose();
      onSaved?.();
    } finally {
      setGuardando(false);
    }
  }

  const botonStep = 'grid h-[54px] w-12 flex-none place-items-center rounded-[14px] border-[1.5px] border-line bg-surface text-[22px] text-ink';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-choco-900/40" onClick={onClose}>
      <div
        className="w-full rounded-t-[28px] bg-card px-5 pt-3 pb-8 [animation:sheet-up_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-line" />

        <div className="text-[19px] font-extrabold">Registrar compra · {ingrediente.nombre}</div>
        <div className="mt-1 mb-4 text-[13.5px] text-ink-2">
          {producto.presentacion} · {producto.marca}
        </div>

        <div className="mb-4 flex gap-3.5">
          <div className="flex-1">
            <div className="mb-1.5 text-[12px] font-bold tracking-[0.5px] text-ink-2 uppercase">¿Cuántas compraste?</div>
            <div className="flex items-center gap-1.5">
              <button type="button" className={botonStep} onClick={() => setUnidades((u) => Math.max(1, u - 1))}>−</button>
              <div className="flex-1 text-center text-[24px] font-extrabold tabular-nums">{unidades}</div>
              <button type="button" className={botonStep} onClick={() => setUnidades((u) => u + 1)}>+</button>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1.5 text-[12px] font-bold tracking-[0.5px] text-ink-2 uppercase">Precio por unidad</div>
            <input
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value.replace(/[^0-9.]/g, ''))}
              className="h-[54px] w-full rounded-[14px] border-2 border-burgundy-600 bg-surface text-center text-[20px] font-extrabold tabular-nums outline-none"
            />
          </div>
        </div>

        <div className="mb-4 rounded-[14px] bg-fill px-3.5 py-3 text-[13.5px] font-semibold text-ink-2">
          Entran {fmtQty(entra, ingrediente.unidadBase)} · tendrás {fmtQty(ingrediente.existencia + entra, ingrediente.unidadBase)}
        </div>

        <Button block variant="salvia" className="h-14" disabled={!valido || guardando} onClick={() => void guardar()}>
          {guardando ? 'Guardando…' : 'Guardar compra'}
        </Button>
      </div>
    </div>
  );
}
