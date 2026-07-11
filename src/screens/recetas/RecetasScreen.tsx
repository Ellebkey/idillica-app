// Recetas — buscador + chips de categoría + RecetaCards con semáforo.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCatalogo } from '../../state/CatalogoContext';
import { Buscador, Card, ChipCategoria, Icon, SemaforoMargen, Skeleton } from '../../components';
import { costoReceta, fmt, foodCostPct, nivel, norm } from '../../lib/costeo';

export function RecetasScreen() {
  const { catalogo, idx, loading } = useCatalogo();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todas');

  const objetivo = (catalogo?.cocina.foodCostObjetivo ?? 0.3) * 100;

  const filtradas = useMemo(() => {
    if (!catalogo) {
      return [];
    }
    const nq = norm(q);
    return catalogo.recetas.filter(
      (r) => (cat === 'Todas' || r.categoria === cat) && (!nq || norm(r.nombre).includes(nq)),
    );
  }, [catalogo, q, cat]);

  if (loading || !catalogo || !idx) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pt-5 pb-24">
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Recetas</h1>
        <Buscador valor={q} onChange={setQ} placeholder="Buscar receta…" />

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none">
          {['Todas', ...catalogo.categorias].map((categoria) => (
            <ChipCategoria key={categoria} activa={cat === categoria} onClick={() => setCat(categoria)}>
              {categoria}
            </ChipCategoria>
          ))}
        </div>

        {filtradas.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-ink-3">No hay recetas que coincidan con tu búsqueda.</p>
        ) : (
          <div className="space-y-2.5">
            {filtradas.map((receta) => {
              const costo = costoReceta(idx, receta.id);
              const pct = foodCostPct(idx, receta.id);
              const porPorcion = receta.esSubreceta
                ? receta.rendimientoKg > 0 ? costo / receta.rendimientoKg : 0
                : receta.porciones > 0 ? costo / receta.porciones : 0;
              return (
                <Card
                  key={receta.id}
                  className="flex cursor-pointer items-center gap-3.5 p-3.5"
                  onClick={() => navigate(`/recetas/${receta.id}`)}
                >
                  {receta.fotos[0] ? (
                    <img src={receta.fotos[0]} alt="" className="h-16 w-16 flex-none rounded-2xl object-cover" />
                  ) : (
                    <div className="foto-rayada h-16 w-16 flex-none rounded-2xl" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15.5px] font-bold">{receta.nombre}</span>
                      {receta.esSubreceta && (
                        <span className="flex-none rounded-full bg-sub-100 px-2 py-0.5 text-[11px] font-bold text-sub-600">
                          ◆ Subreceta
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-ink-2">
                      {receta.categoria} · {receta.esSubreceta ? receta.etiqueta : `${receta.porciones} ${receta.etiqueta}`}
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span>
                        <span className="text-[17px] font-extrabold tracking-[-0.3px] tabular-nums">{fmt(costo)}</span>
                        <span className="text-[12px] text-ink-2"> total</span>
                      </span>
                      <span className="text-[13px] text-ink-2">
                        {receta.esSubreceta
                          ? receta.rendimientoKg > 0 ? `${fmt(porPorcion)} / kg` : '—'
                          : `${fmt(porPorcion)} / ${receta.etiquetaSingular}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end justify-between gap-3 self-stretch">
                    <SemaforoMargen pct={pct} nivel={nivel(pct, objetivo)} />
                    <span className="text-ink-3">›</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Nueva receta"
        onClick={() => navigate('/recetas/nueva')}
        className="absolute right-5 bottom-5 grid h-[60px] w-[60px] place-items-center rounded-full bg-burgundy-600 text-crema-100 shadow-[0_8px_20px_rgba(157,44,52,0.4)]"
      >
        <Icon icon={PlusIcon} className="h-7 w-7" />
      </button>
    </div>
  );
}
