/**
 * @context CTX-3: NodeProperty — E2E
 * @note 空状態・description なし表示は Storybook play 関数でカバー済み。
 *       ここでは複数コンポーネント結合（ノード追加 → React Flow クリック → NodeProperty 反映）のみ検証する。
 */
import { test, expect } from '@playwright/test'

const gotoEditor = async (page: import('@playwright/test').Page) => {
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
    await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('new-graph-btn')).toBeEnabled({ timeout: 10000 })
    await page.getByTestId('new-graph-btn').click()
    await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="graph-editor"]')
        if (!el) return false
        const { width, height } = el.getBoundingClientRect()
        return width > 0 && height > 0
    }, { timeout: 10000 })
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await page.waitForTimeout(500)
}

test.describe('NodeProperty — Integration', () => {

    test.beforeEach(async ({ page }) => {
        await gotoEditor(page)
    })

    test('ノード追加 → クリックで NodeProperty にプロパティが表示される', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.getByTestId('input-label')).toHaveValue('New Node')
        await page.screenshot({ path: 'evidence/NodeProperty_selected.png' })
    })
})

/**
 * @context CTX-4: NodeProperty — フォーム編集 E2E
 */
test.describe('NodeProperty — フォーム編集', () => {

    test.beforeEach(async ({ page }) => {
        await gotoEditor(page)
    })

    test('NodeProperty label 編集 → blur でノードラベルが更新される', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()

        const labelInput = page.getByTestId('input-label')
        await expect(labelInput).toBeVisible()
        await labelInput.fill('UpdatedViaProperty')
        await page.getByTestId('graph-editor').click({ position: { x: 10, y: 10 } })

        await expect(node.getByText('UpdatedViaProperty')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX4_node_property_label_edit.png' })
    })

    test('NodeProperty label を空にして blur → エラー表示・ノードラベル不変', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()

        const labelInput = page.getByTestId('input-label')
        await expect(labelInput).toBeVisible()
        await labelInput.fill('')
        await page.keyboard.press('Tab')

        await expect(page.getByTestId('error-label')).toBeVisible()
        await expect(node.getByText('New Node')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX4_node_property_label_empty.png' })
    })

    test('NodeProperty description 編集 → blur で commit → 再選択後も値が保持される', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()

        const descTextarea = page.getByTestId('input-description')
        await expect(descTextarea).toBeVisible()
        await descTextarea.fill('テスト説明文')
        await page.keyboard.press('Tab')

        await page.locator('.react-flow__pane').click({ position: { x: 400, y: 400 } })
        await node.click()

        await expect(page.getByTestId('input-description')).toHaveValue('テスト説明文')
        await page.screenshot({ path: 'evidence/CTX4_node_property_desc_persist.png' })
    })
})