import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    assetsInlineLimit: 8192,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
