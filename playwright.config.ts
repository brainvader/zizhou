import { defineConfig } from '@playwright/test';

/** 視覚確認用: PW_SLOWMO=1000 pnpm e2e */
const slowMo = Number(process.env.PW_SLOWMO ?? '0') || 0;

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.ts',
    outputDir: './evidence',
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:1420',
        ...(slowMo > 0 ? { launchOptions: { slowMo } } : {}),
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:1420',
        reuseExistingServer: !process.env.CI,
        env: { VITE_PLAYWRIGHT: 'true' },
        timeout: 60_000,
    },
});
