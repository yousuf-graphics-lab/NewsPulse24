import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wireProxy from './scripts/vite-wire.mjs';

export default defineConfig({
  plugins: [react(), wireProxy()],
  ssr: {
    // bundle CJS deps into the prerender entry so Node's ESM loader is happy
    noExternal: ['react-helmet-async', 'react-router-dom', 'react-router', 'framer-motion', 'd3-geo', 'lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
});
