// Wizard medir merma — 3 pasos con báscula + resultado con dona.
// merma% = round((1 − (limpia + aprovechado) / entera) × 100), clamp 0–95.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogo } from '../../state/CatalogoContext';
import { Button, EstadoVacio, HeaderDetalle, ToggleUnidad } from '../../components';
import { costoIngrediente, fmt, productoActivo } from '../../lib/costeo';

const PASOS = [
  { titulo: 'Pésalo entero, tal como lo compras.', pregunta: '¿Cuánto marcó la báscula?' },
  { titulo: 'Límpialo como siempre.', pregunta: '¿Cuánto pesó ya limpio?' },
  { titulo: '¿Aprovechaste algo del desperdicio?', pregunta: 'Por ejemplo, cáscara para té o almíbar.' },
];

function aKg(valor: string, unidad: string): number {
  const n = parseFloat(valor) || 0;
  return unidad === 'g' ? n / 1000 : n;
}

export function WizardMermaScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { catalogo, guardarMermaMedida } = useCatalogo();

  const [paso, setPaso] = useState(1);
  const [valores, setValores] = useState(['', '', '0']);
  const [unidades, setUnidades] = useState(['kg', 'kg', 'g']);
  const [resultado, setResultado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const ing = catalogo?.ingredientes.find((i) => i.id === id);

  const entera = aKg(valores[0], unidades[0]);
  const limpia = aKg(valores[1], unidades[1]);
  const aprovechado = aKg(valores[2], unidades[2]);

  const pct = useMemo(() => {
    if (entera <= 0) {
      return 0;
    }
    return Math.min(95, Math.max(0, Math.round((1 - (limpia + aprovechado) / entera) * 100)));
  }, [entera, limpia, aprovechado]);

  const costoNuevo = useMemo(() => {
    if (!ing) return 0;
    const prod = productoActivo(ing);
    if (!prod || prod.cantidad <= 0) return 0;
    return prod.precio / prod.cantidad / (1 - pct / 100);
  }, [ing, pct]);

  if (!ing) {
    return <EstadoVacio titulo="Ingrediente no encontrado" />;
  }

  const valorActual = valores[paso - 1];
  const puedeAvanzar = paso === 3 || aKg(valorActual, unidades[paso - 1]) > 0;

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    try {
      await guardarMermaMedida(ing!.id, { pesoEntero: entera, pesoLimpio: limpia, aprovechado });
      navigate(`/ingredientes/${ing!.id}`, { replace: true });
    } finally {
      setGuardando(false);
    }
  }

  if (resultado) {
    const usable = 1 - pct / 100;
    return (
      <div className="flex h-full flex-col bg-surface">
        <HeaderDetalle titulo="Resultado" onBack={() => setResultado(false)} />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-auto px-6 pb-10 text-center">
          <div
            className="grid h-[150px] w-[150px] place-items-center rounded-full"
            style={{ background: `conic-gradient(#9D2C34 0deg ${pct * 3.6}deg, #656D30 ${pct * 3.6}deg 360deg)` }}
          >
            <div className="grid h-[106px] w-[106px] place-items-center rounded-full bg-card">
              <span className="text-[15px] font-extrabold">Merma</span>
            </div>
          </div>
          <div className="text-[26px] font-extrabold">Merma: {pct}%</div>
          <p className="max-w-[300px] text-[15px] text-ink-2">
            De cada kilo de {ing.nombre.toLowerCase()} que compras, usas {Math.round(usable * 1000)} g.
          </p>
          <p className="max-w-[300px] text-[13.5px] text-ink-3">
            Tus costos usarán este dato: el kilo te sale en <b>{fmt(costoNuevo)}</b> ya con desperdicio
            {costoIngrediente(ing) !== costoNuevo ? ` (antes ${fmt(costoIngrediente(ing))})` : ''}.
          </p>
          <Button block variant="salvia" className="max-w-[320px]" disabled={guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : `Guardar en ${ing.nombre}`}
          </Button>
        </div>
      </div>
    );
  }

  const info = PASOS[paso - 1];

  return (
    <div className="flex h-full flex-col bg-surface">
      <HeaderDetalle
        titulo={`Medir merma · ${ing.nombre}`}
        onBack={() => (paso > 1 ? setPaso(paso - 1) : navigate(`/ingredientes/${ing.id}`))}
      />

      <div className="flex justify-center gap-2 pb-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="h-2 w-2 rounded-full"
            style={{ background: n <= paso ? '#9D2C34' : 'var(--crema-300)' }}
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-auto px-6 pb-10">
        <div className="text-center">
          <h2 className="text-[20px] font-extrabold">{info.titulo}</h2>
          <p className="mt-1 text-[14.5px] text-ink-2">{info.pregunta}</p>
        </div>

        <div className="flex w-full max-w-[340px] items-center gap-3">
          <label className="flex h-[84px] min-w-0 flex-1 items-center justify-center rounded-[20px] border-2 border-burgundy-600 bg-card px-4">
            <input
              autoFocus
              inputMode="decimal"
              value={valorActual}
              onChange={(e) =>
                setValores((prev) => prev.map((v, i) => (i === paso - 1 ? e.target.value.replace(/[^0-9.]/g, '') : v)))
              }
              placeholder="0"
              className="w-full bg-transparent text-center text-[42px] font-extrabold tabular-nums outline-none placeholder:text-ink-3"
            />
          </label>
          <ToggleUnidad
            vertical
            opciones={['g', 'kg']}
            valor={unidades[paso - 1]}
            onChange={(u) => setUnidades((prev) => prev.map((x, i) => (i === paso - 1 ? u : x)))}
          />
        </div>

        <div className="w-full max-w-[340px] space-y-2.5">
          <Button
            block
            disabled={!puedeAvanzar}
            onClick={() => (paso < 3 ? setPaso(paso + 1) : setResultado(true))}
          >
            {paso < 3 ? 'Siguiente' : 'Ver resultado'}
          </Button>
          {paso === 3 && (
            <button
              type="button"
              className="block w-full py-2 text-center text-[14px] font-bold text-ink-2"
              onClick={() => {
                setValores((prev) => prev.map((v, i) => (i === 2 ? '0' : v)));
                setResultado(true);
              }}
            >
              Saltar este paso
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
