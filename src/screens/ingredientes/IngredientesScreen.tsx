// Ingredientes — lista agrupada alfabéticamente; el botón $ abre el sheet de
// nuevo precio ("Toca $ cuando un precio cambie en el súper").
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCatalogo } from '../../state/CatalogoContext';
import { BadgeMerma, Buscador, HojaNuevoPrecio, Icon, PuntoViejo, Skeleton } from '../../components';
import { costoIngrediente, diasDesdePrecio, fmt, norm, unitWord } from '../../lib/costeo';
import type { Ingrediente } from '../../api/catalogo.api';

export function IngredientesScreen() {
  const { catalogo, loading } = useCatalogo();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sheetIng, setSheetIng] = useState<Ingrediente | null>(null);

  const grupos = useMemo(() => {
    if (!catalogo) {
      return [];
    }
    const nq = norm(q);
    const filtrados = catalogo.ingredientes.filter((i) => !nq || norm(i.nombre).includes(nq));
    const porLetra = new Map<string, Ingrediente[]>();
    for (const ing of filtrados) {
      const letra = norm(ing.nombre).charAt(0).toUpperCase() || '#';
      porLetra.set(letra, [...(porLetra.get(letra) ?? []), ing]);
    }
    return [...porLetra.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalogo, q]);

  if (loading || !catalogo) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pt-5 pb-24">
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Ingredientes</h1>
        <Buscador valor={q} onChange={setQ} placeholder="Buscar ingrediente…" />
        <p className="text-[13px] text-ink-3">Toca <b className="text-burgundy-600">$</b> cuando un precio cambie en el súper.</p>

        {grupos.map(([letra, ingredientes]) => (
          <section key={letra}>
            <div className="mb-1.5 text-[14px] font-extrabold text-ink-3">{letra}</div>
            <div className="overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card shadow-[0_2px_8px_rgba(94,26,25,0.05)]">
              {ingredientes.map((ing, i) => (
                <div
                  key={ing.id}
                  className={`flex min-h-[68px] cursor-pointer items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t-[1.5px] border-line' : ''}`}
                  onClick={() => navigate(`/ingredientes/${ing.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15.5px] font-bold">{ing.nombre}</span>
                      {diasDesdePrecio(ing) > 60 && <PuntoViejo />}
                    </div>
                    <div className="mt-0.5">
                      <BadgeMerma pct={ing.merma.pct} origen={ing.merma.origen} />
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[17px] font-extrabold tabular-nums">{fmt(costoIngrediente(ing))}</div>
                    <div className="text-[11.5px] text-ink-3">
                      por {unitWord(ing.unidadBase)}{ing.merma.pct > 0 ? ' (ya con desperdicio)' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Nuevo precio de ${ing.nombre}`}
                    className="grid h-12 w-12 flex-none place-items-center rounded-2xl text-[17px] font-extrabold"
                    style={{ background: '#F1E2D9', color: '#9D2C34' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSheetIng(ing);
                    }}
                  >
                    $
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button
        type="button"
        aria-label="Nuevo ingrediente"
        onClick={() => navigate('/ingredientes/nuevo')}
        className="absolute right-5 bottom-5 grid h-[60px] w-[60px] place-items-center rounded-full bg-burgundy-600 text-crema-100 shadow-[0_8px_20px_rgba(157,44,52,0.4)]"
      >
        <Icon icon={PlusIcon} className="h-7 w-7" />
      </button>

      {sheetIng && <HojaNuevoPrecio ingrediente={sheetIng} onClose={() => setSheetIng(null)} />}
    </div>
  );
}
