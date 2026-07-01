import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/core': { target: 'http://localhost:4001', changeOrigin: true, rewrite: p => p.replace(/^\/core/, '') },
      '/ai':   { target: 'http://localhost:4002', changeOrigin: true, rewrite: p => p.replace(/^\/ai/, '') }
    }
  }
});
