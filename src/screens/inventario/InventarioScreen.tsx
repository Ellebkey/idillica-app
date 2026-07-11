// Inventario — cuánto tienes en insumos (con los precios de hoy), el equipo de
// la cocina, y las puertas a conteo, lista de compras y registro de compras.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCatalogo } from '../../state/CatalogoContext';
import { EstadoVacio, HojaNuevaHerramienta, HojaRegistrarCompra, Icon, Skeleton } from '../../components';
import { costoCrudo, diasCaducidad, fmt, fmtQty, quedaPoco } from '../../lib/costeo';
import type { Ingrediente } from '../../api/catalogo.api';

export function InventarioScreen() {
  const { catalogo, loading, error } = useCatalogo();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'insumos' | 'equipo'>('insumos');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [compraDe, setCompraDe] = useState<Ingrediente | null>(null);
  const [herramientaAbierta, setHerramientaAbierta] = useState(false);

  const filas = useMemo(() => {
    if (!catalogo) {
      return [];
    }
    // Lo urgente arriba: queda poco → por caducar (≤30 días) → el resto
    const urgencia = (ing: Ingrediente) => {
      if (quedaPoco(ing)) return 0;
      const dias = diasCaducidad(ing);
      return dias != null && dias <= 30 ? 1 : 2;
    };
    return [...catalogo.ingredientes]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .sort((a, b) => urgencia(a) - urgencia(b));
  }, [catalogo]);

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }
  if (error || !catalogo) {
    return <EstadoVacio titulo="No se pudo cargar tu cocina" sub={error ?? undefined} />;
  }

  const valor = catalogo.ingredientes.reduce((suma, ing) => suma + ing.existencia * costoCrudo(ing), 0);
  const porComprar = catalogo.ingredientes.filter(quedaPoco).length;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-5 pt-5 pb-24">
        <h1 className="mb-3.5 text-[26px] font-extrabold tracking-[-0.5px]">Inventario</h1>

        {/* Resumen en dinero — panel choco fijo, igual en claro y oscuro */}
        <div className="mb-3.5 flex items-center justify-between rounded-[20px] bg-choco-700 px-[18px] py-4 text-crema-100">
          <div>
            <div className="text-[11px] tracking-[0.5px] text-[#C9BBA9] uppercase">Tienes en insumos</div>
            <div className="text-[28px] font-extrabold tracking-[-0.8px] tabular-nums">{fmt(valor)}</div>
          </div>
          <div className="text-right text-[12.5px] leading-[1.4] text-[#C9BBA9]">
            con los precios
            <br />
            de hoy
          </div>
        </div>

        <div className="mb-3.5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className="h-[52px] rounded-2xl border-[1.5px] border-line bg-card text-[14px] font-bold text-ink"
            onClick={() => navigate('/inventario/conteo')}
          >
            Contar mi cocina
          </button>
          <button
            type="button"
            className="h-[52px] rounded-2xl bg-burgundy-600 text-[14px] font-bold text-crema-100"
            onClick={() => navigate('/inventario/compras')}
          >
            Lista de compras ({porComprar})
          </button>
        </div>

        <div className="mb-3.5 flex rounded-[14px] bg-fill p-1">
          {(['insumos', 'equipo'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-[11px] py-2.5 text-[14px] font-bold capitalize ${
                tab === t ? 'bg-card text-ink shadow-sm' : 'text-ink-3'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'insumos' ? (
          <>
            <div className="overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card shadow-[0_2px_8px_rgba(94,26,25,0.05)]">
              {filas.map((ing, i) => {
                const poco = quedaPoco(ing);
                const dias = diasCaducidad(ing);
                const caducaPronto = dias != null && dias <= 30;
                const rojo = dias != null && dias <= 7;
                return (
                  <div
                    key={ing.id}
                    className={`flex min-h-[68px] cursor-pointer items-center gap-2.5 py-3 pr-3.5 pl-4 ${i > 0 ? 'border-t border-line' : ''}`}
                    onClick={() => navigate(`/ingredientes/${ing.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15.5px] font-bold">{ing.nombre}</div>
                      <div className="mt-0.5 text-[12px] text-ink-2">
                        {ing.minimo > 0 ? `mínimo ${fmtQty(ing.minimo, ing.unidadBase)} · ` : ''}
                        vale {fmt(ing.existencia * costoCrudo(ing))}
                      </div>
                      {(poco || caducaPronto) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {poco && (
                            <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ background: '#F6ECD9', color: '#96691B' }}>
                              Queda poco
                            </span>
                          )}
                          {caducaPronto && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11.5px] font-bold"
                              style={{ background: rojo ? '#F7E4E1' : '#F6ECD9', color: rojo ? '#A93226' : '#96691B' }}
                            >
                              Caduca en {dias} {dias === 1 ? 'día' : 'días'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-none text-right text-[17px] font-extrabold tracking-[-0.3px] tabular-nums">
                      {fmtQty(ing.existencia, ing.unidadBase)}
                    </div>
                    <button
                      type="button"
                      title="Registrar compra"
                      className="grid h-12 w-12 flex-none place-items-center rounded-[14px] text-[22px] font-bold leading-none"
                      style={{ background: '#EFF0E3', color: '#59622B' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompraDe(ing);
                      }}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3.5 text-center text-[13px] text-ink-3">
              Toca <b>+</b> cuando llegues del súper con más
            </p>
          </>
        ) : (
          <>
            <div className="overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card shadow-[0_2px_8px_rgba(94,26,25,0.05)]">
              {catalogo.herramientas.length === 0 ? (
                <p className="px-4 py-6 text-center text-[14px] text-ink-2">
                  Aún no registras equipo. Usa el botón + para agregar tu primera herramienta o molde.
                </p>
              ) : (
                catalogo.herramientas.map((h, i) => {
                  const bien = h.estado === 'Buen estado';
                  return (
                    <div key={h.id} className={`flex min-h-16 items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold">{h.nombre}</div>
                        {h.detalle && <div className="mt-0.5 text-[12.5px] text-ink-2">{h.detalle}</div>}
                      </div>
                      <span
                        className="flex-none rounded-full px-2.5 py-1 text-[12px] font-bold"
                        style={{ background: bien ? '#EFF0E3' : '#F6ECD9', color: bien ? '#59622B' : '#96691B' }}
                      >
                        {h.estado}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <p className="mt-3.5 text-center text-[13px] text-ink-3">
              El desgaste de equipo ya está en tus gastos de operación
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        aria-label="Agregar"
        onClick={() => setMenuAbierto(true)}
        className="absolute right-5 bottom-5 grid h-[60px] w-[60px] place-items-center rounded-full bg-burgundy-600 text-crema-100 shadow-[0_8px_20px_rgba(157,44,52,0.4)]"
      >
        <Icon icon={PlusIcon} className="h-7 w-7" />
      </button>

      {menuAbierto && (
        <>
          <div className="fixed inset-0 z-40 bg-choco-900/35" onClick={() => setMenuAbierto(false)} />
          <div className="absolute right-5 bottom-[92px] z-40 flex flex-col items-end gap-2.5">
            <button
              type="button"
              className="flex h-[54px] items-center gap-2.5 rounded-full bg-card px-5 text-[15px] font-bold text-ink shadow-[0_8px_24px_rgba(42,27,23,0.25)]"
              onClick={() => navigate('/ingredientes/nuevo')}
            >
              🥚 Nuevo ingrediente
            </button>
            <button
              type="button"
              className="flex h-[54px] items-center gap-2.5 rounded-full bg-card px-5 text-[15px] font-bold text-ink shadow-[0_8px_24px_rgba(42,27,23,0.25)]"
              onClick={() => {
                setMenuAbierto(false);
                setTab('equipo');
                setHerramientaAbierta(true);
              }}
            >
              🥄 Herramienta o molde
            </button>
          </div>
        </>
      )}

      {compraDe && <HojaRegistrarCompra ingrediente={compraDe} onClose={() => setCompraDe(null)} />}
      {herramientaAbierta && <HojaNuevaHerramienta onClose={() => setHerramientaAbierta(false)} />}
    </div>
  );
}
