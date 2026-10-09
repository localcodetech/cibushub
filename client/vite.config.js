import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // Makes CibusHub installable on a phone's home screen, with an offline page [AC-UX-11]
    VitePWA({
      // A new version installs itself the next time the app is opened
      registerType: "autoUpdate",
      // Files from public/ the service worker keeps for offline use
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon-180x180.png", "offline.html"],
      // The app's "ID card" that the phone reads when installing it
      manifest: {
        name: "CibusHub",
        short_name: "CibusHub",
        description: "Order food from restaurants in Kumasi and get it delivered.",
        start_url: "/",
        display: "standalone",
        background_color: "#fbf8f1",
        theme_color: "#123c2a",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Keep the app's own files (JS, CSS, fonts, icons) so it opens fast
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        // Page visits always go to the network; with no internet, show offline.html.
        // API calls (/api/...) are never cached: orders and prices must always be fresh.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
            options: {
              precacheFallback: { fallbackURL: "/offline.html" },
            },
          },
        ],
      },
    }),
  ],
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
    // Let the dev server answer through an https tunnel (Apple sign-in and Paystack
    // callbacks need a real https address, e.g. https://dev.cibushubgh.com)
    allowedHosts: [".cibushubgh.com", ".trycloudflare.com"],
    // The browser only talks to localhost:5173. Vite forwards /api to the
    // server container, so cookies and requests stay on one origin.
    proxy: {
      "/api": "http://server:5000",
    },
  },
});
