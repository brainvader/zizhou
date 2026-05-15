/**
 * @context CTX-3: NodeProperty — E2E
 * @note 空状態・description なし表示は Storybook play 関数でカバー済み。
 *       ここでは複数コンポーネント結合（ノード追加 → React Flow クリック → NodeProperty 反映）のみ検証する。
 */
import { test, expect } from '@playwright/test'

test.describe('NodeProperty — Integration', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.locator('[data-testid^="card-"]').first().click()
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
    })

    test('ノード追加 → クリックで NodeProperty にプロパティが表示される', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.getByTestId('node-property').getByText('New Node')).toBeVisible()
        await page.screenshot({ path: 'evidence/NodeProperty_selected.png' })
    })
})