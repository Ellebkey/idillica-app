// Detalle de ingrediente — costo protagonista, productos de compra (EN USO),
// historial con tendencia, merma y usos recursivos en recetas.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import {
  BadgeMerma, Button, Card, EstadoVacio, Expander, HeaderDetalle, HojaNuevoPrecio,
} from '../../components';
import {
  costoIngrediente, costoReceta, fmt, fmtQty, productoActivo, unitWord, usaIngrediente,
} from '../../lib/costeo';
import { agregarProducto as apiAgregarProducto, type ProductoInput } from '../../api/catalogo.api';

export function IngredienteDetalleScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { catalogo, idx, activarProducto, reload } = useCatalogo();
  const [sheet, setSheet] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [agregando, setAgregando] = useState(false);

  const ing = catalogo?.ingredientes.find((i) => i.id === id);

  const usos = useMemo(() => {
    if (!catalogo || !idx || !ing) {
      return [];
    }
    return catalogo.recetas
      .filter((r) => usaIngrediente(idx, r.id, ing.id))
      .map((r) => {
        const directa = r.lineas.find((l) => l.ingredienteId === ing.id);
        const via = !directa
          ? catalogo.recetas.find(
              (sub) => r.lineas.some((l) => l.recetaId === sub.id) && usaIngrediente(idx, sub.id, ing.id),
            )
          : undefined;
        return { receta: r, directa, via };
      });
  }, [catalogo, idx, ing]);

  if (!catalogo || !ing) {
    return <EstadoVacio titulo="Ingrediente no encontrado" />;
  }

  const activo = productoActivo(ing);
  const costo = costoIngrediente(ing);
  const historial = (activo?.historial ?? []).slice(-8);
  const primera = historial[0]?.precio ?? 0;
  const ultima = historial[historial.length - 1]?.precio ?? 0;
  const tendencia = primera > 0 ? ((ultima - primera) / primera) * 100 : 0;
  const maxPrecio = Math.max(...historial.map((h) => h.precio), 1);
  const usosVisibles = verTodos ? usos : usos.slice(0, 4);

  async function agregarOtroProducto() {
    // Alta rápida vía prompts nativos (la pantalla dedicada llega después);
    // persiste de inmediato en el backend.
    const marca = window.prompt('Marca del producto:');
    if (!marca) return;
    const presentacion = window.prompt('Presentación (ej. "Bulto 44 kg"):') ?? '';
    const cantidad = parseFloat(window.prompt(`Contenido en ${unitWord(ing!.unidadBase)}s (ej. 44):`) ?? '');
    const precio = parseFloat(window.prompt('Precio ($):') ?? '');
    if (!presentacion || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precio) || precio <= 0) {
      return;
    }
    const proveedor = window.prompt('Proveedor (opcional):') ?? '';
    setAgregando(true);
    try {
      const input: ProductoInput = { marca, presentacion, cantidad, precio, proveedor };
      await apiAgregarProducto(ing!.id, input);
      await reload();
    } finally {
      setAgregando(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle
        titulo={ing.nombre}
        onBack={() => navigate('/ingredientes')}
        right={
          <Button sm onClick={() => setSheet(true)}>$ Nuevo precio</Button>
        }
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pb-8">
        <div className="pt-1 text-center">
          <div className="text-[44px] font-extrabold tracking-[-1.5px] tabular-nums">{fmt(costo)}</div>
          <div className="text-[14px] text-ink-2">
            por {unitWord(ing.unidadBase)}{ing.merma.pct > 0 ? ' (ya con desperdicio)' : ''}
          </div>
        </div>

        <section>
          <h2 className="mb-2 text-[15px] font-extrabold">
            Productos de compra <span className="font-semibold text-ink-3">· el activo alimenta tus costos</span>
          </h2>
          <div className="space-y-2.5">
            {ing.productos.map((p) => (
              <Card
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 p-4 ${p.activo ? 'border-2 border-burgundy-600' : ''}`}
                onClick={() => !p.activo && void activarProducto(ing.id, p.id)}
              >
                <span
                  className={`grid h-5 w-5 flex-none place-items-center rounded-full border-2 ${
                    p.activo ? 'border-burgundy-600' : 'border-line'
                  }`}
                >
                  {p.activo && <span className="h-2.5 w-2.5 rounded-full bg-burgundy-600" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{p.marca}</span>
                    {p.activo && (
                      <span className="flex-none rounded-full bg-burgundy-600 px-2 py-0.5 text-[10.5px] font-extrabold text-crema-100">
                        EN USO
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[13px] text-ink-2">
                    {p.presentacion} · {fmt(p.precio)}{p.proveedor ? ` · ${p.proveedor}` : ''}
                  </div>
                </div>
                <div className="flex-none text-[14.5px] font-extrabold tabular-nums">
                  {p.cantidad > 0 ? `${fmt(p.precio / p.cantidad)}/${ing.unidadBase === 'pieza' ? 'pza' : ing.unidadBase}` : '—'}
                </div>
              </Card>
            ))}
            <button
              type="button"
              disabled={agregando}
              onClick={() => void agregarOtroProducto()}
              className="w-full rounded-[20px] border-[1.5px] border-dashed border-line py-3.5 text-[14px] font-bold text-ink-2"
            >
              + Agregar otro producto
            </button>
          </div>
        </section>

        {historial.length > 1 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[15px] font-extrabold">Historial de precio</h2>
              <span
                className="text-[13px] font-bold"
                style={{ color: tendencia > 0 ? '#C0392B' : '#656D30' }}
              >
                {tendencia > 0 ? '▲' : '▼'} {Math.abs(Math.round(tendencia))}% este año
              </span>
            </div>
            <Card className="p-4">
              <div className="flex h-24 items-end gap-2">
                {historial.map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(8, (h.precio / maxPrecio) * 80)}px`,
                        background: i === historial.length - 1 ? '#9D2C34' : '#E0D5BD',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
                {historial.map((h, i) => (
                  <span key={i} className="flex-1 text-center">
                    {i % 2 === 0 || i === historial.length - 1
                      ? new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(new Date(h.fecha)).replace('.', '')
                      : ''}
                  </span>
                ))}
              </div>
            </Card>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-[15px] font-extrabold">Desperdicio (merma)</h2>
          <Card className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[20px] font-extrabold">{Math.round(ing.merma.pct)}%</div>
              <BadgeMerma pct={ing.merma.pct} origen={ing.merma.origen} />
            </div>
            <Button sm variant="outline" onClick={() => navigate(`/ingredientes/${ing.id}/merma`)}>
              Medir merma
            </Button>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-extrabold">Se usa en {usos.length} receta{usos.length === 1 ? '' : 's'}</h2>
          <div className="space-y-2">
            {usosVisibles.map(({ receta, directa, via }) => (
              <Card
                key={receta.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3"
                onClick={() => navigate(`/recetas/${receta.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-bold">{receta.nombre}</div>
                  <div className="text-[12.5px] text-ink-2">
                    {directa ? fmtQty(directa.cantidad, ing.unidadBase) : via ? `vía ${via.nombre}` : 'vía subreceta'}
                  </div>
                </div>
                {idx && <span className="flex-none text-[13.5px] font-bold tabular-nums">{fmt(costoReceta(idx, receta.id))}</span>}
                <span className="text-ink-3">›</span>
              </Card>
            ))}
          </div>
          <Expander abierto={verTodos} restantes={usos.length - 4} onToggle={() => setVerTodos((v) => !v)} />
        </section>
      </div>

      {sheet && <HojaNuevoPrecio ingrediente={ing} onClose={() => setSheet(false)} />}
    </div>
  );
}
