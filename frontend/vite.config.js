import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: '../api/static',
    emptyOutDir: true,
  },
});
