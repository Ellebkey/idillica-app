import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// El backend permite CORS solo desde FRONTEND_URL; en dev consumimos el API
// same-origin y Vite hace proxy de /api hacia el backend Go (:4051).
const apiProxy = {
  '/api': {
    target: 'http://localhost:4051',
    changeOrigin: true,
  },
};

export default defineConfig({
  build: { outDir: 'dist' },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  server: { port: 5273, proxy: apiProxy },
  preview: { port: 5273, proxy: apiProxy },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/app-icon.svg'],
      manifest: {
        name: 'Idílica',
        short_name: 'Idílica',
        description: 'Costeo de recetas — Idílica Panadería Gourmet',
        lang: 'es-MX',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#9D2C34',
        background_color: '#EEE7D2',
        icons: [
          { src: 'icons/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
