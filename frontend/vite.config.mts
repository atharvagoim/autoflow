import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Same rule as backend/src/config/env.ts: on a Mac, port 5000 belongs to
// AirPlay Receiver, so development uses 5050 instead.
function apiPort(mode: string): number {
  const fileEnv = loadEnv(mode, root, "");
  const requested = parseInt(process.env.PORT || fileEnv.PORT || "5050", 10) || 5050;
  return requested === 5000 && process.platform === "darwin" ? 5050 : requested;
}

export default defineConfig(({ mode }) => ({
  root: here,
  envDir: root, // the single project-root .env
  plugins: [react()],
  build: {
    outDir: path.resolve(here, "../dist/client"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
          charts: ["recharts"],
        },
      },
    },
  },
  // Dev: the web app runs on :5173 and forwards /api to the AutoFlow server.
  server: {
    port: 5173,
    proxy: { "/api": { target: `http://127.0.0.1:${apiPort(mode)}`, changeOrigin: true } },
  },
}));
