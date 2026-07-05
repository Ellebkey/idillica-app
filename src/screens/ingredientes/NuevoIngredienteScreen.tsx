// Alta de ingrediente — nombre, unidad base y su primer producto de compra.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { Button, Field, HeaderDetalle } from '../../components';
import type { UnidadBase } from '../../api/catalogo.api';

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
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cantidadNum = parseFloat(cantidad);
  const precioNum = parseFloat(precio);
  const valido =
    nombre.trim() && marca.trim() && presentacion.trim()
    && Number.isFinite(cantidadNum) && cantidadNum > 0
    && Number.isFinite(precioNum) && precioNum > 0;

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
        productos: [{
          marca: marca.trim(),
          presentacion: presentacion.trim(),
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

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle titulo="Nuevo ingrediente" onBack={() => navigate('/ingredientes')} />
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pb-8">
        <Field label="Nombre" placeholder="Harina de trigo" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <div>
          <div className="mb-1.5 text-[13px] font-bold text-ink-2">Se compra y se usa por</div>
          <div className="flex gap-2">
            {(['kg', 'L', 'pieza'] as UnidadBase[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnidad(u)}
                className={`h-12 flex-1 rounded-2xl border-[1.5px] text-[14.5px] font-bold ${
                  unidad === u ? 'border-burgundy-600 bg-burgundy-600 text-crema-100' : 'border-line bg-card text-ink-2'
                }`}
              >
                {u === 'kg' ? 'Kilos' : u === 'L' ? 'Litros' : 'Piezas'}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 text-[15px] font-extrabold">Su producto de compra</div>
        <Field label="Marca" placeholder="Harinera Elizondo" value={marca} onChange={(e) => setMarca(e.target.value)} />
        <Field label="Presentación" placeholder="Bulto 44 kg" value={presentacion} onChange={(e) => setPresentacion(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={`Contenido (${unidad === 'pieza' ? 'pzas' : unidad})`}
            inputMode="decimal"
            placeholder="44"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          <Field
            label="Precio"
            prefix="$"
            inputMode="decimal"
            placeholder="780.00"
            value={precio}
            onChange={(e) => setPrecio(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>
        <Field label="Proveedor (opcional)" placeholder="Abarrotes La Central" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />

        {error && <div className="text-[13px] font-bold text-rojo-600">{error}</div>}

        <Button block disabled={!valido || guardando} onClick={() => void guardar()}>
          {guardando ? 'Guardando…' : 'Guardar ingrediente'}
        </Button>
        <p className="pb-2 text-center text-[12.5px] text-ink-3">
          Después podrás medir su merma y agregar más marcas desde su detalle.
        </p>
      </div>
    </div>
  );
}
