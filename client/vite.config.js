import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // "@/components/Button" means "src/components/Button"
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // The browser only talks to localhost:5173. Vite forwards /api to the
    // server container, so cookies and requests stay on one origin.
    proxy: {
      "/api": "http://server:5000",
    },
  },
});
