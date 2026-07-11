// HojaProduccion — "Produje esta receta": muestra lo que se descontará del
// inventario (recursivo en subrecetas) y lo aplica. Si falta algo, avisa pero
// no bloquea: el backend deja la existencia en 0, nunca negativa.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { fmtQty, necesidadesReceta } from '../lib/costeo';
import { useCatalogo } from '../state/CatalogoContext';
import type { Receta } from '../api/catalogo.api';

export function HojaProduccion({
  receta,
  factor = 1,
  porciones,
  onClose,
}: {
  receta: Receta;
  /** Multiplicador del lote ("preparé ×3"); 1 = lote base */
  factor?: number;
  /** Porciones escaladas, solo para el título ("30 piezas") */
  porciones?: number | null;
  onClose: () => void;
}) {
  const { idx, producirReceta } = useCatalogo();
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filas = idx
    ? [...necesidadesReceta(idx, receta.id)]
        .map(([ingredienteId, base]) => {
          const ing = idx.ingredientes.get(ingredienteId);
          if (!ing) {
            return null;
          }
          const cantidad = base * factor;
          const faltan = cantidad - ing.existencia;
          return { ing, cantidad, faltan };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null)
    : [];

  async function confirmar() {
    if (guardando || filas.length === 0) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await producirReceta(receta.id, factor);
      onClose();
      navigate('/inventario');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descontar.');
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-choco-900/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-[28px] bg-card px-5 pt-3 pb-8 [animation:sheet-up_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-line" />

        <div className="text-[19px] font-extrabold">
          Produje: {receta.nombre}
          {factor !== 1 && porciones != null && (
            <span className="font-bold text-ink-2"> · {porciones} {receta.etiqueta}</span>
          )}
        </div>
        <div className="mt-1 mb-3.5 text-[13.5px] text-ink-2">
          Descontaremos esto de tu inventario (incluye lo de las subrecetas):
        </div>

        {filas.length === 0 ? (
          <p className="mb-4 rounded-[14px] bg-fill px-3.5 py-3 text-[13.5px] font-semibold text-ink-2">
            Esta receta no tiene ingredientes que descontar.
          </p>
        ) : (
          <div className="mb-4 overflow-hidden rounded-2xl border-[1.5px] border-line">
            {filas.map((f, i) => (
              <div
                key={f.ing.id}
                className={`flex min-h-12 items-center justify-between gap-2.5 px-3.5 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{f.ing.nombre}</span>
                <div className="flex flex-none items-center gap-2.5">
                  <span className="text-[14px] font-bold text-ink-2">{fmtQty(f.cantidad, f.ing.unidadBase)}</span>
                  <span className="text-[13px] font-bold" style={{ color: f.faltan > 0 ? '#A93226' : '#656D30' }}>
                    {f.faltan > 0 ? `Te faltan ${fmtQty(f.faltan, f.ing.unidadBase)}` : '✓'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="mb-3 text-[13px] font-bold text-rojo-600">{error}</div>}

        <Button block variant="salvia" className="h-14" disabled={guardando || filas.length === 0} onClick={() => void confirmar()}>
          {guardando ? 'Descontando…' : 'Descontar del inventario'}
        </Button>
        <button
          type="button"
          className="mt-1.5 h-[52px] w-full text-[15px] font-semibold text-ink-2"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
