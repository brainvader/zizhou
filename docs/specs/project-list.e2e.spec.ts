/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context ProjectGrid — プロジェクト一覧画面 E2E
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時、useProjectFile の loadProjects が projects.json を読み込み、
 *    Zustand の projects[] にセットする。
 * 2. ProjectGrid は projects[] をカードグリッドで表示する。
 * 3. ユーザーが「＋ new project」破線カードをクリックする。
 * 4. New Project ダイアログが開く（isDialogOpen: true）。
 * 5. ユーザーが name を空のまま「作成」ボタンを押す。
 * 6. Zod バリデーションが失敗し、「name は必須です」エラーメッセージが表示される。
 * 7. ユーザーが name・description を入力して「作成」を押す。
 * 8. ダイアログが閉じ、グリッドに新規カードが表示される。
 * 9. ユーザーが「キャンセル」ボタンを押す。
 * 10. ダイアログが閉じる。入力内容はグリッドに追加されない。
 * @output src/components/ProjectGrid.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect } from '@playwright/test';

/**
 * Slot 3: モック・セットアップ (Test Setup)
 * Playwright は playwright.config.ts の baseURL に接続する。
 * Tauri fs のモックは不要（実ファイルシステムを使用）。
 */

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 2. 監督へのプレゼン (Visual Story) ---

test.describe('ProjectGrid: Visual Story', () => {
    test('should display projects grid and evidence the full new-project story', async ({ page }) => {
        // Step 1–2: アプリ起動 → 破線カードの存在を確認（実ファイルシステム非依存）
        await page.goto('/');
        await expect(page.getByText('＋ new project')).toBeVisible();
        await page.screenshot({ path: 'evidence/ProjectGrid_01_initial.png', fullPage: true });

        // Step 3–4: 破線カードクリック → ダイアログ表示
        await page.getByText('＋ new project').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({ path: 'evidence/ProjectGrid_02_dialog_open.png', fullPage: true });

        // Step 5–6: name 空のまま「作成」→ エラー表示
        await page.getByText('作成').click();
        await expect(page.getByText('name は必須です')).toBeVisible();
        await page.screenshot({ path: 'evidence/ProjectGrid_03_validation_error.png', fullPage: true });

        // Step 7–8: 正常入力 → 作成 → カード追加・ダイアログ閉じる
        await page.getByPlaceholder('My Awesome App').fill('新規テストプロジェクト');
        await page.getByPlaceholder('このプロジェクトの説明（任意）').fill('Playwright による E2E テスト用プロジェクト。');
        await page.getByText('作成').click();
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByText('新規テストプロジェクト')).toBeVisible();
        await page.screenshot({ path: 'evidence/ProjectGrid_04_project_added.png', fullPage: true });

        // Step 9–10: キャンセルフロー確認
        await page.getByText('＋ new project').click();
        await page.getByPlaceholder('My Awesome App').fill('キャンセルされるプロジェクト');
        await page.getByText('キャンセル').click();
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByText('キャンセルされるプロジェクト')).not.toBeVisible();
        await page.screenshot({ path: 'evidence/ProjectGrid_05_cancel.png', fullPage: true });
    });
});