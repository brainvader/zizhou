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
        await expect(page.getByTestId('input-label')).toHaveValue('New Node')
        await page.screenshot({ path: 'evidence/NodeProperty_selected.png' })
    })
})

/**
 * @context CTX-4: NodeProperty — フォーム編集 E2E
 * @note CTX-3 結合テスト（ノード選択 → 表示確認）に加え、
 *       CTX-4 で追加された編集フォームのシナリオを検証する。
 */

test.describe('NodeProperty — フォーム編集', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.locator('[data-testid^="card-"]').first().click()
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
    })

    // シナリオ A: label を編集して blur → ノード上のラベルが更新される
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

    // シナリオ B: label を空にして blur → エラーが表示され、ノードラベルは変わらない
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

    // シナリオ C: description を編集して blur → 別ノードを選択 → 戻ると値が保持されている
    test('NodeProperty description 編集 → blur で commit → 再選択後も値が保持される', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()

        const descTextarea = page.getByTestId('input-description')
        await expect(descTextarea).toBeVisible()
        await descTextarea.fill('テスト説明文')

        // blur を明示的に発火
        await page.keyboard.press('Tab')

        // 選択解除 → 再選択
        await page.locator('.react-flow__pane').click({ position: { x: 400, y: 400 } })
        await node.click()

        await expect(page.getByTestId('input-description')).toHaveValue('テスト説明文')
        await page.screenshot({ path: 'evidence/CTX4_node_property_desc_persist.png' })
    })
})