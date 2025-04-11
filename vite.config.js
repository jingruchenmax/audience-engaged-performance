import { defineConfig } from 'vite';
import { resolve } from 'path'; // ✅ FIXED: import resolve for file paths

export default defineConfig({
  base: '/audience-engaged-performance/',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        admin: resolve(__dirname, 'src/admin.html'),
        video: resolve(__dirname, 'src/video.html')
      }
    }
  },
  server: {
    host: true
  }
});
