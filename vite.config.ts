import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

const isPlaywright = process.env.VITE_PLAYWRIGHT === 'true';

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: [
      // Playwright E2E 用モック（VITE_PLAYWRIGHT=true のときのみ有効）
      ...(isPlaywright ? [
        { find: '@tauri-apps/plugin-fs', replacement: path.resolve(__dirname, './src/__mocks__/plugin-fs.ts') },
        { find: '@tauri-apps/api/path', replacement: path.resolve(__dirname, './src/__mocks__/api-path.ts') },
      ] : []),
      { find: '@/bom', replacement: path.resolve(__dirname, './docs/bom') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    exclude: ["**/e2e/**", "**/*.e2e.spec.ts"],
  },
}));