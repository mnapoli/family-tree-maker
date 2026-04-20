import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
    origin: "http://localhost:5173",
  },
  build: {
    outDir: "public/assets",
    emptyOutDir: true,
    manifest: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, "src/client.tsx"),
      output: {
        entryFileNames: "client.js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (info) =>
          info.names?.[0]?.endsWith(".css") ? "client.css" : "[name]-[hash][extname]",
      },
    },
  },
});
