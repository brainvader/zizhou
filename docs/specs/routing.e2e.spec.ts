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
 * Tauri WebDriver 経由の E2E テスト。
 * baseURL は playwright.config.ts で設定済み。
 *
 * 前提条件:
 *   - アプリ起動時に Tauri fs から projects.json が hydrate 済みであること
 *   - ProjectGrid の各カードに data-testid="card-{id}" が付与されていること
 *   - /projects/$id ページに data-testid="project-detail-id" が付与されていること
 *
 * スクリーンショットはすべて evidence/ に保存する（AGENTS.md §2 人間の検品）。
 */

const EVIDENCE = 'evidence';

// =============================================================================
// Slot 4: 挙動の検証コード (Story Verification)
// =============================================================================

test.describe('CTX-5 ROUTING — Visual Story (Playwright)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    // ---------------------------------------------------------------------------
    // Step 1: ホーム画面で ProjectGrid が表示される
    // ---------------------------------------------------------------------------
    test('step 1: ProjectGrid is visible on "/"', async ({ page }) => {
        const grid = page.getByTestId('project-grid');
        await expect(grid).toBeVisible();

        // 少なくとも1枚のカードが表示される
        const firstCard = page.locator('[data-testid^="card-"]').first();
        await expect(firstCard).toBeVisible();

        await page.screenshot({
            path: `${EVIDENCE}/routing_step1_project_grid.png`,
            fullPage: true,
        });
    });

    // ---------------------------------------------------------------------------
    // Step 2-3: カードクリック → /projects/:id 遷移 → id 表示
    // ---------------------------------------------------------------------------
    test('step 2-3: clicking a card navigates to /projects/:id and shows id', async ({ page }) => {
        // カード一覧を取得し、先頭カードの id を抽出
        // data-testid="card-{id}" → id = testId.replace('card-', '')
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
        // まず任意のカードをクリックして詳細ページへ
        const firstCard = page.locator('[data-testid^="card-"]').first();
        await firstCard.click();
        await expect(page).toHaveURL(/\/projects\/.+/);

        await page.screenshot({
            path: `${EVIDENCE}/routing_step4_before_back.png`,
            fullPage: true,
        });

        // 戻る
        await page.goBack();

        await expect(page).toHaveURL('/');
        await expect(page.getByTestId('project-grid')).toBeVisible();

        await page.screenshot({
            path: `${EVIDENCE}/routing_step4_after_back.png`,
            fullPage: true,
        });
    });

    // ---------------------------------------------------------------------------
    // エッジケース: /projects/:id への直接アクセス
    // ---------------------------------------------------------------------------
    test('direct navigation to /projects/:id renders id placeholder', async ({ page }) => {
        // ProjectGrid から1件の id を借用する
        const firstCard = page.locator('[data-testid^="card-"]').first();
        await expect(firstCard).toBeVisible();
        const testId = await firstCard.getAttribute('data-testid') ?? '';
        const projectId = testId.replace('card-', '');

        // 直接 URL 遷移
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