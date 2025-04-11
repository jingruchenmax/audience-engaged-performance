import { defineConfig } from 'vite';

export default defineConfig({
  base:'/audience-engaged-performance/',
  root: 'src',                   // Your source folder with main entry point
  publicDir: '../public',        // Static assets like /audio and /media
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        admin: resolve(__dirname, 'src/admin.html'),
        video: resolve(__dirname, 'src/video.html')
      }
    }},
  server: {
    host: true                   // Allow local network testing (mobile, etc.)
  }
});
