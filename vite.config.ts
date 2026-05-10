import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const host = process.env.TAURI_DEV_HOST;
const isPlaywright = process.env.VITE_PLAYWRIGHT === 'true';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: [
      ...(isPlaywright ? [
        { find: '@tauri-apps/plugin-fs', replacement: path.resolve(__dirname, './src/__mocks__/plugin-fs.ts') },
        { find: '@tauri-apps/api/path', replacement: path.resolve(__dirname, './src/__mocks__/api-path.ts') },
      ] : []),
      { find: '@/bom', replacement: path.resolve(__dirname, './docs/bom') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
          globals: true,
          exclude: ['**/e2e/**', '**/*.e2e.spec.ts'],
        },
      },
      {
        plugins: [storybookTest({ configDir: './.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});