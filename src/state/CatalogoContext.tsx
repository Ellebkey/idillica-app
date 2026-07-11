// Estado global del catálogo (≈ el `state` de la clase Component del
// prototipo): una carga al entrar y mutadores que aplican la respuesta del
// backend al estado local. Los costos nunca viven aquí — se derivan.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listCocinas } from '../api/cocinas.api';
import * as apiCat from '../api/catalogo.api';
import type { Catalogo, Herramienta, Ingrediente, Receta, CocinaCatalogo } from '../api/catalogo.api';
import { indexar, type Indice } from '../lib/costeo';

/** Alimenta la PantallaImpacto: antes = recalcular con precioViejo */
export interface UltimoImpacto {
  ingredienteId: string;
  productoId: string;
  precioViejo: number;
  precioNuevo: number;
}

interface CatalogoContextValue {
  catalogo: Catalogo | null;
  idx: Indice | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  ultimoImpacto: UltimoImpacto | null;
  setUltimoImpacto: (impacto: UltimoImpacto | null) => void;

  // Mutadores (persisten en el backend Go y parchan el estado local)
  nuevoPrecio: (productoId: string, precio: number) => Promise<void>;
  activarProducto: (ingredienteId: string, productoId: string) => Promise<void>;
  agregarProducto: (ingredienteId: string, input: apiCat.ProductoInput) => Promise<void>;
  guardarMermaMedida: (ingredienteId: string, pesos: { pesoEntero: number; pesoLimpio: number; aprovechado: number }) => Promise<Ingrediente>;
  crearIngrediente: (input: apiCat.CreateIngredienteInput) => Promise<Ingrediente>;
  crearReceta: (input: apiCat.SaveRecetaInput) => Promise<Receta>;
  guardarReceta: (recetaId: string, input: apiCat.SaveRecetaInput) => Promise<Receta>;
  eliminarReceta: (recetaId: string) => Promise<void>;
  actualizarCocina: (input: apiCat.UpdateCocinaInput) => Promise<void>;

  // Inventario
  registrarCompra: (ingredienteId: string, unidades: number, precio: number) => Promise<void>;
  aplicarConteo: (items: apiCat.ConteoItem[]) => Promise<void>;
  producirReceta: (recetaId: string) => Promise<Ingrediente[]>;
  crearHerramienta: (input: apiCat.HerramientaInput) => Promise<Herramienta>;
}

const CatalogoContext = createContext<CatalogoContextValue | null>(null);

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimoImpacto, setUltimoImpacto] = useState<UltimoImpacto | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // El ?? [] blinda contra cualquier respuesta vacía inesperada
      const cocinas = (await listCocinas()) ?? [];
      if (cocinas.length === 0) {
        setError('Tu cuenta no tiene cocina asignada.');
        setCatalogo(null);
        return;
      }
      setCatalogo(await apiCat.getCatalogo(cocinas[0].id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu cocina.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchIngrediente = useCallback((actualizado: Ingrediente) => {
    setCatalogo((prev) => {
      if (!prev) return prev;
      const existe = prev.ingredientes.some((i) => i.id === actualizado.id);
      const ingredientes = existe
        ? prev.ingredientes.map((i) => (i.id === actualizado.id ? actualizado : i))
        : [...prev.ingredientes, actualizado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return { ...prev, ingredientes };
    });
  }, []);

  const patchIngredientes = useCallback((actualizados: Ingrediente[]) => {
    setCatalogo((prev) => {
      if (!prev) return prev;
      const porId = new Map(actualizados.map((i) => [i.id, i]));
      return {
        ...prev,
        ingredientes: prev.ingredientes.map((i) => porId.get(i.id) ?? i),
      };
    });
  }, []);

  const patchReceta = useCallback((actualizada: Receta) => {
    setCatalogo((prev) => {
      if (!prev) return prev;
      const existe = prev.recetas.some((r) => r.id === actualizada.id);
      const recetas = existe
        ? prev.recetas.map((r) => (r.id === actualizada.id ? actualizada : r))
        : [...prev.recetas, actualizada].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return { ...prev, recetas };
    });
  }, []);

  const patchCocina = useCallback((cocina: CocinaCatalogo) => {
    setCatalogo((prev) => (prev ? { ...prev, cocina } : prev));
  }, []);

  const cocinaId = catalogo?.cocina.id ?? '';

  const value = useMemo<CatalogoContextValue>(
    () => ({
      catalogo,
      idx: catalogo ? indexar(catalogo) : null,
      loading,
      error,
      reload,
      ultimoImpacto,
      setUltimoImpacto,

      nuevoPrecio: async (productoId, precio) => {
        patchIngrediente(await apiCat.nuevoPrecio(productoId, precio));
      },
      activarProducto: async (ingredienteId, productoId) => {
        patchIngrediente(await apiCat.activarProducto(ingredienteId, productoId));
      },
      agregarProducto: async (ingredienteId, input) => {
        patchIngrediente(await apiCat.agregarProducto(ingredienteId, input));
      },
      guardarMermaMedida: async (ingredienteId, pesos) => {
        const ing = await apiCat.agregarMedicion(ingredienteId, pesos);
        patchIngrediente(ing);
        return ing;
      },
      crearIngrediente: async (input) => {
        const ing = await apiCat.crearIngrediente(cocinaId, input);
        patchIngrediente(ing);
        return ing;
      },
      crearReceta: async (input) => {
        const receta = await apiCat.crearReceta(cocinaId, input);
        patchReceta(receta);
        return receta;
      },
      guardarReceta: async (recetaId, input) => {
        const receta = await apiCat.guardarReceta(recetaId, input);
        patchReceta(receta);
        return receta;
      },
      eliminarReceta: async (recetaId) => {
        await apiCat.eliminarReceta(recetaId);
        setCatalogo((prev) =>
          prev ? { ...prev, recetas: prev.recetas.filter((r) => r.id !== recetaId) } : prev,
        );
      },
      actualizarCocina: async (input) => {
        patchCocina(await apiCat.actualizarCocina(cocinaId, input));
      },

      registrarCompra: async (ingredienteId, unidades, precio) => {
        patchIngrediente(await apiCat.registrarCompra(ingredienteId, unidades, precio));
      },
      aplicarConteo: async (items) => {
        patchIngredientes(await apiCat.aplicarConteo(cocinaId, items));
      },
      producirReceta: async (recetaId) => {
        const afectados = await apiCat.producirReceta(recetaId);
        patchIngredientes(afectados);
        return afectados;
      },
      crearHerramienta: async (input) => {
        const herramienta = await apiCat.crearHerramienta(cocinaId, input);
        setCatalogo((prev) =>
          prev
            ? {
                ...prev,
                herramientas: [...prev.herramientas, herramienta].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
              }
            : prev,
        );
        return herramienta;
      },
    }),
    [catalogo, loading, error, reload, ultimoImpacto, cocinaId, patchIngrediente, patchIngredientes, patchReceta, patchCocina],
  );

  return <CatalogoContext.Provider value={value}>{children}</CatalogoContext.Provider>;
}

export function useCatalogo(): CatalogoContextValue {
  const ctx = useContext(CatalogoContext);
  if (!ctx) {
    throw new Error('useCatalogo must be used within CatalogoProvider');
  }
  return ctx;
}
