/**
 * @context CTX-7: ContextMenu E2E
 * @note Storybook で確認できないことのみを検証する。
 *       - ノード右クリックでコンテキストメニューが表示される
 *       - メニューから Delete Node を実行するとノードが消える
 *       - エッジ右クリックでコンテキストメニューが表示される
 *       - メニューから Delete Edge を実行するとエッジが消える
 *       - メニューから Edit Label を実行するとインライン編集が起動する
 *       - キャンバスクリックでメニューが閉じる
 */
import { test, expect } from '@playwright/test'

/** / に goto → カードクリック → プロジェクト詳細へ遷移 */
const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    await expect(page.getByText('zizou-core')).toBeVisible()
    await page.locator('[data-testid^="card-"]').first().click()
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
}

/** New Graph を作成してエディタが ready になるまで待つ */
const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)
    await page.locator('[data-testid="new-graph-btn"]').click()
    await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="graph-editor"]')
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

        await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } })

        await expect(page.getByTestId('context-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX7_close_on_pane_click.png' })
    })

})

// =============================================================================
// CTX-7: Context Menu — Edge
// =============================================================================

test.describe('ContextMenu — Edge [CTX-7]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    /** 2ノードを追加してエッジを接続するヘルパー */
    const connectTwoNodes = async (page: import('@playwright/test').Page) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 })

        const nodeA = page.locator('.react-flow__node').nth(0)
        const nodeB = page.locator('.react-flow__node').nth(1)
        const sourceHandle = nodeA.locator('.react-flow__handle-right, .react-flow__handle-bottom').first()
        const targetHandle = nodeB.locator('.react-flow__handle-left, .react-flow__handle-top').first()

        const sourceBox = await sourceHandle.boundingBox()
        const targetBox = await targetHandle.boundingBox()

        if (sourceBox && targetBox) {
            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
            await page.mouse.down()
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })
            await page.mouse.up()
        }
        await page.waitForTimeout(500)
        await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 })
    }

    test('エッジ右クリックで context-menu が表示される（Edit Label なし）', async ({ page }) => {
        await createNewGraph(page)
        await connectTwoNodes(page)

        const edge = page.locator('.react-flow__edge').first()
        await edge.click({ button: 'right' })

        await expect(page.getByTestId('context-menu')).toBeVisible()
        await expect(page.getByTestId('menu-item-edit-label')).not.toBeVisible()
        await expect(page.getByTestId('menu-item-delete')).toBeVisible()
        await expect(page.getByTestId('menu-item-delete')).toHaveText('Delete Edge')

        await page.screenshot({ path: 'evidence/CTX7_edge_context_menu.png' })
    })

    test('Delete Edge クリックでエッジが削除される', async ({ page }) => {
        await createNewGraph(page)
        await connectTwoNodes(page)

        const edge = page.locator('.react-flow__edge').first()
        await edge.click({ button: 'right' })
        await expect(page.getByTestId('context-menu')).toBeVisible()

        await page.getByTestId('menu-item-delete').click()

        await expect(page.locator('.react-flow__edge')).toHaveCount(0)
        await expect(page.getByTestId('context-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX7_delete_edge.png' })
    })

})