import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // ajusta caminhos para produção
  build: {
    outDir: 'dist',
  },
});
