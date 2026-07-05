// Ajustes — perfil, food cost objetivo (slider que mueve TODOS los semáforos),
// gastos de operación con resumen vivo, tema y miembros.
import { useEffect, useMemo, useState } from 'react';
import { useCatalogo } from '../../state/CatalogoContext';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, Skeleton } from '../../components';
import { fmt } from '../../lib/costeo';
import { isDark, setDark } from '../../lib/theme';
import { useDebouncedValue } from '../../hooks/useFetch';

const CAMPOS_OPEX = [
  { key: 'gastoSueldos', label: 'Sueldos' },
  { key: 'gastoGas', label: 'Gas' },
  { key: 'gastoLuz', label: 'Luz' },
  { key: 'gastoEquipo', label: 'Desgaste de equipo' },
  { key: 'comprasIngredientesMes', label: 'Compras de ingredientes', sub: 'lo que gastas en insumos al mes' },
] as const;

type CampoOpex = (typeof CAMPOS_OPEX)[number]['key'];

export function AjustesScreen() {
  const { catalogo, loading, actualizarCocina } = useCatalogo();
  const { username, fullname, logout } = useAuth();

  const [objetivo, setObjetivo] = useState(30);
  const [opex, setOpex] = useState<Record<CampoOpex, string>>({
    gastoSueldos: '', gastoGas: '', gastoLuz: '', gastoEquipo: '', comprasIngredientesMes: '',
  });
  const [dark, setDarkState] = useState(isDark());
  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    if (catalogo && !inicializado) {
      setObjetivo(Math.round(catalogo.cocina.foodCostObjetivo * 100));
      setOpex({
        gastoSueldos: String(catalogo.cocina.gastoSueldos || ''),
        gastoGas: String(catalogo.cocina.gastoGas || ''),
        gastoLuz: String(catalogo.cocina.gastoLuz || ''),
        gastoEquipo: String(catalogo.cocina.gastoEquipo || ''),
        comprasIngredientesMes: String(catalogo.cocina.comprasIngredientesMes || ''),
      });
      setInicializado(true);
    }
  }, [catalogo, inicializado]);

  // Persistencia con debounce: el slider y los campos guardan solos
  const objetivoDebounced = useDebouncedValue(objetivo, 500);
  const opexDebounced = useDebouncedValue(opex, 600);

  useEffect(() => {
    if (!inicializado || !catalogo) {
      return;
    }
    const fraccion = objetivoDebounced / 100;
    if (Math.abs(fraccion - catalogo.cocina.foodCostObjetivo) > 0.001) {
      void actualizarCocina({ foodCostObjetivo: fraccion });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivoDebounced]);

  useEffect(() => {
    if (!inicializado || !catalogo) {
      return;
    }
    const num = (v: string) => parseFloat(v) || 0;
    const cambios = {
      gastoSueldos: num(opexDebounced.gastoSueldos),
      gastoGas: num(opexDebounced.gastoGas),
      gastoLuz: num(opexDebounced.gastoLuz),
      gastoEquipo: num(opexDebounced.gastoEquipo),
      comprasIngredientesMes: num(opexDebounced.comprasIngredientesMes),
    };
    const distinto = (Object.keys(cambios) as CampoOpex[]).some(
      (k) => Math.abs(cambios[k] - catalogo.cocina[k]) > 0.001,
    );
    if (distinto) {
      void actualizarCocina(cambios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opexDebounced]);

  const resumenOpex = useMemo(() => {
    const num = (v: string) => parseFloat(v) || 0;
    const gastos = num(opex.gastoSueldos) + num(opex.gastoGas) + num(opex.gastoLuz) + num(opex.gastoEquipo);
    const compras = num(opex.comprasIngredientesMes);
    if (compras <= 0) {
      return null;
    }
    return (gastos / compras) * 100;
  }, [opex]);

  if (loading || !catalogo) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pt-5 pb-8">
      <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Ajustes</h1>

      <Card className="flex items-center gap-3.5 p-4">
        <img src="/logo-crema.png" alt="" className="h-14 w-14 flex-none rounded-2xl bg-burgundy-600 object-contain p-1.5" />
        <div className="min-w-0">
          <div className="text-[16px] font-extrabold">{catalogo.cocina.name}</div>
          <div className="text-[13px] text-ink-2">Guadalajara, Jalisco · Plan Cocina</div>
        </div>
      </Card>

      <Card className="divide-y-[1.5px] divide-[color:var(--line)] px-4">
        <div className="flex h-14 items-center justify-between">
          <span className="text-[14.5px] font-bold">Moneda</span>
          <span className="text-[14.5px] font-bold text-ink-2">{catalogo.cocina.moneda}</span>
        </div>
        <div className="flex h-14 items-center justify-between">
          <span className="text-[14.5px] font-bold">IVA por defecto</span>
          <span className="text-[14.5px] font-bold text-ink-2">{Math.round(catalogo.cocina.impuestoDefault * 100)}%</span>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-extrabold">Food cost objetivo</span>
          <span className="text-[20px] font-extrabold text-burgundy-600 tabular-nums">{objetivo}%</span>
        </div>
        <input
          type="range"
          min={25}
          max={45}
          value={objetivo}
          onChange={(e) => setObjetivo(Number(e.target.value))}
          className="mt-3 w-full accent-burgundy-600"
        />
        <p className="mt-2 text-[12.5px] text-ink-3">
          Verde hasta {objetivo}% · ámbar de {objetivo} a {objetivo + 10}% · rojo arriba de {objetivo + 10}%.
          El semáforo de toda la app usa este objetivo.
        </p>
      </Card>

      <Card className="p-4">
        <div className="text-[15px] font-extrabold">
          Gastos de operación <span className="font-semibold text-ink-3">· al mes</span>
        </div>
        <div className="mt-2 divide-y-[1.5px] divide-[color:var(--line)]">
          {CAMPOS_OPEX.map(({ key, label, ...resto }) => (
            <div key={key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold">{label}</div>
                {'sub' in resto && <div className="text-[12px] text-ink-3">{resto.sub}</div>}
              </div>
              <label className="flex h-11 w-32 flex-none items-center gap-1 rounded-xl border-[1.5px] border-line bg-card px-3">
                <span className="font-bold text-ink-3">$</span>
                <input
                  inputMode="numeric"
                  value={opex[key]}
                  onChange={(e) => setOpex((prev) => ({ ...prev, [key]: e.target.value.replace(/[^0-9.]/g, '') }))}
                  className="w-full bg-transparent text-right text-[14.5px] font-bold tabular-nums outline-none"
                />
              </label>
            </div>
          ))}
        </div>
        {resumenOpex != null && (
          <div className="mt-3 rounded-2xl bg-crema-200 p-3.5 text-[13.5px] text-ink-2 dark:bg-fill">
            Por cada <b>$100</b> de ingredientes, tu cocina gasta <b>{fmt(resumenOpex)}</b> en operar.
            Ese extra se suma al costo real de cada receta.
          </div>
        )}
      </Card>

      <Card className="flex items-center justify-between p-4">
        <span className="text-[14.5px] font-bold">Tema</span>
        <div className="flex gap-1 rounded-xl bg-fill p-1">
          {(['Claro', 'Oscuro'] as const).map((t) => {
            const activo = (t === 'Oscuro') === dark;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const d = t === 'Oscuro';
                  setDark(d);
                  setDarkState(d);
                }}
                className={`rounded-[10px] px-4 py-2 text-[13px] font-bold ${activo ? 'bg-card text-ink shadow-sm' : 'text-ink-3'}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-[15px] font-extrabold">Miembros</div>
        <div className="mt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14.5px] font-bold">{fullname || 'Idílica'}</span>
            <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: '#F1E2D9', color: '#9D2C34' }}>
              {catalogo.cocina.rol === 'owner' ? 'Dueña' : 'Editor'}
            </span>
          </div>
          <div className="text-[13px] text-ink-3">{username}</div>
          <button type="button" className="text-[13.5px] font-bold text-burgundy-600">+ Invitar a alguien</button>
        </div>
      </Card>

      <Card className="p-4">
        <button type="button" className="w-full text-left text-[14.5px] font-bold">Importar mi Excel</button>
        <p className="mt-1 text-[12.5px] text-ink-3">Muy pronto: tus recetas de siempre, ya costeadas.</p>
      </Card>

      <Button block variant="danger" onClick={logout}>Cerrar sesión</Button>

      <div className="pb-2 text-center text-[11.5px] text-ink-3">Idílica v{__APP_VERSION__}</div>
    </div>
  );
}
