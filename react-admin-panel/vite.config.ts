import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle SPA routing in preview mode
    // {
    //   name: 'spa-fallback',
    //   configurePreviewServer(server) {
    //     return () => {
    //       server.middlewares.use((req, res, next) => {
    //         // If the request is for a file that doesn't exist and it's not an API call,
    //         // serve index.html for SPA routing
    //         if (req.url && !req.url.includes('.') && req.url !== '/') {
    //           req.url = '/index.html';
    //         }
    //         next();
    //       });
    //     };
    //   }
    // }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  build: {
    // Vite automatically copies files from public/ to dist/
    // This ensures _redirects file is included in the build
  }
});
