/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectFile — Tauri fs を使った projects.json の永続化 hook E2E
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時、loadProjects が自動的に呼ばれ projects[] がグリッドに表示される。
 * 2. 新規プロジェクトを作成すると projects.json に自動保存される。
 * 3. アプリを再起動すると保存済みの projects[] が復元される。
 * 4. saveProjects が失敗した場合、toast.error が画面に表示される。
 *    注意: ブラウザモードでは Tauri fs の強制失敗が困難なため、
 *          このステップは tauri dev 環境での手動検証とする。
 * @output src/hooks/useProjectFile.ts
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect } from '@playwright/test';

/**
 * Slot 3: モック・セットアップ (Test Setup)
 * Playwright は playwright.config.ts の baseURL に接続する。
 * useProjectFile の Hydration・永続化は実 Tauri fs を通じて検証する。
 * 注意: Tauri の fs はブラウザモードでは動作しないため、
 *       このテストは `tauri dev` で起動したアプリを対象とする。
 */

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 2. 監督へのプレゼン (Visual Story) ---

test.describe('useProjectFile: Visual Story', () => {
    test('should hydrate projects on launch and persist on add', async ({ page }) => {
        // Step 1: アプリ起動 → Hydration → グリッド表示
        await page.goto('/');
        await expect(page.getByText('＋ new project')).toBeVisible();
        await page.screenshot({ path: 'evidence/useProjectFile_01_initial.png', fullPage: true });

        // Step 2: 新規プロジェクト作成 → 自動保存
        await page.getByText('＋ new project').click();
        await page.getByPlaceholder('My Awesome App').fill('永続化テストプロジェクト');
        await page.getByText('作成').click();
        await expect(page.getByText('永続化テストプロジェクト')).toBeVisible();
        await page.screenshot({ path: 'evidence/useProjectFile_02_after_save.png', fullPage: true });

        // Step 3: ページリロード → projects[] が復元される
        await page.reload();
        await expect(page.getByText('永続化テストプロジェクト')).toBeVisible();
        await page.screenshot({ path: 'evidence/useProjectFile_03_after_reload.png', fullPage: true });

        // Step 4: saveProjects 失敗時の toast.error 表示
        // TODO: tauri dev 環境での手動検証。
        //       fs の強制失敗は Tauri のモックコマンド機構が必要なため自動化対象外。
    });
});