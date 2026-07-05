// PantallaImpacto — "La mantequilla subió 12% · Afecta 9 recetas": semáforos
// antes → después, calculados recomputando con el precio viejo como override.
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { Button, Card, Expander, SemaforoMargen } from '../../components';
import { SEM, fmt, foodCostPct, nivel, productoActivo, usaIngrediente } from '../../lib/costeo';

export function PantallaImpactoScreen() {
  const { catalogo, idx, ultimoImpacto, setUltimoImpacto } = useCatalogo();
  const navigate = useNavigate();
  const [verTodas, setVerTodas] = useState(false);

  const datos = useMemo(() => {
    if (!catalogo || !idx || !ultimoImpacto) {
      return null;
    }
    const ing = catalogo.ingredientes.find((i) => i.id === ultimoImpacto.ingredienteId);
    if (!ing) {
      return null;
    }
    const objetivo = catalogo.cocina.foodCostObjetivo * 100;
    const { precioViejo, precioNuevo, productoId } = ultimoImpacto;
    const delta = precioViejo > 0 ? ((precioNuevo - precioViejo) / precioViejo) * 100 : 0;

    const afectadas = catalogo.recetas
      .filter((r) => r.precioVenta && usaIngrediente(idx, r.id, ing.id))
      .map((r) => {
        const antesPct = foodCostPct(idx, r.id, { precioOverride: { productoId, precio: precioViejo } });
        const despuesPct = foodCostPct(idx, r.id);
        const antes = nivel(antesPct, objetivo);
        const despues = nivel(despuesPct, objetivo);
        return { receta: r, antesPct, despuesPct, antes, despues, cambia: antes !== despues };
      })
      .sort((a, b) => {
        if (a.cambia !== b.cambia) {
          return a.cambia ? -1 : 1;
        }
        return Math.abs((b.despuesPct ?? 0) - (b.antesPct ?? 0)) - Math.abs((a.despuesPct ?? 0) - (a.antesPct ?? 0));
      });

    return { ing, producto: productoActivo(ing), delta, afectadas, precioViejo, precioNuevo };
  }, [catalogo, idx, ultimoImpacto]);

  if (!ultimoImpacto || !datos) {
    return <Navigate to="/ingredientes" replace />;
  }

  const { ing, producto, delta, afectadas, precioViejo, precioNuevo } = datos;
  const subio = delta > 0;
  const visibles = verTodas ? afectadas : afectadas.slice(0, 5);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="min-h-0 flex-1 overflow-auto px-5 pt-10 pb-6">
        <div className="text-center">
          <div className="text-[64px] leading-none" style={{ color: subio ? '#C0392B' : '#656D30' }}>
            {subio ? '▲' : '▼'}
          </div>
          <h1 className="mt-3 text-[24px] font-extrabold tracking-[-0.5px]">
            {ing.nombre} {subio ? 'subió' : 'bajó'} {Math.abs(Math.round(delta))}%
          </h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {producto?.presentacion}: {fmt(precioViejo)} → {fmt(precioNuevo)} · Afecta {afectadas.length} receta{afectadas.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="mt-6 space-y-2.5">
          {visibles.map(({ receta, antesPct, despuesPct, antes, despues, cambia }) => (
            <Card key={receta.id} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 text-[15px] font-bold">{receta.nombre}</div>
                <SemaforoMargen pct={antesPct} nivel={antes} />
                <span className="text-ink-3">→</span>
                <SemaforoMargen pct={despuesPct} nivel={despues} />
              </div>
              {cambia && (
                <div className="mt-1.5 text-[12.5px] font-bold" style={{ color: SEM.rojo.tx }}>
                  Cambió de color — revísala
                </div>
              )}
            </Card>
          ))}
        </div>
        <Expander abierto={verTodas} restantes={afectadas.length - 5} onToggle={() => setVerTodas((v) => !v)} />
      </div>

      <div className="flex-none px-5 pb-8">
        <Button
          block
          onClick={() => {
            setUltimoImpacto(null);
            navigate('/ingredientes', { replace: true });
          }}
        >
          Listo, entendido
        </Button>
      </div>
    </div>
  );
}
