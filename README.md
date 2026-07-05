# Idílica — App de costeo de recetas

PWA mobile-first para Idílica (panadería gourmet): costos de recetas **en vivo**,
semáforo de rentabilidad, merma medida con báscula y ganancia real con gastos
de operación. Pensada para usarse en la cocina, con una mano.

**React 19 · Vite · TypeScript · Tailwind CSS 4 · PWA instalable**

## Qué hace

- **Inicio** — búsqueda global (recetas + ingredientes), tarjetas de resumen y
  la lista "Necesitan tu atención": recetas fuera de objetivo y precios con
  más de 60 días sin actualizar.
- **Recetas** — filtro por categoría y cards con costo total, costo por porción
  y food cost con semáforo (verde/ámbar/rojo según el objetivo configurable).
- **Editor de receta** — barra de costo sticky que recalcula a cada tecleo,
  ingredientes con autocomplete, **subrecetas anidadas**, dona de composición
  del costo, ganancia real (ya con gastos de operación), pasos, 14 alérgenos
  y confirmación al salir sin guardar.
- **Ingredientes** — costo "por kilo ya con desperdicio", badge del origen de
  la merma y el botón `$` para el flujo más frecuente: *nuevo precio* → pantalla
  de **impacto** (qué recetas cambian de color y cuánto).
- **Wizard de merma** — tres pesadas con la báscula y el porcentaje queda
  guardado como "medido".
- **Ficha técnica** imprimible (carta/A4) para el equipo de cocina.
- **Ajustes** — food cost objetivo (mueve todos los semáforos), gastos de
  operación con resumen vivo, tema claro/oscuro y miembros.

Los costos nunca se guardan: el catálogo se carga en un `GET` y el motor
(`src/lib/costeo.ts`) los deriva al instante; cada cambio persiste vía API.

## Desarrollo

Requisitos: Node ≥ 20 y el backend (`idillica-backend`) corriendo en `:4051`.

```bash
npm install
npm run dev        # http://localhost:5273 (proxy /api → :4051)
```

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — typecheck + build de producción a `dist/`
- `npm run preview` — sirve el build
- `npm run typecheck` — solo `tsc --noEmit`

## Estructura

```
src/
  api/          clientes del backend (auth, cocinas, catálogo)
  auth/         sesión con refresh token, contexto y guardia de rutas
  components/   sistema de diseño (SemaforoMargen, DonaCosto, BarraCostoSticky…)
  hooks/        useFetch, useOnline
  lib/          costeo.ts (motor), http (interceptor 401), formato, tema
  screens/      una carpeta por pantalla
  state/        CatalogoContext: catálogo + mutadores
  styles/       tokens de diseño (crema/choco/burgundy + modo noche)
```

## Producción

CI en PRs (typecheck + build). En cada push a `master`, el pipeline construye,
sube `frontend.tar.gz` al servidor y ejecuta el script de release (verificación
de integridad, **swap atómico** y rollback automático) — ver `docs/deploy/`.
