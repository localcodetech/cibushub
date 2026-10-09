import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Makes the app icons (PNG) from public/favicon.svg.
// Run again after changing the logo: docker compose exec client npx pwa-assets-generator
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Icons that phones crop into circles or squircles get a green border, not white
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: "#123c2a" } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: "#123c2a" } },
  },
  images: ["public/favicon.svg"],
});
