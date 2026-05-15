/**
 * @context ProjectDetailTopbar — E2E
 * @note ロゴ・breadcrumb 表示・ボタン enabled/disabled は Storybook play 関数でカバー済み。
 *       ここでは New Graph クリック後の URL 遷移のみ検証する。
 */
import { test, expect } from '@playwright/test'

const NEW_GRAPH_BTN_SELECTOR = '[data-testid="new-graph-btn"]'

test.describe('ProjectDetailTopbar — Integration', () => {

    test('New Graph クリック後に URL に ?graph= が付く', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.locator('[data-testid^="card-"]').first().click()
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
        await page.locator(NEW_GRAPH_BTN_SELECTOR).click()
        await expect(page).toHaveURL(/\?graph=/)
        await page.screenshot({ path: 'evidence/ProjectDetailTopbar_newgraph_clicked.png' })
    })

})