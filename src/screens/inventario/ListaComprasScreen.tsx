// Lista de compras — sugerida con los mínimos y las presentaciones de siempre:
// repone hasta 2× el mínimo con el producto activo de cada ingrediente.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { EstadoVacio, HeaderDetalle, HojaRegistrarCompra, Skeleton } from '../../components';
import { fmt, fmtQty, productoActivo, quedaPoco } from '../../lib/costeo';
import type { Ingrediente } from '../../api/catalogo.api';

export function ListaComprasScreen() {
  const { catalogo, loading, error } = useCatalogo();
  const navigate = useNavigate();
  const [compraDe, setCompraDe] = useState<Ingrediente | null>(null);

  if (loading) {
    return <div className="p-5"><Skeleton className="h-40 w-full" /></div>;
  }
  if (error || !catalogo) {
    return <EstadoVacio titulo="No se pudo cargar tu cocina" sub={error ?? undefined} />;
  }

  const filas = catalogo.ingredientes
    .filter(quedaPoco)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((ing) => {
      const producto = productoActivo(ing);
      if (!producto || producto.cantidad <= 0) {
        return null;
      }
      // Reponer hasta 2× el mínimo, redondeado a presentaciones completas
      const falta = Math.max(0, ing.minimo * 2 - ing.existencia);
      const unidades = Math.max(1, Math.ceil(falta / producto.cantidad));
      return { ing, producto, unidades, costo: unidades * producto.precio };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const total = filas.reduce((suma, f) => suma + f.costo, 0);

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle titulo="Lista de compras" onBack={() => navigate('/inventario')} />

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-10">
        {filas.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-2.5 text-center">
            <div className="text-[44px]">🧺</div>
            <div className="text-[18px] font-bold">Nada por comprar</div>
            <p className="max-w-[260px] text-[14.5px] leading-normal text-ink-2">
              Todos tus insumos están arriba de su mínimo. Aquí aparecerá lo que se vaya acabando.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[14px] text-ink-2">
              Sugerida con tus mínimos y presentaciones de siempre. Toca una fila para registrar la compra.
            </p>
            <div className="overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card shadow-[0_2px_8px_rgba(94,26,25,0.05)]">
              {filas.map((f, i) => (
                <div
                  key={f.ing.id}
                  className={`flex min-h-[68px] cursor-pointer items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
                  onClick={() => setCompraDe(f.ing)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15.5px] font-bold">{f.ing.nombre}</div>
                    <div className="mt-0.5 text-[12.5px] text-ink-2">
                      Quedan {fmtQty(f.ing.existencia, f.ing.unidadBase)} · mínimo {fmtQty(f.ing.minimo, f.ing.unidadBase)}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-burgundy-600">
                      {f.unidades} × {f.producto.presentacion} ({f.producto.marca})
                    </div>
                  </div>
                  <div className="flex-none text-[15px] font-extrabold tabular-nums">{fmt(f.costo)}</div>
                </div>
              ))}
              <div className="flex items-center justify-between bg-fill px-4 py-3.5">
                <span className="text-[14px] font-bold">Total estimado</span>
                <span className="text-[17px] font-extrabold tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {compraDe && (
        <HojaRegistrarCompra
          ingrediente={compraDe}
          onClose={() => setCompraDe(null)}
          onSaved={() => navigate('/inventario')}
        />
      )}
    </div>
  );
}
