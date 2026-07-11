// Inicio — fecha + saludo, búsqueda global mixta, 3 stat-cards, lista
// "Necesitan tu atención" (computada) y FAB "+".
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../auth/AuthContext';
import { useCatalogo } from '../../state/CatalogoContext';
import { Buscador, Card, EstadoVacio, Icon, Skeleton, Button } from '../../components';
import {
  SEM, costoIngrediente, costoReceta, diasCaducidad, diasDesdePrecio, fmt, fmtQty, foodCostPct, nivel, norm,
  quedaPoco, unitWord,
  type Nivel,
} from '../../lib/costeo';

interface Atencion {
  id: string;
  to: string;
  nombre: string;
  motivo: string;
  pill: string;
  dot: boolean; // solo los pills de food cost llevan punto
  nivel: Nivel;
  orden: number; // rojo 0 · caduca≤7 0.5 · ámbar 1 · caduca≤30 1.5 · queda poco 1.6 · precio viejo 2
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
        // ¿Una subreceta domina el costo (>60%)? — el motivo más accionable
        let motivo = `Food cost arriba de ${Math.round(objetivo + 10)}%, revisa precio o porciones`;
        for (const linea of receta.lineas) {
          if (linea.recetaId) {
            const sub = idx.recetas.get(linea.recetaId);
            if (sub && sub.rendimientoKg > 0) {
              const costoLinea = (linea.cantidad / sub.rendimientoKg) * costoReceta(idx, linea.recetaId);
              if (total > 0 && costoLinea / total > 0.6) {
                motivo = `La subreceta ${sub.nombre} es el ${Math.round((costoLinea / total) * 100)}% del costo`;
              }
            }
          }
        }
        items.push({ id: receta.id, to: `/recetas/${receta.id}`, nombre: receta.nombre, motivo, pill: `${Math.round(pct)}%`, dot: true, nivel: 'rojo', orden: 0 });
      } else if (n === 'ambar' && pct != null) {
        items.push({
          id: receta.id, to: `/recetas/${receta.id}`, nombre: receta.nombre,
          motivo: `Food cost ${Math.round(pct)}%, cerca de tu límite de ${Math.round(objetivo)}%`,
          pill: `${Math.round(pct)}%`, dot: true, nivel: 'ambar', orden: 1,
        });
      }
    }

    for (const ing of catalogo.ingredientes) {
      const caduca = diasCaducidad(ing);
      if (caduca != null && caduca <= 30) {
        const d = Math.max(0, caduca);
        items.push({
          id: `caduca-${ing.id}`, to: '/inventario', nombre: ing.nombre,
          motivo: `Está por caducar: quedan ${d} ${d === 1 ? 'día' : 'días'}`,
          pill: 'Caduca pronto', dot: false, nivel: caduca <= 7 ? 'rojo' : 'ambar', orden: caduca <= 7 ? 0.5 : 1.5,
        });
      }
      if (quedaPoco(ing)) {
        items.push({
          id: `poco-${ing.id}`, to: '/inventario', nombre: ing.nombre,
          motivo: `Quedan ${fmtQty(ing.existencia, ing.unidadBase)} y tu mínimo es ${fmtQty(ing.minimo, ing.unidadBase)}`,
          pill: 'Queda poco', dot: false, nivel: 'ambar', orden: 1.6,
        });
      }
      const dias = diasDesdePrecio(ing);
      if (dias > 60) {
        items.push({
          id: `viejo-${ing.id}`, to: `/ingredientes/${ing.id}`, nombre: ing.nombre,
          motivo: `Su precio tiene ${dias >= 90 ? `${Math.round(dias / 30)} meses` : `${dias} días`} sin actualizarse`,
          pill: 'Precio viejo', dot: false, nivel: 'ambar', orden: 2,
        });
      }
    }

    return items.sort((a, b) => a.orden - b.orden);
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
            <div className="grid h-12 w-12 flex-none place-items-center rounded-full bg-burgundy-600 text-[17px] font-bold text-crema-100">
              {primerNombre.charAt(0).toUpperCase()}
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
              <Card className="cursor-pointer px-3 py-3.5" onClick={() => navigate('/recetas')}>
                <div className="text-[28px] font-extrabold tracking-[-1px] tabular-nums">{stats?.recetas ?? 0}</div>
                <div className="mt-0.5 text-[12.5px] leading-[1.3] text-ink-2">recetas costeadas</div>
              </Card>
              <div className="rounded-[20px] border-[1.5px] px-3 py-3.5" style={{ background: '#EFF0E3', borderColor: '#D5D8BC' }}>
                <div className="text-[28px] font-extrabold tracking-[-1px] tabular-nums" style={{ color: '#59622B' }}>
                  {Math.round(stats?.margenProm ?? 0)}%
                </div>
                <div className="mt-0.5 text-[12.5px] leading-[1.3]" style={{ color: '#6D7346' }}>margen promedio</div>
              </div>
              <div className="rounded-[20px] border-[1.5px] px-3 py-3.5" style={{ background: '#F7E9E4', borderColor: '#E8CFC5' }}>
                <div className="text-[28px] font-extrabold tracking-[-1px] tabular-nums" style={{ color: '#9D2C34' }}>
                  {atencion.length}
                </div>
                <div className="mt-0.5 text-[12.5px] leading-[1.3]" style={{ color: '#9D5347' }}>necesitan atención</div>
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
                      key={a.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
                      style={{ borderLeft: `5px solid ${SEM[a.nivel].dot}` }}
                      onClick={() => navigate(a.to)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15.5px] font-bold">{a.nombre}</div>
                        <div className="text-[13px] text-ink-2">{a.motivo}</div>
                      </div>
                      <span
                        className="flex flex-none items-center gap-[5px] rounded-full px-2.5 py-[5px] text-[13px] font-bold"
                        style={{ background: SEM[a.nivel].bg, color: SEM[a.nivel].tx }}
                      >
                        {a.dot && <span className="h-2 w-2 rounded-full" style={{ background: SEM[a.nivel].dot }} />}
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
