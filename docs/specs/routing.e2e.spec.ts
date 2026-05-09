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

// =============================================================================
// Slot 2: 外部依存のインポート (Imports)
// =============================================================================
import { test, expect } from '@playwright/test';

// =============================================================================
// Slot 3: モック・セットアップ (Test Setup)
// =============================================================================

/**
 * playwright.config.ts の webServer は `pnpm dev`（Vite のみ）で起動する。
 * Tauri fs は使用できないため projects[] は常に空で起動する。
 * CTX-2 の E2E と同様に、「＋ new project」でプロジェクトを作成してから
 * カードを操作するアプローチを採用する。
 *
 * スクリーンショットはすべて evidence/ に保存する（AGENTS.md §2 人間の検品）。
 */

const EVIDENCE = 'evidence';
const TEST_PROJECT_NAME = 'Routing Test Project';

/** 「＋ new project」からプロジェクトを1件作成するヘルパー */
const createProject = async (page: import('@playwright/test').Page, name: string) => {
    await page.getByText('＋ new project').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByPlaceholder('My Awesome App').fill(name);
    await page.getByText('作成').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
};

// =============================================================================
// Slot 4: 挙動の検証コード (Story Verification)
// =============================================================================

test.describe('CTX-5 ROUTING — Visual Story (Playwright)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Tauri fs が使えない環境でも card-* を確保するため事前にプロジェクトを作成する
        await createProject(page, TEST_PROJECT_NAME);
    });

    // ---------------------------------------------------------------------------
    // Step 1: ホーム画面で ProjectGrid とカードが表示される
    // ---------------------------------------------------------------------------
    test('step 1: ProjectGrid and cards are visible on "/"', async ({ page }) => {
        await expect(page.getByTestId('project-grid')).toBeVisible();
        await expect(page.locator('[data-testid^="card-"]').first()).toBeVisible();

        await page.screenshot({
            path: `${EVIDENCE}/routing_step1_project_grid.png`,
            fullPage: true,
        });
    });

    // ---------------------------------------------------------------------------
    // Step 2-3: カードクリック → /projects/:id 遷移 → id 表示
    // ---------------------------------------------------------------------------
    test('step 2-3: clicking a card navigates to /projects/:id and shows id', async ({ page }) => {
        const firstCard = page.locator('[data-testid^="card-"]').first();
        await expect(firstCard).toBeVisible();

        const testId = await firstCard.getAttribute('data-testid') ?? '';
        const projectId = testId.replace('card-', '');

        await page.screenshot({
            path: `${EVIDENCE}/routing_step2_before_click.png`,
            fullPage: true,
        });

        // step 2: カードをクリック
        await firstCard.click();

        // URL が /projects/:id に変わっている
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`));

        // step 3: id がプレースホルダーとして表示される
        const detailId = page.getByTestId('project-detail-id');
        await expect(detailId).toBeVisible();
        await expect(detailId).toHaveText(projectId);

        await page.screenshot({
            path: `${EVIDENCE}/routing_step3_project_detail.png`,
            fullPage: true,
        });
    });

    // ---------------------------------------------------------------------------
    // Step 4: ブラウザ「戻る」で ProjectGrid に戻れる
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // エッジケース: /projects/:id への直接アクセス（任意の id で検証）
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // TODO: Tauri WebDriver が安定したら有効化
    // ---------------------------------------------------------------------------
    test.skip('tauri: native window title and hardware-back navigation', async () => {
        // Tauri WebDriver セットアップ後に実装する
    });
});