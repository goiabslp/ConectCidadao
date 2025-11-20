import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Caminhos relativos para garantir carregamento correto
  build: {
    outDir: 'dist',
  }
});