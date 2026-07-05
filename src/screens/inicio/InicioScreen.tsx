// Inicio — fecha + saludo, búsqueda global mixta, 3 stat-cards, lista
// "Necesitan tu atención" (computada) y FAB "+".
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../auth/AuthContext';
import { useCatalogo } from '../../state/CatalogoContext';
import { Buscador, Card, EstadoVacio, Icon, Skeleton, Button } from '../../components';
import {
  SEM, costoIngrediente, costoReceta, diasDesdePrecio, fmt, foodCostPct, nivel, norm, unitWord,
  type Nivel,
} from '../../lib/costeo';

interface Atencion {
  tipo: 'receta' | 'ingrediente';
  id: string;
  nombre: string;
  motivo: string;
  pill: string;
  nivel: Nivel;
}

export function InicioScreen() {
  const { fullname } = useAuth();
  const { catalogo, idx, loading, error } = useCatalogo();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const objetivo = (catalogo?.cocina.foodCostObjetivo ?? 0.3) * 100;

  const fecha = useMemo(() => {
    const f = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    return f.charAt(0).toUpperCase() + f.slice(1);
  }, []);

  const stats = useMemo(() => {
    if (!catalogo || !idx) {
      return null;
    }
    const conPrecio = catalogo.recetas.filter((r) => r.precioVenta);
    const margenes = conPrecio.map((r) => 100 - (foodCostPct(idx, r.id) ?? 0));
    const margenProm = margenes.length ? margenes.reduce((a, b) => a + b, 0) / margenes.length : 0;
    return { recetas: catalogo.recetas.length, margenProm };
  }, [catalogo, idx]);

  const atencion = useMemo<Atencion[]>(() => {
    if (!catalogo || !idx) {
      return [];
    }
    const items: Atencion[] = [];

    for (const receta of catalogo.recetas) {
      const pct = foodCostPct(idx, receta.id);
      const n = nivel(pct, objetivo);
      if (n === 'rojo' && pct != null) {
        const total = costoReceta(idx, receta.id);
        // ¿Una línea domina el costo (>60%)? — el motivo más accionable
        let motivo = `Food cost arriba de ${Math.round(pct)}%, muy por encima de tu objetivo de ${Math.round(objetivo)}%.`;
        for (const linea of receta.lineas) {
          if (linea.recetaId) {
            const sub = idx.recetas.get(linea.recetaId);
            if (sub && sub.rendimientoKg > 0) {
              const costoLinea = (linea.cantidad / sub.rendimientoKg) * costoReceta(idx, linea.recetaId);
              if (total > 0 && costoLinea / total > 0.6) {
                motivo = `La subreceta ${sub.nombre} es el ${Math.round((costoLinea / total) * 100)}% del costo.`;
              }
            }
          }
        }
        items.push({ tipo: 'receta', id: receta.id, nombre: receta.nombre, motivo, pill: `${Math.round(pct)}%`, nivel: 'rojo' });
      } else if (n === 'ambar' && pct != null) {
        items.push({
          tipo: 'receta', id: receta.id, nombre: receta.nombre,
          motivo: `Food cost ${Math.round(pct)}%, cerca de tu límite de ${Math.round(objetivo)}%.`,
          pill: `${Math.round(pct)}%`, nivel: 'ambar',
        });
      }
    }

    for (const ing of catalogo.ingredientes) {
      const dias = diasDesdePrecio(ing);
      if (dias > 60) {
        const meses = Math.floor(dias / 30);
        items.push({
          tipo: 'ingrediente', id: ing.id, nombre: ing.nombre,
          motivo: `Su precio tiene ${meses >= 2 ? `${meses} meses` : `${dias} días`} sin actualizarse.`,
          pill: 'Precio viejo', nivel: 'ambar',
        });
      }
    }

    return items.sort((a, b) => (a.nivel === 'rojo' ? -1 : 1) - (b.nivel === 'rojo' ? -1 : 1));
  }, [catalogo, idx, objetivo]);

  const resultados = useMemo(() => {
    if (!catalogo || !idx || !q.trim()) {
      return [];
    }
    const nq = norm(q);
    const recetas = catalogo.recetas
      .filter((r) => norm(r.nombre).includes(nq))
      .map((r) => ({ tipo: 'receta' as const, id: r.id, nombre: r.nombre, meta: `Receta · ${fmt(costoReceta(idx, r.id))}` }));
    const ingredientes = catalogo.ingredientes
      .filter((i) => norm(i.nombre).includes(nq))
      .map((i) => ({
        tipo: 'ingrediente' as const, id: i.id, nombre: i.nombre,
        meta: `Ingrediente · ${fmt(costoIngrediente(i))} / ${unitWord(i.unidadBase)}`,
      }));
    return [...recetas, ...ingredientes].slice(0, 6);
  }, [catalogo, idx, q]);

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !catalogo) {
    return <EstadoVacio titulo="No se pudo cargar tu cocina" sub={error ?? undefined} />;
  }

  const primerNombre = fullname?.split(' ')[0] || 'Idílica';
  const vacia = catalogo.recetas.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pt-5 pb-24">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13.5px] text-ink-2">{fecha}</div>
              <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Hola, {primerNombre}</h1>
            </div>
            <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-full bg-burgundy-600">
              <img src="/logo-crema.png" alt="" className="h-8 w-8 object-contain" />
            </div>
          </div>
        </header>

        <Buscador valor={q} onChange={setQ} placeholder="Buscar receta o ingrediente…" />

        {q.trim() ? (
          <div className="space-y-2.5">
            {resultados.length === 0 && (
              <p className="py-8 text-center text-[14px] text-ink-3">Nada coincide con “{q}”.</p>
            )}
            {resultados.map((r) => (
              <Card
                key={`${r.tipo}-${r.id}`}
                className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
                onClick={() => navigate(r.tipo === 'receta' ? `/recetas/${r.id}` : `/ingredientes/${r.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15.5px] font-bold">{r.nombre}</div>
                  <div className="text-[13px] text-ink-2">{r.meta}</div>
                </div>
                <span className="text-ink-3">›</span>
              </Card>
            ))}
          </div>
        ) : vacia ? (
          <EstadoVacio
            titulo={`¡Bienvenida, ${primerNombre}!`}
            sub="Aún no tienes recetas. Crea la primera o importa tu Excel — nosotros hacemos las cuentas."
          >
            <div className="w-full max-w-[280px] space-y-2.5 pt-2">
              <Button block onClick={() => navigate('/recetas/nueva')}>Crear mi primera receta</Button>
              <Button block variant="outline">Importar mi Excel</Button>
            </div>
          </EstadoVacio>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <Card className="px-3 py-4 text-center">
                <div className="text-[28px] font-extrabold tabular-nums">{stats?.recetas ?? 0}</div>
                <div className="text-[12px] font-bold text-ink-2">recetas</div>
              </Card>
              <div className="rounded-[20px] px-3 py-4 text-center" style={{ background: '#EFF0E3', color: '#59622B' }}>
                <div className="text-[28px] font-extrabold tabular-nums">{Math.round(stats?.margenProm ?? 0)}%</div>
                <div className="text-[12px] font-bold">margen prom.</div>
              </div>
              <div className="rounded-[20px] px-3 py-4 text-center" style={{ background: '#F7E9E4', color: '#9D2C34' }}>
                <div className="text-[28px] font-extrabold tabular-nums">{atencion.length}</div>
                <div className="text-[12px] font-bold">necesitan atención</div>
              </div>
            </div>

            <section>
              <h2 className="mb-2.5 text-[16px] font-extrabold">Necesitan tu atención</h2>
              {atencion.length === 0 ? (
                <Card className="px-4 py-5 text-center text-[14px] text-ink-2">
                  Todo en orden: ninguna receta fuera de tu objetivo. 🎉
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {atencion.map((a) => (
                    <Card
                      key={`${a.tipo}-${a.id}`}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
                      style={{ borderLeft: `5px solid ${SEM[a.nivel].dot}` }}
                      onClick={() => navigate(a.tipo === 'receta' ? `/recetas/${a.id}` : `/ingredientes/${a.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15.5px] font-bold">{a.nombre}</div>
                        <div className="text-[13px] text-ink-2">{a.motivo}</div>
                      </div>
                      <span
                        className="flex-none rounded-full px-2.5 py-1 text-[12px] font-bold"
                        style={{ background: SEM[a.nivel].bg, color: SEM[a.nivel].tx }}
                      >
                        {a.pill}
                      </span>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <button
        type="button"
        aria-label="Nueva receta"
        onClick={() => navigate('/recetas/nueva')}
        className="absolute right-5 bottom-5 grid h-[60px] w-[60px] place-items-center rounded-full bg-burgundy-600 text-crema-100 shadow-[0_8px_20px_rgba(157,44,52,0.4)]"
      >
        <Icon icon={PlusIcon} className="h-7 w-7" />
      </button>
    </div>
  );
}
