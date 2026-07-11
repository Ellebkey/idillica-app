// HojaNuevaHerramienta — alta rápida de equipo ("molde de rosca 24 cm").
// El estado nace "Buen estado"; el detalle es opcional.
import { useState } from 'react';
import { Button } from './Button';
import { useCatalogo } from '../state/CatalogoContext';

const inputClass =
  'h-[50px] w-full rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15.5px] outline-none placeholder:text-ink-3 focus:border-burgundy-600';

export function HojaNuevaHerramienta({ onClose }: { onClose: () => void }) {
  const { crearHerramienta } = useCatalogo();
  const [nombre, setNombre] = useState('');
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);

  const valido = nombre.trim() !== '';

  async function guardar() {
    if (!valido || guardando) {
      return;
    }
    setGuardando(true);
    try {
      await crearHerramienta({ nombre: nombre.trim(), detalle: detalle.trim() || 'Agregada hoy' });
      onClose();
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

        <div className="mb-4 text-[19px] font-extrabold">Agregar herramienta o molde</div>

        <div className="mb-4 space-y-3">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-ink-2">¿Qué es?</div>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Molde de rosca 24 cm"
              className={inputClass}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-ink-2">Detalle (opcional)</div>
            <input
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="ej. 2 piezas · antiadherente"
              className={inputClass}
            />
          </div>
        </div>

        <Button
          block
          className="h-14"
          disabled={!valido || guardando}
          style={!valido ? { background: '#D9C6C8' } : undefined}
          onClick={() => void guardar()}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
