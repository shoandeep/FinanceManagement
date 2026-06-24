import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
// Note: Vitest config is added in Phase 2 (calc core + tests).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
