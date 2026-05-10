/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  ProjectDetailTopbar — E2E Visual Story
 * @bom      docs/bom/graph.ts  (InitStatus, graphFilePath)
 *           docs/bom/project.ts (Project)
 *
 * @story
 * 1. /projects/1 を開く（plugin-fs モックが projects[] と graphs/ 存在を返す）
 * 2. Topbar にロゴ・breadcrumb（プロジェクト名）・New Graph ボタン・Settings ボタンが表示される。
 * 3. breadcrumb にプロジェクト名「zizou-core」が表示される。
 * 4. initStatus が ready のため New Graph ボタンは有効状態で表示される。
 * 5. 「＋」New Graph ボタンをクリックする。
 * 6. writeTextFile が呼ばれ（モック）、activeGraphId が更新される。
 *    ※ E2E レイヤーでは副作用の視覚的証拠（スクリーンショット）を取得することが目的。
 * 7. /projects/1?fs=uninitialized を開く（graphs/ が存在しない状態）。
 * 8. initStatus が uninitialized のため New Graph ボタンは disabled で表示される。
 *
 * @output   src/components/ProjectDetailTopbar.tsx
 *
 * @note
 *   E2E モックは VITE_PLAYWRIGHT=true + src/__mocks__/plugin-fs.ts で差し替え。
 *   exists が false を返す場合は URL パラメータ ?fs=uninitialized を使用。
 *   セレクタは data-testid を使用（ctx- プレフィックスなし）。
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { test, expect } from '@playwright/test'

// =============================================================================
// Slot 3: モック・セットアップ (Test Setup)
//
// Playwright は実ブラウザで動作するため Vitest モックは使用しない。
// Dev サーバー（localhost:1420）+ VITE_PLAYWRIGHT=true 環境で動作する。
// =============================================================================

const APP_URL = 'http://localhost:1420'
const PROJECT_DETAIL_URL = `${APP_URL}/projects/1`
const PROJECT_DETAIL_UNINITIALIZED_URL = `${APP_URL}/projects/1?fs=uninitialized`

const TOPBAR_SELECTOR = '[data-testid="topbar"]'
const BREADCRUMB_SEP_SELECTOR = '[data-testid="breadcrumb-sep"]'
const BREADCRUMB_NAME_SELECTOR = '[data-testid="breadcrumb-project"]'
const NEW_GRAPH_BTN_SELECTOR = '[data-testid="new-graph-btn"]'
const SETTINGS_BTN_SELECTOR = '[data-testid="settings-btn"]'

// =============================================================================
// Slot 4: 挙動の検証コード (Story Verification)
// =============================================================================

// --- 2. 監督へのプレゼン (Visual Story) ---

test.describe('ProjectDetailTopbar — Visual Story', () => {

    test.describe('initStatus: ready（graphs/ 存在）', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(PROJECT_DETAIL_URL)
            await page.waitForSelector(TOPBAR_SELECTOR, { timeout: 10_000 })
        })

        test('story step 1-2: Topbar 全体が表示される（ロゴ・breadcrumb・ボタン群）', async ({ page }) => {
            // ロゴ
            await expect(page.getByText('地蔵').first()).toBeVisible()
            await expect(page.getByText(/zizou/i).first()).toBeVisible()
            await expect(page.getByText(/protocol v7\.00/i).first()).toBeVisible()

            // breadcrumb
            await expect(page.locator(BREADCRUMB_SEP_SELECTOR)).toBeVisible()
            await expect(page.locator(BREADCRUMB_NAME_SELECTOR)).toBeVisible()

            // ボタン
            await expect(page.locator(NEW_GRAPH_BTN_SELECTOR)).toBeVisible()
            await expect(page.locator(SETTINGS_BTN_SELECTOR)).toBeVisible()

            // 視覚的証拠
            await page.locator(TOPBAR_SELECTOR).screenshot({
                path: 'evidence/ProjectDetailTopbar_step2_initial.png',
            })
        })

        test('story step 3: breadcrumb にプロジェクト名が表示される', async ({ page }) => {
            await expect(page.locator(BREADCRUMB_NAME_SELECTOR)).toBeVisible()
            await expect(page.locator(BREADCRUMB_NAME_SELECTOR)).not.toBeEmpty()

            await page.screenshot({ path: 'evidence/ProjectDetailTopbar_step3_breadcrumb.png' })
        })

        test('story step 4: initStatus ready のとき New Graph ボタンは有効', async ({ page }) => {
            const btn = page.locator(NEW_GRAPH_BTN_SELECTOR)
            await expect(btn).toBeVisible()
            await expect(btn).not.toBeDisabled()

            await page.screenshot({ path: 'evidence/ProjectDetailTopbar_step4_newgraph_enabled.png' })
        })

        test('story step 5-6: New Graph ボタンをクリックできる（クラッシュしない）', async ({ page }) => {
            const btn = page.locator(NEW_GRAPH_BTN_SELECTOR)

            await page.screenshot({ path: 'evidence/ProjectDetailTopbar_step5_before_click.png' })
            await btn.click()
            await page.screenshot({ path: 'evidence/ProjectDetailTopbar_step6_after_click.png' })

            // クリック後もボタンが DOM に残っていること（クラッシュしていない）
            await expect(btn).toBeVisible()
        })
    })

    test.describe('initStatus: uninitialized（graphs/ 非存在）', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(PROJECT_DETAIL_UNINITIALIZED_URL)
            await page.waitForSelector(TOPBAR_SELECTOR, { timeout: 10_000 })
        })

        test('story step 7-8: initStatus uninitialized のとき New Graph ボタンは disabled', async ({ page }) => {
            const btn = page.locator(NEW_GRAPH_BTN_SELECTOR)
            await expect(btn).toBeVisible()
            await expect(btn).toBeDisabled()

            await page.screenshot({
                path: 'evidence/ProjectDetailTopbar_step8_newgraph_disabled.png',
            })
        })
    })

    test('TODO: Tauri WebDriver でのネイティブウィンドウ統合テスト', async () => {
        test.skip(true, 'Tauri WebDriver integration — pending')
    })
})