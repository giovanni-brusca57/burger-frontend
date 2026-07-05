import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          // UI primitives — @radix-ui/* must be matched with scope prefix
          if (
            id.includes('/@radix-ui/') ||
            id.includes('/lucide-react/') ||
            id.includes('/sonner/') ||
            id.includes('/vaul/') ||
            id.includes('/cmdk/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/')
          ) return 'vendor-ui';
          // React ecosystem (match before bare /react/ to avoid false positives)
          if (
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/')
          ) return 'vendor-react';
          if (/\/node_modules\/react\//.test(id)) return 'vendor-react';
          // i18n
          if (id.includes('/i18next/') || id.includes('/react-i18next/')) return 'vendor-i18n';
          // HTTP
          if (id.includes('/axios/')) return 'vendor-http';
          // State
          if (id.includes('/zustand/')) return 'vendor-state';
          // Charts
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
        },
      },
    },
  },
})
