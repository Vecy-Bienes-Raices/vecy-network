import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const pkgPath = id.split('node_modules/').pop() || id;
            if (pkgPath.startsWith('@supabase')) {
              return 'supabase-vendor';
            }
            if (pkgPath.startsWith('@trpc') || pkgPath.startsWith('@tanstack') || pkgPath.startsWith('superjson')) {
              return 'trpc-vendor';
            }
            if (pkgPath.startsWith('lucide-react') || pkgPath.startsWith('react-icons')) {
              return 'icons-vendor';
            }
            if (pkgPath.startsWith('framer-motion') || pkgPath.startsWith('motion-')) {
              return 'motion-vendor';
            }
            if (pkgPath.startsWith('@radix-ui') || pkgPath.startsWith('cmdk') || pkgPath.startsWith('vaul') || pkgPath.startsWith('sonner')) {
              return 'radix-vendor';
            }
            if (pkgPath.startsWith('recharts') || pkgPath.startsWith('d3-')) {
              return 'charts-vendor';
            }
            if (pkgPath.startsWith('leaflet')) {
              return 'maps-vendor';
            }
            if (pkgPath.startsWith('date-fns')) {
              return 'ui-vendor';
            }
            if (pkgPath.startsWith('react/') || pkgPath.startsWith('react-dom/') || pkgPath.startsWith('scheduler/') || pkgPath.startsWith('wouter')) {
              return 'react-vendor';
            }
          }
        },
      },
    },
  },

  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});


