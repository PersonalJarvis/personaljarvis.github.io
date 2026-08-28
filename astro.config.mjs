// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // The domain is owned and free; the previous site that served it was retired
  // on 2026-08-28. Sitemap and canonical URLs need it set even before deploy.
  site: "https://personaljarvis.ai",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
