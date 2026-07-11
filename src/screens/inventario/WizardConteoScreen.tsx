// Contar mi cocina — wizard báscula en mano, un ingrediente a la vez, con
// resumen de diferencias (en dinero) antes de guardar. Solo se envían los
// valores que la usuaria tocó.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { Button, EstadoVacio, HeaderDetalle, Skeleton } from '../../components';
import { costoCrudo, fmt, fmtQty, unitShort } from '../../lib/costeo';
import type { ConteoItem } from '../../api/catalogo.api';

export function WizardConteoScreen() {
  const { catalogo, aplicarConteo, loading, error } = useCatalogo();
  const navigate = useNavigate();
  const [ix, setIx] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  if (loading) {
    return <div className="p-5"><Skeleton className="h-40 w-full" /></div>;
  }
  if (error || !catalogo) {
    return <EstadoVacio titulo="No se pudo cargar tu cocina" sub={error ?? undefined} />;
  }

  const items = [...catalogo.ingredientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const total = items.length;
  const enResumen = ix >= total;
  const actual = enResumen ? null : items[ix];

  const difs = items
    .map((ing) => {
      const v = vals[ing.id];
      if (v === undefined) {
        return null;
      }
      const contado = parseFloat(v);
      if (!Number.isFinite(contado) || Math.abs(contado - ing.existencia) < 0.001) {
        return null;
      }
      const delta = contado - ing.existencia;
      return { ing, contado, delta };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  function salir() {
    navigate('/inventario');
  }

  async function guardar() {
    if (guardando) {
      return;
    }
    const tocados: ConteoItem[] = items
      .filter((ing) => vals[ing.id] !== undefined && Number.isFinite(parseFloat(vals[ing.id])))
      .map((ing) => ({ ingredienteId: ing.id, cantidad: parseFloat(vals[ing.id]) }));
    if (tocados.length === 0) {
      salir();
      return;
    }
    setGuardando(true);
    try {
      await aplicarConteo(tocados);
      salir();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle
        titulo="Contar mi cocina"
        onBack={salir}
        right={<span className="flex-none pr-1 text-[14px] font-bold text-ink-2">{enResumen ? 'Resumen' : `${ix + 1} de ${total}`}</span>}
      />

      {actual ? (
        <div className="min-h-0 flex-1 overflow-auto px-7 pt-7 pb-10 text-center">
          <div className="text-[26px] font-extrabold tracking-[-0.5px]">{actual.nombre}</div>
          <div className="mt-2 text-[14.5px] text-ink-2">
            La app dice: {fmtQty(actual.existencia, actual.unidadBase)}
          </div>

          <div className="my-8 flex items-baseline justify-center gap-2.5">
            <input
              key={actual.id}
              autoFocus
              inputMode="decimal"
              value={vals[actual.id] ?? String(parseFloat(actual.existencia.toFixed(2)))}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                setVals((prev) => ({ ...prev, [actual.id]: v }));
              }}
              className="h-[84px] w-[190px] rounded-[22px] border-2 border-burgundy-600 bg-card text-center text-[42px] font-extrabold tabular-nums outline-none"
            />
            <span className="text-[20px] font-bold text-ink-2">{unitShort(actual.unidadBase)}</span>
          </div>

          <div className="flex gap-2.5">
            {ix > 0 && (
              <button
                type="button"
                className="h-14 flex-1 rounded-2xl border-[1.5px] border-line bg-card text-[16px] font-bold text-ink"
                onClick={() => setIx(ix - 1)}
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              className="h-14 flex-[2] rounded-2xl bg-burgundy-600 text-[17px] font-bold text-crema-100"
              onClick={() => setIx(ix + 1)}
            >
              Siguiente
            </button>
          </div>

          <p className="mt-4 text-[13px] text-ink-3">
            Ve con tu báscula por la cocina, uno por uno. Puedes salir cuando quieras.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-5 pt-3 pb-10">
          {difs.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-5 py-16 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full text-[30px]" style={{ background: '#EFF0E3', color: '#59622B' }}>
                ✓
              </div>
              <div className="text-[20px] font-extrabold">Todo cuadra</div>
              <p className="max-w-[260px] text-[14.5px] leading-normal text-ink-2">
                Lo que contaste coincide con lo que la app tenía registrado.
              </p>
            </div>
          ) : (
            <>
              <div className="mx-0.5 mt-2 mb-2.5 text-[15px] font-bold">Diferencias encontradas</div>
              <div className="mb-4 overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card">
                {difs.map((d, i) => (
                  <div
                    key={d.ing.id}
                    className={`flex min-h-14 items-center justify-between gap-2.5 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
                  >
                    <div>
                      <div className="text-[14.5px] font-bold">{d.ing.nombre}</div>
                      <div className="mt-0.5 text-[12.5px] text-ink-2">
                        {fmtQty(d.ing.existencia, d.ing.unidadBase)} → {fmtQty(d.contado, d.ing.unidadBase)}
                      </div>
                    </div>
                    <span className="text-[14px] font-extrabold tabular-nums" style={{ color: d.delta > 0 ? '#656D30' : '#A93226' }}>
                      {d.delta > 0 ? '+' : '−'}{fmt(Math.abs(d.delta) * costoCrudo(d.ing))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Button block variant="salvia" className="h-14" disabled={guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Guardar conteo'}
          </Button>
          <button type="button" className="mt-1.5 h-[52px] w-full text-[15px] font-semibold text-ink-2" onClick={salir}>
            Salir sin guardar
          </button>
        </div>
      )}
    </div>
  );
}
