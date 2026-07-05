# Deploy de la PWA (idilica.joelbarranco.io)

El workflow `main.yml` sube `dist/` a `/home/ellebkey/apps/idilica/dist` en cada
push a `master`. Del lado del servidor solo hace falta nginx (una vez):

1. Instalar `nginx-idilica.conf` (instrucciones dentro del archivo) + certbot.
2. Listo — los deploys siguientes solo reemplazan `dist/`.

La app consume el API **misma-origin** (`/api`): nginx lo proxya al backend Go
en `127.0.0.1:8101`. No se necesita `VITE_API_URL` ni CORS para producción.

Piezas del backend (viven en `idillica-backend/deploy/`):

- `idilica-backend.sh` → copiar a `~/idilica-backend` en el droplet (lo ejecuta
  su workflow de deploy).
- `idilica-api.service` → unidad systemd del binario.
- `nginx-api-idilica.conf` → API directa en api-idilica.joelbarranco.io (opcional).
- Secrets del binario en `~/secrets/.env.idilica` (con `PORT=8101` y
  `FRONTEND_URL=https://idilica.joelbarranco.io`).
