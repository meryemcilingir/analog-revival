import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three + postprocessing tek pakette ~1 MB (gzip ~280 KB); sayfa tek ekran olduğu için bölmeye gerek yok
    chunkSizeWarningLimit: 1400,
  },
});
