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
        const newProjectBtn = page.getByText('＋ new project')
        await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
        await newProjectBtn.click()
        await page.waitForSelector('[role="dialog"]')
        await page.getByPlaceholder('My Awesome App').fill('E2E Test Project')
        await page.getByPlaceholder('/Users/user/projects/my-app').fill('/tmp/e2e-test')
        await page.getByRole('button', { name: '作成' }).click()
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
        await page.getByRole('link', { name: 'E2E Test Project' }).click()
        await page.waitForSelector('.react-flow__pane', { timeout: 10000 })
        await expect(page.locator(NEW_GRAPH_BTN_SELECTOR)).toBeEnabled({ timeout: 10000 })
        await page.locator(NEW_GRAPH_BTN_SELECTOR).click()
        await expect(page).toHaveURL(/\?graph=/)
        await page.screenshot({ path: 'evidence/ProjectDetailTopbar_newgraph_clicked.png' })
    })

})