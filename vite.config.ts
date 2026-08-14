import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const CGE_THEME = "#5C9E42";

export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    hmr: { overlay: false },
    proxy: {
      "/api/db": {
        target: process.env.VITE_SUPABASE_URL || "https://YOUR_CGE_SUPABASE_REF.supabase.co",
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/api\/db/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __CGE_THEME__: JSON.stringify(CGE_THEME),
  },
});
