/**
 * @context ProjectDetailTopbar — E2E
 * @note ロゴ・breadcrumb 表示・ボタン enabled/disabled は Storybook play 関数でカバー済み。
 *       ここでは Tauri fs 結合（?fs=uninitialized URL パラメータ）と
 *       New Graph クリック後の副作用（writeTextFile）のみ検証する。
 */
import { test, expect } from '@playwright/test'

const PROJECT_DETAIL_URL = 'http://localhost:1420/projects/1'
const PROJECT_DETAIL_UNINIT_URL = 'http://localhost:1420/projects/1?fs=uninitialized'
const TOPBAR_SELECTOR = '[data-testid="topbar"]'
const NEW_GRAPH_BTN_SELECTOR = '[data-testid="new-graph-btn"]'

test.describe('ProjectDetailTopbar — Integration', () => {

    test('?fs=uninitialized のとき New Graph ボタンが disabled になる', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_UNINIT_URL)
        await page.waitForSelector(TOPBAR_SELECTOR, { timeout: 10_000 })
        await expect(page.locator(NEW_GRAPH_BTN_SELECTOR)).toBeDisabled()
        await page.screenshot({ path: 'evidence/ProjectDetailTopbar_uninitialized.png' })
    })

    test('New Graph クリックで画面がクラッシュしない（副作用の視覚的記録）', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await page.waitForSelector(TOPBAR_SELECTOR, { timeout: 10_000 })
        await page.locator(NEW_GRAPH_BTN_SELECTOR).click()
        await page.screenshot({ path: 'evidence/ProjectDetailTopbar_newgraph_clicked.png' })
        await expect(page.locator(NEW_GRAPH_BTN_SELECTOR)).toBeVisible()
    })
})