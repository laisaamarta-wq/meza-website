import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file (scripts, styles and fonts inlined) that opens
// straight from disk with a double-click — no server, no install.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    outDir: 'dist-standalone',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    cssCodeSplit: false,
  },
});
