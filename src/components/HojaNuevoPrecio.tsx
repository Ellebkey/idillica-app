// HojaNuevoPrecio — bottom sheet del flujo MÁS frecuente: "fui al súper y
// cambió el precio". Aviso en vivo al teclear y navegación a la pantalla de
// impacto al guardar.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { fmt, productoActivo } from '../lib/costeo';
import { useCatalogo } from '../state/CatalogoContext';
import type { Ingrediente } from '../api/catalogo.api';

export function HojaNuevoPrecio({ ingrediente, onClose }: { ingrediente: Ingrediente; onClose: () => void }) {
  const { nuevoPrecio, setUltimoImpacto } = useCatalogo();
  const navigate = useNavigate();
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const producto = productoActivo(ingrediente);
  const anterior = producto?.precio ?? 0;
  const nuevo = parseFloat(valor);
  const valido = Number.isFinite(nuevo) && nuevo > 0 && Math.abs(nuevo - anterior) > 0.004;

  const aviso = useMemo(() => {
    if (!Number.isFinite(nuevo) || nuevo <= 0 || anterior <= 0) {
      return null;
    }
    const delta = ((nuevo - anterior) / anterior) * 100;
    if (Math.abs(delta) < 0.5) {
      return { texto: '≈ Prácticamente igual', color: 'var(--choco-400)' };
    }
    if (delta > 0) {
      return { texto: `▲ Subió ${Math.round(delta)}% desde tu última compra`, color: '#C08A28' };
    }
    return { texto: `▼ Bajó ${Math.round(Math.abs(delta))}% desde tu última compra`, color: '#656D30' };
  }, [nuevo, anterior]);

  if (!producto) {
    return null;
  }

  async function guardar() {
    if (!valido || guardando || !producto) {
      return;
    }
    setGuardando(true);
    try {
      await nuevoPrecio(producto.id, nuevo);
      setUltimoImpacto({
        ingredienteId: ingrediente.id,
        productoId: producto.id,
        precioViejo: anterior,
        precioNuevo: nuevo,
      });
      onClose();
      navigate('/impacto');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-choco-900/40" onClick={onClose}>
      <div
        className="w-full rounded-t-[28px] bg-card px-5 pt-3 pb-8 [animation:sheet-up_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-line" />

        <div className="text-[18px] font-extrabold">Nuevo precio · {ingrediente.nombre}</div>
        <div className="mt-0.5 text-[13.5px] text-ink-2">
          {producto.presentacion} · {producto.marca}
          {producto.proveedor ? ` · ${producto.proveedor}` : ''}
        </div>

        <div className="mt-5 flex items-end gap-4">
          <div className="flex-none">
            <div className="text-[12px] font-bold text-ink-3 uppercase">Antes</div>
            <div className="mt-1 text-[19px] font-bold text-ink-3 line-through tabular-nums">{fmt(anterior)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-ink-2 uppercase">Hoy pagué</div>
            <label className="mt-1 flex h-[60px] items-center gap-1 rounded-2xl border-2 border-burgundy-600 bg-card px-4">
              <span className="text-[22px] font-extrabold text-ink-3">$</span>
              <input
                autoFocus
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="w-full bg-transparent text-[26px] font-extrabold tabular-nums outline-none placeholder:text-ink-3"
              />
            </label>
          </div>
        </div>

        <div className="mt-3 h-6 text-[13.5px] font-bold" style={{ color: aviso?.color }}>
          {aviso?.texto}
        </div>

        <Button
          block
          className="mt-2"
          disabled={!valido || guardando}
          style={!valido ? { background: '#D9C6C8' } : undefined}
          onClick={guardar}
        >
          {guardando ? 'Guardando…' : 'Guardar nuevo precio'}
        </Button>
      </div>
    </div>
  );
}
