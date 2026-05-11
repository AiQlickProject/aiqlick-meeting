import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: "0.0.0.0",
    // The Jitsi IFrame API expects to talk to a real Jitsi backend
    // (XMPP, BOSH, etc.). For local dev we point the iframe directly
    // at book.aiqlick.com — no proxy needed because the embed loads
    // its own resources cross-origin from there.
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
