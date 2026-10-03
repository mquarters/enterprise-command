import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The preview harness mounts src/main.tsx from index.html.
// React StrictMode + Fast Refresh require the official React plugin;
// without it Vite falls back to plain esbuild JSX (no refresh, no
// dev-time double-invoke) and this project had already been bitten by
// duplicate-React resolution issues, so pin resolution to one copy.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
