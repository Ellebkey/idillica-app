// Alta de ingrediente — preguntas en el idioma de la cocina ("¿Cómo lo
// compras?"), con vista previa del costo en vivo e inventario inicial.
// Solo nombre, contenido y precio son obligatorios; el resto tiene defaults.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { HeaderDetalle } from '../../components';
import { fmt, unitShort, unitWord } from '../../lib/costeo';
import type { UnidadBase } from '../../api/catalogo.api';

const inputClass =
  'h-[50px] w-full rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[15.5px] outline-none placeholder:text-ink-3 focus:border-burgundy-600';
const inputNumClass =
  'h-[50px] w-full rounded-[14px] border-[1.5px] border-line bg-surface text-center text-[16px] font-bold tabular-nums outline-none placeholder:text-ink-3 focus:border-burgundy-600';

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[13px] font-semibold text-ink-2">{children}</div>;
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-[20px] border-[1.5px] border-line bg-card px-[18px] py-4 shadow-[0_2px_8px_rgba(94,26,25,0.05)]">
      {children}
    </div>
  );
}

export function NuevoIngredienteScreen() {
  const navigate = useNavigate();
  const { crearIngrediente } = useCatalogo();

  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState<UnidadBase>('kg');
  const [marca, setMarca] = useState('');
  const [presentacion, setPresentacion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [merma, setMerma] = useState('0');
  const [existencia, setExistencia] = useState('');
  const [minimo, setMinimo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => parseFloat(v) || 0;
  const cantidadNum = num(cantidad);
  const precioNum = num(precio);
  const mermaNum = Math.min(95, num(merma));
  const valido = nombre.trim() !== '' && cantidadNum > 0 && precioNum > 0;

  const preview = valido
    ? `Te saldrá en ${fmt(precioNum / cantidadNum / (1 - mermaNum / 100))} por ${unitWord(unidad)}${mermaNum > 0 ? ' (ya con desperdicio)' : ''}`
    : 'Completa nombre, presentación y precio para ver el costo.';

  async function guardar() {
    if (!valido || guardando) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const ing = await crearIngrediente({
        nombre: nombre.trim(),
        unidadBase: unidad,
        mermaPct: mermaNum,
        mermaOrigen: mermaNum > 0 ? 'manual' : 'referencia',
        existencia: num(existencia),
        minimo: num(minimo),
        productos: [{
          marca: marca.trim() || 'Sin marca',
          presentacion: presentacion.trim() || `${cantidadNum} ${unitShort(unidad)}`,
          cantidad: cantidadNum,
          precio: precioNum,
          proveedor: proveedor.trim(),
        }],
      });
      navigate(`/ingredientes/${ing.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setGuardando(false);
    }
  }

  const limpiaNum = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(e.target.value.replace(/[^0-9.]/g, ''));

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle titulo="Nuevo ingrediente" onBack={() => navigate('/ingredientes')} />
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-5 pb-8">
        <Tarjeta>
          <div>
            <Etiqueta>¿Cómo se llama?</Etiqueta>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Queso crema"
              className={`${inputClass} font-semibold`}
            />
          </div>
          <div>
            <Etiqueta>¿Cómo lo mides?</Etiqueta>
            <div className="flex rounded-[14px] bg-fill p-1">
              {(['kg', 'L', 'pieza'] as UnidadBase[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnidad(u)}
                  className={`flex-1 rounded-[11px] py-3 text-[14px] font-bold ${
                    unidad === u ? 'bg-card text-ink shadow-sm' : 'text-ink-3'
                  }`}
                >
                  {u === 'kg' ? 'Por kilo' : u === 'L' ? 'Por litro' : 'Por pieza'}
                </button>
              ))}
            </div>
          </div>
        </Tarjeta>

        <Tarjeta>
          <div className="text-[15px] font-bold">¿Cómo lo compras?</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Etiqueta>Marca</Etiqueta>
              <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="ej. Philadelphia" className={inputClass} />
            </div>
            <div>
              <Etiqueta>Presentación</Etiqueta>
              <input value={presentacion} onChange={(e) => setPresentacion(e.target.value)} placeholder="ej. Caja 1.36 kg" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Etiqueta>¿Cuánto trae? ({unitShort(unidad)})</Etiqueta>
              <input inputMode="decimal" value={cantidad} onChange={limpiaNum(setCantidad)} placeholder="1.36" className={inputNumClass} />
            </div>
            <div>
              <Etiqueta>¿Cuánto te cuesta?</Etiqueta>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold text-ink-2">$</span>
                <input inputMode="decimal" value={precio} onChange={limpiaNum(setPrecio)} placeholder="185.00" className={inputNumClass} />
              </div>
            </div>
          </div>
          <div>
            <Etiqueta>¿Dónde lo compras?</Etiqueta>
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="ej. Costco" className={inputClass} />
          </div>
        </Tarjeta>

        <Tarjeta>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Etiqueta>Desperdicio %</Etiqueta>
              <input inputMode="decimal" value={merma} onChange={limpiaNum(setMerma)} className={inputNumClass} />
            </div>
            <div>
              <Etiqueta>Tengo ({unitShort(unidad)})</Etiqueta>
              <input inputMode="decimal" value={existencia} onChange={limpiaNum(setExistencia)} placeholder="0" className={inputNumClass} />
            </div>
            <div>
              <Etiqueta>Mínimo ({unitShort(unidad)})</Etiqueta>
              <input inputMode="decimal" value={minimo} onChange={limpiaNum(setMinimo)} placeholder="0" className={inputNumClass} />
            </div>
          </div>
          <p className="text-[12.5px] leading-[1.45] text-ink-3">
            Si no conoces el desperdicio, déjalo en 0 — luego puedes medirlo con la báscula. El mínimo activa la
            alerta “queda poco”.
          </p>
        </Tarjeta>

        <div className="rounded-[14px] bg-fill px-3.5 py-3 text-[13.5px] font-semibold text-ink-2">{preview}</div>

        {error && <div className="text-[13px] font-bold text-rojo-600">{error}</div>}

        <button
          type="button"
          disabled={!valido || guardando}
          onClick={() => void guardar()}
          className="h-14 w-full rounded-2xl text-[17px] font-bold text-crema-100"
          style={{ background: valido ? '#9D2C34' : '#D9C6C8' }}
        >
          {guardando ? 'Guardando…' : 'Guardar ingrediente'}
        </button>
        <p className="pb-2 text-center text-[12.5px] text-ink-3">
          Después podrás medir su merma y agregar más marcas desde su detalle.
        </p>
      </div>
    </div>
  );
}
