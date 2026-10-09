import { defineConfig } from 'vite';

// base: './' — GitHub Pages, Vercel және ішкі папкада да жол дұрыс болады
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], katex: ['katex'] } },
    },
  },
});
