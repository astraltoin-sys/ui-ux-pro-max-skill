import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// O host 0.0.0.0 + allowedHosts permitem abrir a demo em previews/proxies
// (ex.: ambientes de sandbox que expoem a porta via HTTPS).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
