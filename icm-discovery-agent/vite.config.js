import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/webhook': {
        target: 'https://babarnawaz.app.n8n.cloud',
        changeOrigin: true,
        rewrite: (path) => '/webhook/vapi-discovery-transcript',
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
