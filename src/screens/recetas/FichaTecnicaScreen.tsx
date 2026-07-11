// Ficha técnica — hoja BLANCA siempre (es papel), sobre fondo escritorio.
// Imprimible: @media print aísla .hoja-print.
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { Button, EstadoVacio, HeaderDetalle } from '../../components';
import { costoIngrediente, costoReceta, fmt, fmtQty, foodCostPct, nivel } from '../../lib/costeo';

const COLOR_FICHA: Record<string, string> = { verde: '#C9D6A3', ambar: '#EBCB8F', rojo: '#F0A79B', gris: '#D8CDBA' };

export function FichaTecnicaScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { catalogo, idx } = useCatalogo();

  const receta = catalogo?.recetas.find((r) => r.id === id);

  const filas = useMemo(() => {
    if (!receta || !idx) {
      return [];
    }
    const total = costoReceta(idx, receta.id);
    return receta.lineas
      .map((l) => {
        if (l.ingredienteId) {
          const ing = idx.ingredientes.get(l.ingredienteId);
          if (!ing) return null;
          return { nombre: ing.nombre, cantidad: fmtQty(l.cantidad, ing.unidadBase), costo: l.cantidad * costoIngrediente(ing), total };
        }
        const sub = l.recetaId ? idx.recetas.get(l.recetaId) : undefined;
        if (!sub || sub.rendimientoKg <= 0) return null;
        return { nombre: `${sub.nombre} (subreceta)`, cantidad: fmtQty(l.cantidad, 'kg'), costo: (l.cantidad / sub.rendimientoKg) * costoReceta(idx, sub.id), total };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .sort((a, b) => b.costo - a.costo);
  }, [receta, idx]);

  if (!catalogo || !idx || !receta) {
    return <EstadoVacio titulo="Receta no encontrada" />;
  }

  const objetivo = catalogo.cocina.foodCostObjetivo * 100;
  const total = costoReceta(idx, receta.id);
  const pct = foodCostPct(idx, receta.id);
  const n = nivel(pct, objetivo);
  const porPorcion = receta.porciones > 0 ? total / receta.porciones : 0;
  const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return (
    // tema-claro: la ficha es papel — se queda en claro aunque la app esté en dark
    <div className="tema-claro flex h-full flex-col" style={{ background: '#E8E1CF' }}>
      <div className="print:hidden">
        <HeaderDetalle
          titulo="Ficha técnica"
          onBack={() => navigate(`/recetas/${id}`)}
          right={<Button sm onClick={() => window.print()}>Imprimir PDF</Button>}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="hoja-print mx-auto max-w-[520px] overflow-hidden rounded-lg bg-white text-[#2A1B17] shadow-xl">
          <div className="flex items-start justify-between px-6 pt-6">
            <div>
              <div className="text-[11px] font-extrabold tracking-[3px] text-[#9D2C34] uppercase">Ficha técnica</div>
              <h1 className="mt-1 text-[24px] font-extrabold leading-tight">{receta.nombre}</h1>
              <div className="mt-0.5 text-[13px] text-[#7A6A5B]">
                {receta.categoria} · {receta.porciones} {receta.etiqueta}
                {receta.rendimientoKg > 0 ? ` · Rinde ${receta.rendimientoKg < 1 ? `${Math.round(receta.rendimientoKg * 1000)} g` : `${receta.rendimientoKg} kg`}` : ''}
              </div>
            </div>
            <img src="/logo-blanco.png" alt="Idílica" className="h-12 w-12 rounded-xl bg-[#9D2C34] object-contain p-1.5" />
          </div>

          {receta.fotos[0]
            ? <img src={receta.fotos[0]} alt="" className="mt-4 h-[110px] w-full object-cover" />
            : <div className="foto-rayada mt-4 h-[110px] w-full" />}

          <div className="px-6 py-5">
            <div className="text-[11px] font-extrabold tracking-[2px] text-[#9D2C34] uppercase">Ingredientes</div>
            <div className="mt-2">
              <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.5fr] gap-2 border-b border-[#E4DBC6] pb-1.5 text-[10.5px] font-extrabold text-[#A99A88] uppercase">
                <span>Ingrediente</span><span>Cantidad</span><span className="text-right">Costo</span><span className="text-right">%</span>
              </div>
              {filas.map((f) => (
                <div key={f.nombre} className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.5fr] gap-2 border-b border-[#F1EAD8] py-2 text-[12.5px]">
                  <span className="font-bold">{f.nombre}</span>
                  <span className="text-[#7A6A5B]">{f.cantidad}</span>
                  <span className="text-right font-bold tabular-nums">{fmt(f.costo)}</span>
                  <span className="text-right text-[#7A6A5B] tabular-nums">{f.total > 0 ? Math.round((f.costo / f.total) * 100) : 0}%</span>
                </div>
              ))}
            </div>

            {receta.pasos.length > 0 && (
              <>
                <div className="mt-5 text-[11px] font-extrabold tracking-[2px] text-[#9D2C34] uppercase">Elaboración</div>
                <ol className="mt-2 space-y-2">
                  {receta.pasos.map((p, i) => (
                    <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug">
                      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[#43302A] text-[10px] font-extrabold text-white">{i + 1}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {receta.alergenos.length > 0 && (
              <>
                <div className="mt-5 text-[11px] font-extrabold tracking-[2px] text-[#9D2C34] uppercase">Alérgenos</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {receta.alergenos.map((a) => (
                    <span key={a} className="rounded-full border border-[#9D2C34] px-2.5 py-0.5 text-[11px] font-bold text-[#9D2C34]">{a}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 px-6 py-4 text-center" style={{ background: '#2E211C' }}>
            {[
              { k: 'Costo total', v: fmt(total), c: '#F1E8D9' },
              { k: `Por ${receta.etiquetaSingular}`, v: fmt(porPorcion), c: '#F1E8D9' },
              { k: 'Precio venta', v: receta.precioVenta ? fmt(receta.precioVenta) : '—', c: '#F1E8D9' },
              { k: 'Food cost', v: pct == null ? '—' : `${Math.round(pct)}%`, c: COLOR_FICHA[n] },
            ].map((s) => (
              <div key={s.k}>
                <div className="text-[9.5px] font-bold tracking-wide text-[#A99A88] uppercase">{s.k}</div>
                <div className="text-[15px] font-extrabold tabular-nums" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 text-center text-[10.5px] text-[#A99A88]">
            Idílica Panadería Gourmet · Guadalajara · Actualizada el {fecha}
          </div>
        </div>
      </div>
    </div>
  );
}
