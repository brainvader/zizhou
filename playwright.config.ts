import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './docs/specs/e2e',
    testMatch: '**/*.e2e.spec.ts',
    outputDir: './evidence',
    use: {
        baseURL: 'http://localhost:1420',
        launchOptions: {
            slowMo: 1000,
        },
    },
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:1420',
        reuseExistingServer: !process.env.CI,
        env: { VITE_PLAYWRIGHT: 'true' },
    },
});