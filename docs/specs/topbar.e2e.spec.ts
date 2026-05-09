/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context Topbar — E2E Visual Story
 * @bom docs/bom/project.ts
 * @story
 * 1. ユーザーがアプリを起動する
 * 2. Topbar に「地蔵」ロゴ・Settings ボタンが表示されたスクリーンショットを撮影する
 * 3. ユーザーが Settings ボタンをクリックする
 * 4. クリック後の状態のスクリーンショットを撮影し、コールバック発火を視覚的に記録する
 * @output src/components/Topbar.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect } from '@playwright/test'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 *
 * Playwright は実ブラウザで動作するため、
 * Vitest/RTL のモックは使用しない。
 * Dev サーバー（localhost:5173）にアクセスして視覚的証拠を取得する。
 */
const TOPBAR_SELECTOR = '[data-testid="topbar"]'
const SETTINGS_BTN_SELECTOR = '[data-testid="settings-btn"]'

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 2. 監督へのプレゼン (Visual Story) ---

test.describe('Topbar — Visual Story', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        // Topbar が DOM に現れるまで待機
        await page.waitForSelector(TOPBAR_SELECTOR, { timeout: 10_000 })
    })

    test('story step 1-2: Topbar にロゴと Settings ボタンが表示される', async ({ page }) => {
        // ロゴ漢字が表示されていること
        await expect(page.getByText('地蔵').first()).toBeVisible()

        // romaji が表示されていること
        await expect(page.getByText(/zizou/i).first()).toBeVisible()

        // Settings ボタンが存在すること
        const settingsBtn = page.locator(SETTINGS_BTN_SELECTOR).first()
        await expect(settingsBtn).toBeVisible()

        // 視覚的証拠
        await page.screenshot({ path: 'evidence/Topbar_step2_initial.png' })
    })

    test('story step 3-4: Settings ボタンをクリックできる', async ({ page }) => {
        const settingsBtn = page.locator(SETTINGS_BTN_SELECTOR).first()

        // クリック前のスクリーンショット
        await page.screenshot({ path: 'evidence/Topbar_step3_before.png' })

        await settingsBtn.click()

        // クリック後のスクリーンショット（コールバック発火の視覚的記録）
        await page.screenshot({ path: 'evidence/Topbar_step4_clicked.png' })

        // TODO: Settings画面実装後、遷移先のUI要素をアサーションに追加する
        // Settings ボタンがクリック後も DOM に残っていること（クラッシュしていない）
        await expect(settingsBtn).toBeVisible()
    })

    test('story: Topbar 全体のスナップショット — 回帰テスト基準', async ({ page }) => {
        const topbar = page.locator(TOPBAR_SELECTOR).first()
        await expect(topbar).toBeVisible()

        // Topbar 領域のみをキャプチャ
        await topbar.screenshot({ path: 'evidence/Topbar_region.png' })
    })
})