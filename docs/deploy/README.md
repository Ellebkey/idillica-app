# Deploy de la PWA (idilica.joelbarranco.io)

El workflow `main.yml` sube `frontend.tar.gz` a `/home/ellebkey/apps/idilica` en
cada push a `master` y ejecuta `~/idilica-frontend`, que hace extract al lado,
verificación de integridad (index + chunks), **swap atómico** a `frontend/`,
health check vía nginx y rollback si no responde.

Setup del servidor (una vez):

1. Copiar el script: `scp docs/deploy/idilica-frontend.sh ellebkey@<host>:~/idilica-frontend`
   y `chmod +x ~/idilica-frontend`.
2. Instalar `nginx-idilica.conf` (instrucciones dentro del archivo) + certbot.

La app consume el API **misma-origin** (`/api`): nginx lo proxya al backend Go
en `127.0.0.1:8101`. No se necesita `VITE_API_URL` ni CORS para producción.

Piezas del backend (viven en `idillica-backend/deploy/`):

- `idilica-backend.sh` → copiar a `~/idilica-backend` en el droplet (lo ejecuta
  su workflow de deploy).
- `idilica-api.service` → unidad systemd del binario.
- `nginx-api-idilica.conf` → API directa en api-idilica.joelbarranco.io (opcional).
- Secrets del binario en `~/secrets/.env.idilica` (con `PORT=8101` y
  `FRONTEND_URL=https://idilica.joelbarranco.io`).
