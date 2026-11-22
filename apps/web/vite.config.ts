import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  define: {
    "import.meta.env.VITE_SITE_URL": JSON.stringify(process.env.SITE_URL ?? ""),
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      configPath: "../../infra/wrangler.toml",
    }),
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
});
