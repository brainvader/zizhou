/**
 * @context CTX-7: ContextMenu E2E
 * @note Storybook で確認できないことのみを検証する。
 * - ノード右クリックでコンテキストメニューが表示される
 * - メニューから Delete Node を実行するとノードが消える
 * - エッジ右クリックでコンテキストメニューが表示される
 * - メニューから Delete Edge を実行するとエッジが消える
 * - メニューから Edit Label を実行するとインライン編集が起動する
 * - キャンバスクリックでメニューが閉じる
 */
import { test, expect } from '@playwright/test'

/** / に goto → プロジェクト作成 → プロジェクト詳細へ遷移 */
const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
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
}

/** New Graph を作成してエディタが ready になるまで待つ */
const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)

    // New Graph ボタンが有効になるまで待機
    await expect(page.getByTestId('new-graph-btn')).toBeEnabled({ timeout: 10000 })

    await page.locator('[data-testid="new-graph-btn"]').click()
    await page.waitForFunction(() => {
        const el = document.querySelector('.react-flow__pane')
        if (!el) return false
        const { width, height } = el.getBoundingClientRect()
        return width > 0 && height > 0
    }, { timeout: 10000 })
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await page.waitForTimeout(500)
}

/** ノードを追加して表示されるまで待つ */
const addNode = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: /ノード追加/ }).click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
}

// =============================================================================
// CTX-7: Context Menu — Node
// =============================================================================

test.describe('ContextMenu — Node [CTX-7]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test('ノード右クリックで context-menu が表示される', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })

        await expect(page.getByTestId('context-menu')).toBeVisible()
        await expect(page.getByTestId('menu-item-edit-label')).toBeVisible()
        await expect(page.getByTestId('menu-item-delete')).toBeVisible()
        await expect(page.getByTestId('menu-item-delete')).toHaveText('Delete Node')

        await page.screenshot({ path: 'evidence/CTX7_node_context_menu.png' })
    })

    test('Delete Node クリックでノードが削除される', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })
        await expect(page.getByTestId('context-menu')).toBeVisible()

        await page.getByTestId('menu-item-delete').click()

        await expect(page.locator('.react-flow__node')).toHaveCount(0)
        await expect(page.getByTestId('context-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX7_delete_node.png' })
    })

    test('Edit Label クリックでインライン編集が起動する', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })
        await expect(page.getByTestId('context-menu')).toBeVisible()

        await page.getByTestId('menu-item-edit-label').click()

        await expect(page.getByTestId('context-menu')).not.toBeVisible()
        await expect(page.getByTestId('inline-input')).toBeVisible()

        await page.screenshot({ path: 'evidence/CTX7_edit_label.png' })
    })

    test('キャンバスクリックで context-menu が閉じる', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })
        await expect(page.getByTestId('context-menu')).toBeVisible()

        const pane = page.locator('.react-flow__pane')
        const box = await pane.boundingBox()
        if (!box) throw new Error('pane not found')
        await page.mouse.click(box.x + box.width - 10, box.y + 10)

        await expect(page.getByTestId('context-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX7_close_on_pane_click.png' })
    })

})