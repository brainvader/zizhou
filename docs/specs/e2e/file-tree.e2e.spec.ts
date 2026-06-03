/**
 * @context  CTX-1 / FileTree — E2E Visual Story
 *
 * @note SurrealDB 移行後、FileTree は Tauri fs ではなく invoke('list_graphs') を使用する予定。
 *       file-tree の表示テスト（src/graphs ディレクトリ）は SurrealDB 移行後に再設計する。
 *       現在は graph-editor への到達テストのみ残す。
 */
import { test, expect } from '@playwright/test'

const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
    await newProjectBtn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByPlaceholder('My Awesome App').fill('E2E Test Project')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    const card = page.getByRole('link', { name: /E2E Test Project/ })
    await expect(card).toBeVisible({ timeout: 10000 })

    const href = await card.getAttribute('href')
    if (!href) throw new Error('href missing')
    await page.goto(href)

    await expect(page.getByTestId('file-tree')).toBeVisible({ timeout: 10000 })
}

test.describe('CTX-1 FileTree — Visual Story', () => {

    test.beforeEach(async ({ page }) => {
        await gotoProjectDetail(page)
    })

    test('step 1-2: file-tree が表示される', async ({ page }) => {
        await expect(page.getByTestId('file-tree')).toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step1-2_initial.png' })
    })

})

// =============================================================================
// URL 直打ち復元シナリオ
// =============================================================================

test.describe('CTX-1 FileTree — URL 直打ち復元', () => {

    test('step 10: New Graph 作成後に直アクセスしても graph-editor が表示される', async ({ page }) => {
        await gotoProjectDetail(page)

        await page.locator('[data-testid="new-graph-btn"]').click()
        await page.waitForURL(/\?graph=/, { timeout: 10000 })
        const currentUrl = page.url()
        await page.waitForTimeout(500)

        await page.goto(currentUrl)
        await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 15000 })
        await page.screenshot({ path: 'evidence/CTX12_step10_direct_access.png' })
    })
})

test.describe('CTX-1 FileTree — グラフ切り替え', () => {
    test('step 3: グラフをクリックすると ?graph= が更新される', async ({ page }) => {
        await gotoProjectDetail(page)
        // New Graph でもう1つ作成
        await page.locator('[data-testid="new-graph-btn"]').click()
        await page.waitForURL(/\?graph=/, { timeout: 10000 })

        // file-tree のグラフ一覧から最初のグラフをクリック
        const items = page.locator('[data-testid^="graph-item-"]')
        const firstId = await items.first().getAttribute('data-testid')
        const graphId = firstId?.replace('graph-item-', '') ?? ''

        await items.first().click()
        await expect(page).toHaveURL(new RegExp(`graph=${encodeURIComponent(graphId)}`))
        await page.screenshot({ path: 'evidence/CTX1_step3_graph_switch.png' })
    })
})