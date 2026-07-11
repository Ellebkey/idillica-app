// Editor de receta — la pantalla más compleja del handoff: BarraCostoSticky
// de tres columnas, secciones colapsables con conteo, líneas compactas con la
// cantidad como pill editable, ganancia real y "Produje esta receta".
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import {
  Button, DonaCosto, EstadoVacio, HeaderDetalle, HojaProduccion, ModalSalirSinGuardar, Skeleton,
} from '../../components';
import {
  SEM, cantidadSugerida, costoIngrediente, costoReceta, fmt, fmtQty, nivel, norm, tasaOperacion, unitShort,
} from '../../lib/costeo';
import type { Receta, SaveRecetaInput } from '../../api/catalogo.api';

interface LineaDraft {
  ingredienteId?: string;
  recetaId?: string;
  cantidad: number;
}

interface Draft {
  nombre: string;
  categoria: string;
  porciones: number;
  etiqueta: string;
  etiquetaSingular: string;
  rendimientoKg: number;
  precioVenta: number | null;
  esSubreceta: boolean;
  alergenos: string[];
  pasos: string[];
  lineas: LineaDraft[];
}

function draftDe(receta: Receta | null, categoriaDefault: string): Draft {
  if (!receta) {
    return {
      nombre: '', categoria: categoriaDefault, porciones: 1, etiqueta: 'piezas', etiquetaSingular: 'pieza',
      rendimientoKg: 0, precioVenta: null, esSubreceta: false, alergenos: [], pasos: [], lineas: [],
    };
  }
  return {
    nombre: receta.nombre, categoria: receta.categoria, porciones: receta.porciones,
    etiqueta: receta.etiqueta, etiquetaSingular: receta.etiquetaSingular,
    rendimientoKg: receta.rendimientoKg, precioVenta: receta.precioVenta, esSubreceta: receta.esSubreceta,
    alergenos: [...receta.alergenos], pasos: [...receta.pasos],
    lineas: receta.lineas.map((l) => ({ ingredienteId: l.ingredienteId, recetaId: l.recetaId, cantidad: l.cantidad })),
  };
}

// Estilos de campo del editor (h 50, radio 14, fondo surface — como el handoff)
const inputClass =
  'h-[50px] w-full rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15.5px] outline-none placeholder:text-ink-3 focus:border-burgundy-600';
const inputNumClass =
  'h-[50px] w-full min-w-0 rounded-[14px] border-[1.5px] border-line bg-surface text-center text-[16px] font-bold tabular-nums outline-none placeholder:text-ink-3 focus:border-burgundy-600';

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[13px] font-semibold text-ink-2">{children}</div>;
}

function Seccion({ titulo, cuenta, abierta, onToggle, children }: {
  titulo: string; cuenta?: string | number; abierta: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card">
      <button type="button" onClick={onToggle} className="flex min-h-14 w-full items-center justify-between px-[18px] py-4">
        <span className="text-[16px] font-bold">
          {titulo}
          {cuenta != null && <span className="font-semibold text-ink-3"> · {cuenta}</span>}
        </span>
        <span className="text-[20px] font-semibold text-ink-3">{abierta ? '−' : '+'}</span>
      </button>
      {abierta && children}
    </div>
  );
}

export function EditorRecetaScreen() {
  const { id = '' } = useParams();
  const esNueva = id === 'nueva';
  const navigate = useNavigate();
  const { catalogo, idx, guardarReceta, crearReceta } = useCatalogo();

  const receta = useMemo(
    () => (esNueva ? null : catalogo?.recetas.find((r) => r.id === id) ?? null),
    [catalogo, id, esNueva],
  );

  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [rendEnGr, setRendEnGr] = useState(false);
  const [addQ, setAddQ] = useState('');
  const [produccionAbierta, setProduccionAbierta] = useState(false);
  const [open, setOpen] = useState({ datos: true, ing: true, costo: true, elab: false, alerg: false, fotos: false });
  // "Preparar para N": escala la VISTA (cantidades y costo del lote) sin
  // tocar la receta base; null = lote base.
  const [paraPorciones, setParaPorciones] = useState<number | null>(null);
  // Buffer del input numérico enfocado: conserva estados intermedios ("0.")
  // que parseFloat colapsaría y el re-render se comería.
  const [buf, setBuf] = useState<{ k: string; v: string } | null>(null);
  const bufVal = (k: string, fallback: string) => (buf?.k === k ? buf.v : fallback);

  // Inicializa el borrador cuando llega el catálogo
  if (catalogo && draft === null && (esNueva || receta)) {
    setDraft(draftDe(receta, catalogo.categorias[0] ?? 'Pasteles'));
    // El handoff arranca en gramos cuando el rendimiento es menor a 1 kg
    if (receta && receta.rendimientoKg > 0 && receta.rendimientoKg < 1) {
      setRendEnGr(true);
    }
  }

  const objetivo = (catalogo?.cocina.foodCostObjetivo ?? 0.3) * 100;
  const tasa = catalogo ? tasaOperacion(catalogo.cocina) : 0;

  // Costo EN VIVO del borrador: el motor con las líneas override
  const costo = useMemo(() => {
    if (!idx || !draft) {
      return 0;
    }
    if (esNueva) {
      // Receta nueva: no existe en el índice; suma directa de líneas
      let total = 0;
      for (const l of draft.lineas) {
        if (l.ingredienteId) {
          const ing = idx.ingredientes.get(l.ingredienteId);
          if (ing) total += l.cantidad * costoIngrediente(ing);
        } else if (l.recetaId) {
          const sub = idx.recetas.get(l.recetaId);
          if (sub && sub.rendimientoKg > 0) total += (l.cantidad / sub.rendimientoKg) * costoReceta(idx, l.recetaId);
        }
      }
      return total;
    }
    return costoReceta(idx, id, { lineasOverride: { recetaId: id, lineas: draft.lineas } });
  }, [idx, draft, id, esNueva]);

  if (!catalogo || !idx || !draft) {
    return <div className="p-5"><Skeleton className="h-32 w-full" /></div>;
  }
  if (!esNueva && !receta) {
    return <EstadoVacio titulo="Receta no encontrada" />;
  }

  const pct = draft.precioVenta && draft.precioVenta > 0 ? (costo / draft.precioVenta) * 100 : null;
  const n = nivel(pct, objetivo);
  const porUnidad = draft.esSubreceta
    ? draft.rendimientoKg > 0 ? costo / draft.rendimientoKg : 0
    : draft.porciones > 0 ? costo / draft.porciones : 0;

  const costoReal = costo * (1 + tasa);
  const ganancia = draft.precioVenta != null ? (draft.precioVenta - costoReal) / (draft.esSubreceta ? 1 : Math.max(1, draft.porciones)) : null;

  const partesDona = draft.lineas
    .map((l) => {
      if (l.ingredienteId) {
        const ing = idx.ingredientes.get(l.ingredienteId);
        return ing ? { nombre: ing.nombre, valor: l.cantidad * costoIngrediente(ing) } : null;
      }
      const sub = l.recetaId ? idx.recetas.get(l.recetaId) : undefined;
      return sub && sub.rendimientoKg > 0
        ? { nombre: sub.nombre, valor: (l.cantidad / sub.rendimientoKg) * costoReceta(idx, sub.id) }
        : null;
    })
    .filter((p): p is { nombre: string; valor: number } => p !== null && p.valor > 0);

  // Autocomplete: ingredientes + subrecetas, excluyendo ya usados y a sí misma
  const usadosIng = new Set(draft.lineas.map((l) => l.ingredienteId).filter(Boolean));
  const usadasRec = new Set(draft.lineas.map((l) => l.recetaId).filter(Boolean));
  const matches = addQ.trim()
    ? [
        ...catalogo.ingredientes
          .filter((i) => !usadosIng.has(i.id) && norm(i.nombre).includes(norm(addQ)))
          .map((i) => ({ tipo: 'ing' as const, id: i.id, nombre: i.nombre, meta: `${fmt(costoIngrediente(i))} / ${unitShort(i.unidadBase)}` })),
        ...catalogo.recetas
          .filter((r) => r.id !== id && !usadasRec.has(r.id) && r.rendimientoKg > 0 && norm(r.nombre).includes(norm(addQ)))
          .map((r) => ({ tipo: 'rec' as const, id: r.id, nombre: `◆ ${r.nombre}`, meta: `${fmt(costoReceta(idx, r.id) / r.rendimientoKg)} / kg` })),
      ].slice(0, 5)
    : [];

  function mutate(cambios: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...cambios } : prev));
    setDirty(true);
  }

  function salir() {
    navigate(esNueva ? '/recetas' : -1 as unknown as string);
  }

  async function guardar() {
    if (guardando || !draft) {
      return;
    }
    setGuardando(true);
    setErrorGuardar(null);
    const input: SaveRecetaInput = {
      nombre: draft.nombre.trim() || 'Nueva receta',
      categoria: draft.categoria,
      porciones: draft.porciones,
      etiqueta: draft.etiqueta || 'piezas',
      etiquetaSingular: draft.etiquetaSingular || 'pieza',
      rendimientoKg: draft.rendimientoKg,
      precioVenta: draft.esSubreceta ? null : draft.precioVenta,
      ivaPct: receta?.ivaPct ?? 16,
      esSubreceta: draft.esSubreceta,
      alergenos: draft.alergenos,
      pasos: draft.pasos.filter((p) => p.trim()),
      fotos: receta?.fotos ?? [],
      lineas: draft.lineas,
    };
    try {
      if (esNueva) {
        const creada = await crearReceta(input);
        navigate(`/recetas/${creada.id}`, { replace: true });
      } else {
        await guardarReceta(id, input);
      }
      setDirty(false);
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const nLineas = draft.lineas.length;
  const nPasos = `${draft.pasos.length} ${draft.pasos.length === 1 ? 'paso' : 'pasos'}`;

  // Escalado de la vista
  const factor = paraPorciones != null && draft.porciones > 0 ? paraPorciones / draft.porciones : 1;
  const escalando = factor !== 1;
  const factorTxt = String(parseFloat(factor.toFixed(2)));
  const haySensibles = draft.lineas.some(
    (l) => l.ingredienteId && idx.ingredientes.get(l.ingredienteId)?.escalado !== 'normal',
  );

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle
        titulo={
          <span className="flex items-center gap-2">
            <span className="truncate">{esNueva ? 'Nueva receta' : draft.nombre}</span>
            {draft.esSubreceta && (
              <span className="flex-none rounded-full bg-sub-100 px-2 py-0.5 text-[11px] font-bold text-sub-600">◆ Subreceta</span>
            )}
          </span>
        }
        onBack={() => (dirty ? setConfirmExit(true) : salir())}
        right={
          <Button sm disabled={guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-10">
        {/* BarraCostoSticky: costo total · por porción/kilo · food cost */}
        <div className="sticky top-0 z-30 flex items-center justify-between rounded-[18px] bg-choco-700 px-4 py-3 text-crema-100 shadow-[0_6px_18px_rgba(42,27,23,0.3)]">
          <div>
            <div className="text-[11px] tracking-[0.5px] text-[#C9BBA9] uppercase">Costo total</div>
            <div className="text-[22px] font-extrabold tracking-[-0.5px] tabular-nums">{fmt(costo)}</div>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.5px] text-[#C9BBA9] uppercase">
              {draft.esSubreceta ? 'Por kilo' : `Por ${draft.etiquetaSingular || 'pieza'}`}
            </div>
            <div className="text-[22px] font-extrabold tracking-[-0.5px] tabular-nums">{fmt(porUnidad)}</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[11px] tracking-[0.5px] text-[#C9BBA9] uppercase">Food cost</div>
            <div
              className="mt-0.5 flex items-center gap-1.5 rounded-full px-2.5 py-[3px]"
              style={{ background: pct == null ? '#6E6A5E' : SEM[n].solid }}
            >
              <span className="h-2 w-2 rounded-full bg-crema-100" />
              <span className="text-[16px] font-extrabold">{pct == null ? '—' : `${Math.round(pct)}%`}</span>
            </div>
          </div>
        </div>

        {errorGuardar && (
          <div className="mt-3 rounded-2xl bg-rojo-100 px-4 py-3 text-[13.5px] font-bold text-rojo-600">{errorGuardar}</div>
        )}

        <div className="mt-4 space-y-3">
          <Seccion titulo="Datos de la receta" abierta={open.datos} onToggle={() => setOpen((o) => ({ ...o, datos: !o.datos }))}>
            <div className="space-y-3 px-[18px] pb-[18px]">
              <div>
                <Etiqueta>Nombre</Etiqueta>
                <input
                  value={draft.nombre}
                  placeholder="Nombre de la receta"
                  onChange={(e) => mutate({ nombre: e.target.value })}
                  className={`${inputClass} font-semibold`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Etiqueta>Categoría</Etiqueta>
                  <div className="relative">
                    <select
                      value={draft.categoria}
                      onChange={(e) => mutate({ categoria: e.target.value })}
                      className={`${inputClass} appearance-none pr-8 font-semibold`}
                    >
                      {catalogo.categorias.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3">▾</span>
                  </div>
                </div>
                <div>
                  <Etiqueta>Porciones</Etiqueta>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="h-[50px] w-10 flex-none rounded-[14px] border-[1.5px] border-line bg-surface text-[20px] text-ink"
                      onClick={() => mutate({ porciones: Math.max(1, draft.porciones - 1) })}
                    >
                      −
                    </button>
                    <div className="grid h-[50px] min-w-0 flex-1 place-items-center text-[17px] font-extrabold tabular-nums">
                      {draft.porciones}
                    </div>
                    <button
                      type="button"
                      className="h-[50px] w-10 flex-none rounded-[14px] border-[1.5px] border-line bg-surface text-[20px] text-ink"
                      onClick={() => mutate({ porciones: draft.porciones + 1 })}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Etiqueta>Etiqueta de porción</Etiqueta>
                  <input
                    value={draft.etiqueta}
                    placeholder="piezas, rebanadas…"
                    onChange={(e) => mutate({ etiqueta: e.target.value, etiquetaSingular: e.target.value.replace(/s$/, '') })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Etiqueta>Rendimiento</Etiqueta>
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      value={bufVal('rend', draft.rendimientoKg > 0 ? String(rendEnGr ? Math.round(draft.rendimientoKg * 1000) : parseFloat(draft.rendimientoKg.toFixed(2))) : '')}
                      placeholder="0"
                      onChange={(e) => {
                        const limpio = e.target.value.replace(/[^0-9.]/g, '');
                        setBuf({ k: 'rend', v: limpio });
                        const v = parseFloat(limpio) || 0;
                        mutate({ rendimientoKg: rendEnGr ? v / 1000 : v });
                      }}
                      onBlur={() => setBuf(null)}
                      className={inputNumClass}
                    />
                    <div className="flex flex-none rounded-xl bg-fill p-[3px]">
                      {(['g', 'kg'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setRendEnGr(u === 'g')}
                          className="rounded-[10px] px-2.5 py-2 text-[13px] font-bold"
                          style={
                            (u === 'g') === rendEnGr
                              ? { background: '#43302A', color: '#F8F4E9' }
                              : { color: 'var(--ink-2)' }
                          }
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Etiqueta>Precio de venta</Etiqueta>
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-bold text-ink-2">$</span>
                    <input
                      inputMode="decimal"
                      disabled={draft.esSubreceta}
                      value={bufVal('precio', draft.precioVenta != null ? String(draft.precioVenta) : '')}
                      placeholder="—"
                      onChange={(e) => {
                        const limpio = e.target.value.replace(/[^0-9.]/g, '');
                        setBuf({ k: 'precio', v: limpio });
                        const v = parseFloat(limpio);
                        mutate({ precioVenta: Number.isFinite(v) && v > 0 ? v : null });
                      }}
                      onBlur={() => setBuf(null)}
                      className={inputNumClass}
                    />
                  </div>
                  {draft.esSubreceta && (
                    <p className="mt-1 text-[11.5px] text-ink-3">Se vende dentro de otras recetas</p>
                  )}
                </div>
                <div>
                  <Etiqueta>IVA</Etiqueta>
                  <div className="flex h-[50px] items-center justify-between rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15px] font-semibold">
                    {receta?.ivaPct ?? 16}% <span className="text-ink-3">▾</span>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  checked={draft.esSubreceta}
                  onChange={(e) => mutate({ esSubreceta: e.target.checked, precioVenta: e.target.checked ? null : draft.precioVenta })}
                  className="h-5 w-5 accent-burgundy-600"
                />
                <span className="text-[14px] font-bold">Es subreceta (relleno, betún, base…)</span>
              </label>
            </div>
          </Seccion>

          <Seccion titulo="Ingredientes" cuenta={nLineas} abierta={open.ing} onToggle={() => setOpen((o) => ({ ...o, ing: !o.ing }))}>
            <div className="px-2.5 pb-3.5">
              {!esNueva && draft.porciones > 0 && (
                <div className="mx-2 mb-2.5 rounded-[14px] bg-fill px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-ink-2">Preparar para</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="grid h-10 w-10 flex-none place-items-center rounded-[10px] border-[1.5px] border-line bg-card text-[18px] text-ink"
                        onClick={() => setParaPorciones(Math.max(1, (paraPorciones ?? draft.porciones) - 1))}
                      >
                        −
                      </button>
                      <span className="min-w-[52px] text-center text-[17px] font-extrabold tabular-nums">
                        {paraPorciones ?? draft.porciones}
                      </span>
                      <button
                        type="button"
                        className="grid h-10 w-10 flex-none place-items-center rounded-[10px] border-[1.5px] border-line bg-card text-[18px] text-ink"
                        onClick={() => setParaPorciones((paraPorciones ?? draft.porciones) + 1)}
                      >
                        +
                      </button>
                      <span className="text-[13px] text-ink-2">{draft.etiqueta || 'porciones'}</span>
                    </div>
                  </div>
                  {escalando && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-extrabold text-burgundy-600">×{factorTxt}</span>
                      <span className="text-ink-2">
                        Costo del lote: <b className="tabular-nums">{fmt(costo * factor)}</b>
                      </span>
                      <button
                        type="button"
                        className="font-bold text-burgundy-600"
                        onClick={() => setParaPorciones(null)}
                      >
                        Volver a {draft.porciones}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {escalando && factor >= 2 && haySensibles && (
                <div className="mx-2 mb-2.5 rounded-[14px] px-3.5 py-2.5 text-[12.5px] font-semibold" style={{ background: '#F6ECD9', color: '#96691B' }}>
                  Escalaste ×{factorTxt}: revisa los marcados — los leudantes y la sazón no suben lineal.
                </div>
              )}

              {draft.lineas.map((l, i) => {
                const ing = l.ingredienteId ? idx.ingredientes.get(l.ingredienteId) : undefined;
                const sub = l.recetaId ? idx.recetas.get(l.recetaId) : undefined;
                const costoLinea = ing
                  ? l.cantidad * costoIngrediente(ing)
                  : sub && sub.rendimientoKg > 0 ? (l.cantidad / sub.rendimientoKg) * costoReceta(idx, sub.id) : 0;
                const setCantidad = (v: string) => {
                  const limpio = v.replace(/[^0-9.]/g, '');
                  setBuf({ k: `linea-${i}`, v: limpio });
                  const num = parseFloat(limpio) || 0;
                  mutate({ lineas: draft.lineas.map((x, xi) => (xi === i ? { ...x, cantidad: num } : x)) });
                };
                const quitar = () => mutate({ lineas: draft.lineas.filter((_, xi) => xi !== i) });

                if (sub) {
                  const share = costo > 0 ? Math.round((costoLinea / costo) * 100) : 0;
                  return (
                    <div key={i} className="mb-1.5 flex min-h-[60px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#E3D3E5] bg-[#F6EFF7] px-2 py-3">
                      <span className="flex-none text-[16px] text-[#7B4B84]">◆</span>
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/recetas/${sub.id}`)}>
                        <div className="truncate text-[15px] font-bold text-[#5C3763]">{sub.nombre}</div>
                        <div className="text-[12px] font-bold" style={{ color: share > 60 ? '#A93226' : '#7B4B84' }}>
                          {share}% del costo de esta receta
                        </div>
                      </button>
                      <div className="flex flex-none items-center gap-1.5">
                        {escalando ? (
                          <span className="rounded-[10px] bg-[#EDE2EE] px-2.5 py-1.5 text-[14px] font-semibold text-[#5C3763]">
                            {fmtQty(l.cantidad * factor, 'kg')}
                          </span>
                        ) : (
                          <label className="flex items-center gap-1 rounded-[10px] bg-[#EDE2EE] px-2 py-1.5">
                            <input
                              inputMode="decimal"
                              value={bufVal(`linea-${i}`, String(l.cantidad))}
                              onChange={(e) => setCantidad(e.target.value)}
                              onBlur={() => setBuf(null)}
                              className="w-12 bg-transparent text-right text-[14px] font-semibold text-[#5C3763] outline-none"
                            />
                            <span className="text-[14px] font-semibold text-[#5C3763]">kg</span>
                          </label>
                        )}
                        <span className="w-[62px] text-right text-[15px] font-extrabold text-[#43302A] tabular-nums">{fmt(costoLinea * factor)}</span>
                        {!escalando && (
                          <button type="button" aria-label="Quitar subreceta" className="p-1.5 text-[16px] font-bold text-[#A93226]" onClick={quitar}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                const sugerencia = escalando && ing ? cantidadSugerida(l.cantidad, factor, ing.escalado) : null;
                return (
                  <div key={i} className="border-b border-line px-2 py-3">
                    <div className="flex min-h-8 items-center gap-2.5">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold"
                        onClick={() => ing && navigate(`/ingredientes/${ing.id}`)}
                      >
                        {ing?.nombre ?? '—'}
                      </button>
                      <div className="flex flex-none items-center gap-1.5">
                        {escalando ? (
                          <span
                            className="rounded-[10px] px-2.5 py-1.5 text-[14px] font-semibold"
                            style={sugerencia != null ? { background: '#F6ECD9', color: '#96691B' } : { background: 'var(--fill)', color: 'var(--ink-2)' }}
                          >
                            {ing ? fmtQty(l.cantidad * factor, ing.unidadBase) : '—'}
                          </span>
                        ) : (
                          <label className="flex items-center gap-1 rounded-[10px] bg-fill px-2 py-1.5">
                            <input
                              inputMode="decimal"
                              value={bufVal(`linea-${i}`, String(l.cantidad))}
                              onChange={(e) => setCantidad(e.target.value)}
                              onBlur={() => setBuf(null)}
                              className="w-12 bg-transparent text-right text-[14px] font-semibold text-ink-2 outline-none"
                            />
                            <span className="text-[14px] font-semibold text-ink-2">{ing ? unitShort(ing.unidadBase) : 'kg'}</span>
                          </label>
                        )}
                        <span className="w-[62px] text-right text-[15px] font-extrabold tabular-nums">{fmt(costoLinea * factor)}</span>
                        {!escalando && (
                          <button type="button" aria-label="Quitar línea" className="p-1.5 text-[16px] font-bold text-[#A93226]" onClick={quitar}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {sugerencia != null && ing && (
                      <div className="mt-1.5 text-right text-[12px] font-bold" style={{ color: '#96691B' }}>
                        Sugerido: {fmtQty(sugerencia, ing.unidadBase)} — {ing.escalado === 'leudante' ? 'los leudantes van al 75% de lo lineal' : 'la sazón sube más suave'}
                      </div>
                    )}
                  </div>
                );
              })}

              {!escalando && (
              <div className="mt-2.5 px-2">
                <input
                  value={addQ}
                  onChange={(e) => setAddQ(e.target.value)}
                  placeholder="+ Agregar ingrediente… escribe para buscar"
                  className="h-12 w-full rounded-[14px] border-[1.5px] border-dashed border-line bg-surface px-3.5 text-[14px] outline-none placeholder:text-ink-3"
                />
                {addQ.trim() !== '' && (
                  <div className="mt-1.5 overflow-hidden rounded-[14px] border-[1.5px] border-line bg-card shadow-[0_8px_20px_rgba(42,27,23,0.12)]">
                    {matches.map((m) => (
                      <button
                        key={`${m.tipo}-${m.id}`}
                        type="button"
                        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-line px-3.5 py-3 text-left last:border-b-0"
                        onClick={() => {
                          const nueva: LineaDraft = m.tipo === 'ing'
                            ? { ingredienteId: m.id, cantidad: idx.ingredientes.get(m.id)?.unidadBase === 'pieza' ? 1 : 0.1 }
                            : { recetaId: m.id, cantidad: 0.1 };
                          mutate({ lineas: [...draft.lineas, nueva] });
                          setAddQ('');
                        }}
                      >
                        <span className="text-[14.5px] font-semibold">{m.nombre}</span>
                        <span className="text-[13px] text-ink-2">{m.meta}</span>
                      </button>
                    ))}
                    {matches.length === 0 && (
                      <div className="px-3.5 py-3 text-[13px] text-ink-3">
                        No hay ingredientes con ese nombre. Créalo primero en la pestaña Ingredientes.
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          </Seccion>

          <Seccion titulo="¿De dónde viene el costo?" abierta={open.costo} onToggle={() => setOpen((o) => ({ ...o, costo: !o.costo }))}>
            <div className="px-[18px] pb-5">
              {partesDona.length === 0 ? (
                <p className="text-[14px] text-ink-3">Agrega ingredientes y aquí verás qué tanto pesa cada uno en el costo.</p>
              ) : (
                <DonaCosto partes={partesDona} total={costo} />
              )}
            </div>
          </Seccion>

          <div className="rounded-[20px] border-[1.5px] border-line bg-card px-[18px] py-4">
            <div className="mb-3 text-[16px] font-bold">
              Ganancia real <span className="font-semibold text-ink-3">· ya con gastos de operación</span>
            </div>
            <div className="space-y-2 text-[14.5px]">
              <div className="flex justify-between"><span className="text-ink-2">Ingredientes</span><b className="tabular-nums">{fmt(costo)}</b></div>
              <div className="flex justify-between">
                <span className="text-ink-2">Operación de la cocina ({Math.round(tasa * 100)}%)</span>
                <b className="tabular-nums">{fmt(costo * tasa)}</b>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <span className="font-bold">Costo real</span>
                <span className="text-[16px] font-extrabold tabular-nums">{fmt(costoReal)}</span>
              </div>
            </div>
            {draft.esSubreceta || draft.precioVenta == null ? (
              <p className="mt-3.5 text-[13px] leading-normal text-ink-3">
                Costo real: {draft.rendimientoKg > 0 ? `${fmt(costoReal / draft.rendimientoKg)} / kg` : '—'}. La ganancia
                se calcula en las recetas donde se usa esta subreceta.
              </p>
            ) : (
              <div className="mt-3.5 flex items-baseline gap-2 rounded-[14px] bg-fill px-4 py-3.5">
                <span
                  className="text-[26px] font-extrabold tracking-[-0.5px] tabular-nums"
                  style={{ color: ganancia != null && ganancia > 0 ? '#656D30' : '#C0392B' }}
                >
                  {ganancia == null ? '—' : fmt(ganancia)}
                </span>
                <span className="text-[13.5px] font-semibold text-ink-2">
                  de ganancia por {draft.etiquetaSingular || 'pieza'}
                </span>
              </div>
            )}
            <p className="mt-2.5 text-[12px] text-ink-3">Tus gastos de operación se configuran en <b>Ajustes</b>.</p>
          </div>

          <Seccion titulo="Elaboración" cuenta={nPasos} abierta={open.elab} onToggle={() => setOpen((o) => ({ ...o, elab: !o.elab }))}>
            <div className="space-y-3 px-[18px] pb-[18px]">
              {draft.pasos.map((p, i) => (
                <div key={i} className="flex gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-choco-700 text-[13px] font-bold text-crema-100">
                    {i + 1}
                  </span>
                  <textarea
                    value={p}
                    rows={2}
                    onChange={(e) => mutate({ pasos: draft.pasos.map((x, xi) => (xi === i ? e.target.value : x)) })}
                    className="min-w-0 flex-1 resize-none rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[14.5px] leading-normal outline-none focus:border-burgundy-600"
                  />
                  <button
                    type="button"
                    className="flex-none self-start px-1 pt-2 text-ink-3"
                    onClick={() => mutate({ pasos: draft.pasos.filter((_, xi) => xi !== i) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex min-h-11 items-center text-[14px] font-bold text-ink-2"
                onClick={() => mutate({ pasos: [...draft.pasos, ''] })}
              >
                + Agregar paso
              </button>
            </div>
          </Seccion>

          <Seccion titulo="Alérgenos" cuenta={draft.alergenos.length} abierta={open.alerg} onToggle={() => setOpen((o) => ({ ...o, alerg: !o.alerg }))}>
            <div className="flex flex-wrap gap-2 px-[18px] pb-[18px]">
              {catalogo.alergenos.map((a) => {
                const activo = draft.alergenos.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      mutate({ alergenos: activo ? draft.alergenos.filter((x) => x !== a) : [...draft.alergenos, a] })
                    }
                    className="flex h-11 items-center rounded-full border-[1.5px] px-4 text-[14px] font-semibold"
                    style={
                      activo
                        ? { background: '#F1E2D9', color: '#9D2C34', borderColor: '#DCA795' }
                        : { background: 'var(--surface)', color: 'var(--ink-2)', borderColor: 'var(--line)' }
                    }
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Fotos" abierta={open.fotos} onToggle={() => setOpen((o) => ({ ...o, fotos: !o.fotos }))}>
            <div className="flex gap-2.5 px-[18px] pb-[18px]">
              {(receta?.fotos ?? []).map((f) => (
                <img key={f} src={f} alt="" className="h-[88px] w-[88px] rounded-2xl object-cover" />
              ))}
              <button
                type="button"
                className="grid h-[88px] w-[88px] flex-none place-items-center rounded-2xl border-[1.5px] border-dashed border-line text-[28px] text-ink-3"
              >
                +
              </button>
            </div>
          </Seccion>

          {!esNueva && (
            <>
              <Button
                block
                variant="salvia"
                className="h-[54px]"
                disabled={dirty}
                onClick={() => setProduccionAbierta(true)}
              >
                Produje esta receta
              </Button>
              {dirty && (
                <p className="text-center text-[12.5px] text-ink-3">Guarda tus cambios para descontar del inventario.</p>
              )}
              <Button block variant="outline" onClick={() => navigate(`/recetas/${id}/ficha`)}>
                Ver ficha técnica (PDF)
              </Button>
            </>
          )}
        </div>
      </div>

      {produccionAbierta && receta && (
        <HojaProduccion
          receta={receta}
          factor={factor}
          porciones={escalando ? paraPorciones : null}
          onClose={() => setProduccionAbierta(false)}
        />
      )}

      {confirmExit && (
        <ModalSalirSinGuardar
          nombre={draft.nombre || 'esta receta'}
          onSeguir={() => setConfirmExit(false)}
          onSalir={() => {
            setConfirmExit(false);
            salir();
          }}
        />
      )}
    </div>
  );
}
