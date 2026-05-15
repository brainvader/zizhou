/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context CTX-5: ROUTING
 * @bom     docs/bom/project.ts
 *
 * @story
 * 1. ユーザーがホーム画面（`/`）を開くと ProjectGrid が表示される
 * 2. ユーザーがプロジェクトカードをクリックすると `/projects/:id` へ遷移する
 * 3. `/projects/:id` ページに、その id が表示される（プレースホルダー）
 * 4. ブラウザの「戻る」操作で ProjectGrid に戻れる
 *
 * @output
 *   src/router.tsx
 *   src/routes/index.tsx
 *   src/routes/projects.$id.tsx
 */

import { test, expect } from '@playwright/test';

const EVIDENCE = 'evidence';
const TEST_PROJECT_NAME = 'Routing Test Project';

/** 「＋ new project」からプロジェクトを1件作成するヘルパー */
const createProject = async (page: import('@playwright/test').Page, name: string) => {
    await page.getByText('＋ new project').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByPlaceholder('My Awesome App').fill(name);
    await page.getByPlaceholder('/Users/user/projects/my-app').fill('/Users/user/projects/test');
    await page.getByRole('button', { name: '作成' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
};

test.describe('CTX-5 ROUTING — Visual Story (Playwright)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await createProject(page, TEST_PROJECT_NAME);
    });

    test('step 1: ProjectGrid and cards are visible on "/"', async ({ page }) => {
        await expect(page.getByTestId('project-grid')).toBeVisible();
        await expect(page.locator('[data-testid^="card-"]').first()).toBeVisible();

        await page.screenshot({
            path: `${EVIDENCE}/routing_step1_project_grid.png`,
            fullPage: true,
        });
    });

    test('step 2-3: clicking a card navigates to /projects/:id and shows id', async ({ page }) => {
        const firstCard = page.locator('[data-testid^="card-"]').first();
        await expect(firstCard).toBeVisible();

        const testId = await firstCard.getAttribute('data-testid') ?? '';
        const projectId = testId.replace('card-', '');

        await page.screenshot({
            path: `${EVIDENCE}/routing_step2_before_click.png`,
            fullPage: true,
        });

        await firstCard.click();

        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`));

        const detailId = page.getByTestId('project-detail-id');
        await expect(detailId).toBeVisible();
        await expect(detailId).toHaveText(projectId);

        await page.screenshot({
            path: `${EVIDENCE}/routing_step3_project_detail.png`,
            fullPage: true,
        });
    });

    test('step 4: browser back() returns to ProjectGrid', async ({ page }) => {
        const firstCard = page.locator('[data-testid^="card-"]').first();
        await firstCard.click();
        await expect(page).toHaveURL(/\/projects\/.+/);

        await page.screenshot({
            path: `${EVIDENCE}/routing_step4_before_back.png`,
            fullPage: true,
        });

        await page.goBack();

        await expect(page).toHaveURL('/');
        await expect(page.getByTestId('project-grid')).toBeVisible();

        await page.screenshot({
            path: `${EVIDENCE}/routing_step4_after_back.png`,
            fullPage: true,
        });
    });

    test('direct navigation to /projects/:id renders id placeholder', async ({ page }) => {
        const firstCard = page.locator('[data-testid^="card-"]').first();
        const testId = await firstCard.getAttribute('data-testid') ?? '';
        const projectId = testId.replace('card-', '');

        await page.goto(`/projects/${projectId}`);
        await expect(page).toHaveURL(`/projects/${projectId}`);

        const detailId = page.getByTestId('project-detail-id');
        await expect(detailId).toBeVisible();
        await expect(detailId).toHaveText(projectId);

        await page.screenshot({
            path: `${EVIDENCE}/routing_direct_nav.png`,
            fullPage: true,
        });
    });

    test.skip('tauri: native window title and hardware-back navigation', async () => {
        // Tauri WebDriver セットアップ後に実装する
    });
});