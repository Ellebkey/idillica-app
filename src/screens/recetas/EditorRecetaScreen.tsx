// Editor de receta — la pantalla más compleja del handoff: BarraCostoSticky
// en vivo, secciones colapsables, autocomplete de ingredientes, DonaCosto,
// Ganancia real (con gastos de operación) y modal de salida sin guardar.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import {
  Button, DonaCosto, EstadoVacio, Field, HeaderDetalle, ModalSalirSinGuardar, Skeleton, Stepper, ToggleUnidad,
} from '../../components';
import {
  SEM, costoIngrediente, costoReceta, fmt, fmtQty, nivel, norm, tasaOperacion,
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

function Seccion({ titulo, abierta, onToggle, children }: {
  titulo: string; abierta: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border-[1.5px] border-line bg-card shadow-[0_2px_8px_rgba(94,26,25,0.05)]">
      <button type="button" onClick={onToggle} className="flex h-14 w-full items-center justify-between px-4">
        <span className="text-[15.5px] font-extrabold">{titulo}</span>
        <span className="text-[20px] font-bold text-ink-3">{abierta ? '−' : '+'}</span>
      </button>
      {abierta && <div className="border-t-[1.5px] border-line px-4 py-4">{children}</div>}
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
  const [open, setOpen] = useState({ datos: true, ing: true, costo: true, ganancia: true, elab: false, alerg: false, fotos: false });

  // Inicializa el borrador cuando llega el catálogo
  if (catalogo && draft === null && (esNueva || receta)) {
    setDraft(draftDe(receta, catalogo.categorias[0] ?? 'Pasteles'));
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
  const ganancia = draft.precioVenta != null ? (draft.precioVenta - costoReal) / (draft.porciones || 1) : null;

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
          .map((i) => ({ tipo: 'ing' as const, id: i.id, nombre: i.nombre, meta: `${fmt(costoIngrediente(i))} / ${i.unidadBase === 'pieza' ? 'pza' : i.unidadBase}` })),
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
      ivaPct: 16,
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

  const semColor = pct == null ? '#6E6A5E' : SEM[n].solid;

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

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-10">
        {/* BarraCostoSticky */}
        <div className="sticky top-0 z-10 -mx-1 mb-4 rounded-[18px] bg-choco-700 px-4 py-3 text-crema-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold tracking-wide text-crema-100/60 uppercase">Costo total</div>
              <div className="text-[20px] font-extrabold tabular-nums">{fmt(costo)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-crema-100/60 uppercase">
                Por {draft.esSubreceta ? 'kilo' : draft.etiquetaSingular}
              </div>
              <div className="text-[20px] font-extrabold tabular-nums">{fmt(porUnidad)}</div>
            </div>
            <span className="rounded-full px-3 py-1.5 text-[14px] font-extrabold text-white" style={{ background: semColor }}>
              {pct == null ? '—' : `${Math.round(pct)}%`}
            </span>
          </div>
        </div>

        {errorGuardar && (
          <div className="mb-3 rounded-2xl bg-rojo-100 px-4 py-3 text-[13.5px] font-bold text-rojo-600">{errorGuardar}</div>
        )}

        <div className="space-y-3">
          <Seccion titulo="Datos" abierta={open.datos} onToggle={() => setOpen((o) => ({ ...o, datos: !o.datos }))}>
            <div className="space-y-3.5">
              <Field label="Nombre" value={draft.nombre} placeholder="Nombre de la receta" onChange={(e) => mutate({ nombre: e.target.value })} />
              <div>
                <div className="mb-1.5 text-[13px] font-bold text-ink-2">Categoría</div>
                <div className="flex flex-wrap gap-2">
                  {catalogo.categorias.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => mutate({ categoria: c })}
                      className={`h-10 rounded-full border-[1.5px] px-3.5 text-[13.5px] font-bold ${
                        draft.categoria === c ? 'border-choco-700 bg-choco-700 text-crema-100' : 'border-line bg-card text-ink-2'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-bold text-ink-2">Porciones</div>
                <Stepper valor={draft.porciones} onChange={(v) => mutate({ porciones: v })} />
              </div>
              <Field label="Etiqueta de porción" value={draft.etiqueta} placeholder="piezas, rebanadas…" onChange={(e) => mutate({ etiqueta: e.target.value, etiquetaSingular: e.target.value.replace(/s$/, '') })} />
              <div>
                <div className="mb-1.5 text-[13px] font-bold text-ink-2">Rendimiento</div>
                <div className="flex items-center gap-3">
                  <Field
                    inputMode="decimal"
                    value={draft.rendimientoKg > 0 ? String(rendEnGr ? Math.round(draft.rendimientoKg * 1000) : draft.rendimientoKg) : ''}
                    placeholder="0"
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                      mutate({ rendimientoKg: rendEnGr ? v / 1000 : v });
                    }}
                  />
                  <ToggleUnidad opciones={['g', 'kg']} valor={rendEnGr ? 'g' : 'kg'} onChange={(u) => setRendEnGr(u === 'g')} />
                </div>
              </div>
              <div>
                <Field
                  label="Precio de venta"
                  prefix="$"
                  inputMode="decimal"
                  disabled={draft.esSubreceta}
                  value={draft.precioVenta != null ? String(draft.precioVenta) : ''}
                  placeholder={draft.esSubreceta ? '—' : '0.00'}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                    mutate({ precioVenta: Number.isFinite(v) && v > 0 ? v : null });
                  }}
                />
                {draft.esSubreceta && (
                  <p className="mt-1 text-[12.5px] text-ink-3">Se vende dentro de otras recetas.</p>
                )}
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

          <Seccion titulo="Ingredientes" abierta={open.ing} onToggle={() => setOpen((o) => ({ ...o, ing: !o.ing }))}>
            <div className="space-y-2">
              {draft.lineas.map((l, i) => {
                const ing = l.ingredienteId ? idx.ingredientes.get(l.ingredienteId) : undefined;
                const sub = l.recetaId ? idx.recetas.get(l.recetaId) : undefined;
                const costoLinea = ing
                  ? l.cantidad * costoIngrediente(ing)
                  : sub && sub.rendimientoKg > 0 ? (l.cantidad / sub.rendimientoKg) * costoReceta(idx, sub.id) : 0;
                const dominante = costo > 0 && costoLinea / costo > 0.6;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border-[1.5px] px-3.5 py-3 ${
                      sub ? 'border-[#E3D3E5] bg-[#F6EFF7]' : 'border-line bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-[14.5px] font-bold"
                        onClick={() => navigate(ing ? `/ingredientes/${ing.id}` : sub ? `/recetas/${sub.id}` : '#')}
                      >
                        {sub ? `◆ ${sub.nombre}` : ing?.nombre ?? '—'}
                      </button>
                      <input
                        inputMode="decimal"
                        className="w-20 flex-none rounded-lg bg-fill px-2 py-1.5 text-center text-[13.5px] font-bold outline-none"
                        value={String(l.cantidad)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                          mutate({ lineas: draft.lineas.map((x, xi) => (xi === i ? { ...x, cantidad: v } : x)) });
                        }}
                      />
                      <span className="w-8 flex-none text-[12px] text-ink-3">
                        {ing ? (ing.unidadBase === 'pieza' ? 'pza' : ing.unidadBase) : 'kg'}
                      </span>
                      <span className="flex-none text-[15px] font-extrabold tabular-nums">{fmt(costoLinea)}</span>
                      <button
                        type="button"
                        aria-label="Quitar línea"
                        className="flex-none px-1 text-[15px] font-bold text-ink-3"
                        onClick={() => mutate({ lineas: draft.lineas.filter((_, xi) => xi !== i) })}
                      >
                        ✕
                      </button>
                    </div>
                    {ing && <div className="mt-0.5 text-[12px] text-ink-3">{fmtQty(l.cantidad, ing.unidadBase)}</div>}
                    {sub && dominante && (
                      <div className="mt-1 text-[12.5px] font-bold text-rojo-600">
                        {Math.round((costoLinea / costo) * 100)}% del costo de esta receta
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="relative">
                <input
                  value={addQ}
                  onChange={(e) => setAddQ(e.target.value)}
                  placeholder="+ Agregar ingrediente… escribe para buscar"
                  className="w-full rounded-2xl border-[1.5px] border-dashed border-line bg-transparent px-4 py-3.5 text-[14px] font-bold outline-none placeholder:text-ink-3"
                />
                {matches.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border-[1.5px] border-line bg-card shadow-lg">
                    {matches.map((m) => (
                      <button
                        key={`${m.tipo}-${m.id}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b-[1.5px] border-line px-4 py-3 text-left last:border-b-0"
                        onClick={() => {
                          const nueva: LineaDraft = m.tipo === 'ing'
                            ? { ingredienteId: m.id, cantidad: idx.ingredientes.get(m.id)?.unidadBase === 'pieza' ? 1 : 0.1 }
                            : { recetaId: m.id, cantidad: 0.1 };
                          mutate({ lineas: [...draft.lineas, nueva] });
                          setAddQ('');
                        }}
                      >
                        <span className="text-[14px] font-bold">{m.nombre}</span>
                        <span className="text-[12.5px] text-ink-3">{m.meta}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Seccion>

          <Seccion titulo="¿De dónde viene el costo?" abierta={open.costo} onToggle={() => setOpen((o) => ({ ...o, costo: !o.costo }))}>
            {partesDona.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">Agrega ingredientes y aquí verás qué se lleva tu dinero.</p>
            ) : (
              <DonaCosto partes={partesDona} total={costo} />
            )}
          </Seccion>

          <Seccion titulo="Ganancia real · ya con gastos de operación" abierta={open.ganancia} onToggle={() => setOpen((o) => ({ ...o, ganancia: !o.ganancia }))}>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between"><span className="text-ink-2">Ingredientes</span><b className="tabular-nums">{fmt(costo)}</b></div>
              <div className="flex justify-between">
                <span className="text-ink-2">Operación de la cocina ({Math.round(tasa * 100)}%)</span>
                <b className="tabular-nums">{fmt(costo * tasa)}</b>
              </div>
              <div className="flex justify-between border-t-[1.5px] border-line pt-2">
                <span className="font-extrabold">Costo real</span><b className="tabular-nums">{fmt(costoReal)}</b>
              </div>
              {draft.esSubreceta ? (
                <div className="rounded-2xl bg-crema-200 p-4 text-center dark:bg-fill">
                  <div className="text-[13px] text-ink-2">Costo real por kilo</div>
                  <div className="text-[26px] font-extrabold tabular-nums">
                    {fmt(draft.rendimientoKg > 0 ? costoReal / draft.rendimientoKg : 0)}
                  </div>
                  <div className="text-[12.5px] text-ink-3">Úsalo para decidir el precio de lo que la lleve.</div>
                </div>
              ) : (
                <div className="rounded-2xl bg-crema-200 p-4 text-center dark:bg-fill">
                  <div className="text-[13px] text-ink-2">Ganancia por {draft.etiquetaSingular}</div>
                  <div
                    className="text-[26px] font-extrabold tabular-nums"
                    style={{ color: ganancia != null && ganancia > 0 ? '#656D30' : '#C0392B' }}
                  >
                    {ganancia == null ? '—' : fmt(ganancia)}
                  </div>
                </div>
              )}
              <p className="text-[12px] text-ink-3">Tus gastos de operación se configuran en <b>Ajustes</b>.</p>
            </div>
          </Seccion>

          <Seccion titulo="Elaboración" abierta={open.elab} onToggle={() => setOpen((o) => ({ ...o, elab: !o.elab }))}>
            <div className="space-y-2.5">
              {draft.pasos.map((p, i) => (
                <div key={i} className="flex gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-choco-700 text-[13px] font-extrabold text-crema-100">
                    {i + 1}
                  </span>
                  <textarea
                    value={p}
                    rows={2}
                    onChange={(e) => mutate({ pasos: draft.pasos.map((x, xi) => (xi === i ? e.target.value : x)) })}
                    className="min-w-0 flex-1 resize-none rounded-xl border-[1.5px] border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-burgundy-600"
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
                className="w-full rounded-2xl border-[1.5px] border-dashed border-line py-3 text-[14px] font-bold text-ink-2"
                onClick={() => mutate({ pasos: [...draft.pasos, ''] })}
              >
                + Agregar paso
              </button>
            </div>
          </Seccion>

          <Seccion titulo="Alérgenos" abierta={open.alerg} onToggle={() => setOpen((o) => ({ ...o, alerg: !o.alerg }))}>
            <div className="flex flex-wrap gap-2">
              {catalogo.alergenos.map((a) => {
                const activo = draft.alergenos.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      mutate({ alergenos: activo ? draft.alergenos.filter((x) => x !== a) : [...draft.alergenos, a] })
                    }
                    className="h-11 rounded-full border-[1.5px] px-3.5 text-[13.5px] font-bold"
                    style={
                      activo
                        ? { background: '#F1E2D9', color: '#9D2C34', borderColor: '#DCA795' }
                        : { borderColor: 'var(--line)', color: 'var(--ink-2)' }
                    }
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Fotos" abierta={open.fotos} onToggle={() => setOpen((o) => ({ ...o, fotos: !o.fotos }))}>
            <div className="flex gap-3">
              {(receta?.fotos ?? []).map((f) => (
                <img key={f} src={f} alt="" className="h-[88px] w-[88px] rounded-2xl object-cover" />
              ))}
              <button
                type="button"
                className="grid h-[88px] w-[88px] flex-none place-items-center rounded-2xl border-[1.5px] border-dashed border-line text-[26px] text-ink-3"
              >
                +
              </button>
            </div>
          </Seccion>

          {!esNueva && (
            <Button block variant="outline" onClick={() => navigate(`/recetas/${id}/ficha`)}>
              Ver ficha técnica (PDF)
            </Button>
          )}
        </div>
      </div>

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
