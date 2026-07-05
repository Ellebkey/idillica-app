# Idílica — App (costeo de recetas)

Web app móvil (PWA) para costeo de recetas. React 19 + Vite + TypeScript +
Tailwind CSS 4. Misma arquitectura y convenciones que `maguey-mobile-react`.

## Estado

Base del proyecto: shell navegable + autenticación + tokens de diseño.
Las pantallas de recetas, ingredientes y merma se construyen sobre esta base
(ver `prompt-diseno.md` en la raíz del proyecto para el diseño de esas pantallas).

Ya incluido:

- Login contra el backend, sesión con refresh token e interceptor de 401.
- Shell con tab bar (Inicio · Recetas · Ingredientes · Ajustes), PWA instalable.
- Sistema de diseño en variables CSS con **paleta cálida provisional** (crema /
  chocolate / durazno / salvia) y modo oscuro — reemplazar los hex por el diseño
  aprobado; la arquitectura de tokens ya es la definitiva. Ver `src/styles/main.css`.
- Componentes base (Button, Card, Field, AppBar, EmptyState, Skeleton) y utilidades
  de formato es-MX (dinero MXN, porcentaje, semáforo de food cost).

## Requisitos

- Node ≥ 20
- El backend (`idilica-backend`) corriendo en `http://localhost:4050`

## Puesta en marcha

```bash
npm install
npm run dev        # app en http://localhost:5273
```

Vite hace proxy de `/api` hacia el backend en `:4050`, así que no hace falta
configurar CORS ni URLs en desarrollo.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — typecheck + build de producción a `dist/`
- `npm run preview` — sirve el build
- `npm run typecheck` — solo `tsc --noEmit`

## Estructura

```
src/
  api/          clientes del backend (auth, cocinas)
  auth/         sesión, contexto y guardia de rutas
  components/   componentes de UI reutilizables
  hooks/        useFetch, useOnline
  lib/          http, formato, tema, config
  screens/      una carpeta por pantalla (en español)
  styles/       main.css con los tokens de diseño
```
