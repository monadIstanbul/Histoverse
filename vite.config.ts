import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,  // allow fallback to next available port
    open: false,
    host: 'localhost',
    hmr: {
      host: 'localhost',
      overlay: false,
    },
    cors: true,
    proxy: {
      // Proxy Ollama requests to avoid CORS issues in the browser
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
  define: {
    global: 'globalThis'
  },
  build: {
    sourcemap: true, // Better debugging in production builds
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});