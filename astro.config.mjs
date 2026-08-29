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
    plugins: [tailwindcss(), pinDevReactRuntime()],
    // `three` reaches the browser through ONE island that is imported at
    // runtime: <TurningMark client:media="(min-width: 1024px)" /> in
    // Install.astro. Vite's cold-start scan never walks that edge, so the
    // dependency is absent from the pre-bundle. The browser's first request for
    // it then kicks off an on-demand optimize run, and Vite answers 504 while
    // that runs. `astro-island` retries three times, gives up, and the mark
    // stays dead with nothing on screen to say so -- the same silent shape as
    // the jsx-dev-runtime failure documented above.
    //
    // Naming it here puts `three` in the pre-bundle at startup, so the wait
    // costs one cold start instead of a broken island. A production build is
    // unaffected: it walks the full import graph either way.
    optimizeDeps: { include: ["three"] },
  },
});

/**
 * Keep the dev server's pre-bundled React on its DEVELOPMENT build.
 *
 * Astro's background dev server can come up with NODE_ENV unset. Vite's
 * dependency pre-bundler then folds `process.env.NODE_ENV` to "production" and
 * bundles React through its production entry — where `react/jsx-dev-runtime`
 * deliberately exports `jsxDEV` as undefined. Our own source is still
 * transformed with the development JSX runtime, so every island throws
 * `_jsxDEV is not a function` the moment it hydrates.
 *
 * The failure is quiet in the worst way: server-rendered markup stays on
 * screen, so a section looks present and is simply dead. A demo whose size is
 * computed after mount (the window starts hidden until a ResizeObserver
 * reports a scale) renders as an empty well instead — no error in sight
 * unless you open the console.
 *
 * Setting the define is what actually holds. Assigning `process.env.NODE_ENV`
 * alone survives the first optimize pass and is lost the next time Vite
 * re-bundles after a new import appears, which is exactly when a page is being
 * built out and nobody is watching the console.
 *
 * `command === "serve"` scopes all of it to the dev server; a production build
 * never reaches this branch.
 */
function pinDevReactRuntime() {
  return {
    name: "jarvis:pin-dev-react-runtime",
    config(_config, { command }) {
      if (command !== "serve") return;
      if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
      const define = { "process.env.NODE_ENV": JSON.stringify("development") };
      return {
        optimizeDeps: {
          esbuildOptions: { define },
          rollupOptions: { define },
        },
      };
    },
  };
}
