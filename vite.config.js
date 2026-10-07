import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // three.js changes rarely: keep it in its own long-cached chunk
        manualChunks: { three: ['three'], motion: ['gsap', 'lenis'] },
      },
    },
  },
});
