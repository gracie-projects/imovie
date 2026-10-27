import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In development the browser talks only to Vite; Vite forwards /api to the backend,
      // so auth cookies are same-origin and no CORS configuration is needed.
      proxy: {
        '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:5000', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: false,
    },
  };
});
