/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-4: SETTINGS DIALOG
 * @bom docs/bom/project.ts
 * @story
 * 1. Topbar の Settings アイコンボタンをクリックする
 * 2. Settings ダイアログが開き「Settings」タイトルと「閉じる」ボタンが表示される
 * 3. 「閉じる」ボタンをクリックする
 * 4. ダイアログが閉じる（アンマウントされる）
 * 5. 再度 Settings ボタンをクリックしてダイアログを開く
 * 6. overlay（backdrop）をクリックする
 * 7. ダイアログが閉じる（アンマウントされる）
 * @output src/components/SettingsDialog.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect } from '@playwright/test'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */
// Playwright はブラウザ駆動のため外部モックは不要。
// アプリは dev サーバー（http://localhost:1420）で起動済みであること。
const APP_URL = 'http://localhost:1420'

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 2. 監督へのプレゼン (Visual Story) ---

test.describe('CTX-4: SETTINGS DIALOG — Visual Story', () => {

    test('story step 1-2: Settings ボタンクリックでダイアログが開く', async ({ page }) => {
        await page.goto(APP_URL)

        // 初期状態：ダイアログが存在しないことを確認
        await expect(page.getByText('Settings')).not.toBeVisible()

        // Topbar の Settings アイコンボタンをクリック
        await page.getByRole('button', { name: /settings/i }).click()

        // ダイアログが表示される
        await expect(page.getByRole('dialog')).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
        await expect(page.getByRole('button', { name: '閉じる' })).toBeVisible()

        await page.screenshot({ path: 'evidence/settings-dialog_open.png' })
    })

    test('story step 3-4: 「閉じる」ボタンクリックでダイアログが閉じる', async ({ page }) => {
        await page.goto(APP_URL)
        await page.getByRole('button', { name: /settings/i }).click()
        await expect(page.getByRole('dialog')).toBeVisible()

        await page.screenshot({ path: 'evidence/settings-dialog_before_close.png' })

        // 「閉じる」ボタンをクリック
        await page.getByRole('button', { name: '閉じる' }).click()

        // ダイアログが閉じる
        await expect(page.getByRole('dialog')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/settings-dialog_after_close.png' })
    })

    test('story step 5-7: overlay クリックでダイアログが閉じる', async ({ page }) => {
        await page.goto(APP_URL)
        await page.getByRole('button', { name: /settings/i }).click()
        await expect(page.getByRole('dialog')).toBeVisible()

        // overlay（backdrop）をクリック — ダイアログ外の座標を指定
        await page.mouse.click(10, 10)

        // ダイアログが閉じる
        await expect(page.getByRole('dialog')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/settings-dialog_overlay_close.png' })
    })

    test('TODO: Tauri WebDriver でのネイティブウィンドウ統合テスト', async () => {
        // Tauri WebDriver が利用可能になったら実装する
        test.skip(true, 'Tauri WebDriver integration — pending')
    })
})