/**
 * @context CTX-8: Node Type / Status — E2E
 * @note    Storybook で確認できないことのみを検証する。
 *          - 右クリック → SET TYPE → git を選択するとノードのボーダー色が変わる
 *          - 右クリック → SET TYPE → llm を選択するとノードのボーダー色が変わる
 *          - type='edge' の右クリックメニューに SET TYPE が表示されない
 *          - ノードのチェックボックスをクリックすると done ビジュアルになる
 *          - done 状態のチェックボックスを再クリックすると todo に戻る
 *          - グラフ保存後リロードしても nodeType / status が復元される
 */

import { test, expect } from '@playwright/test'

// =============================================================================
// ヘルパー
// =============================================================================

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
    await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
}

const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)

    // New Graph ボタンが有効になるまで待機
    await expect(page.getByTestId('new-graph-btn')).toBeEnabled({ timeout: 10000 })

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

const addNode = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: /ノード追加/ }).click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
}

// =============================================================================
// CTX-8: Set Type via Context Menu
// =============================================================================

test.describe('NodeType — Context Menu [CTX-8]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('右クリック → SET TYPE セクションが表示される', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })

        await expect(page.getByTestId('context-menu')).toBeVisible()
        await expect(page.getByTestId('menu-section-set-type')).toBeVisible()
        await expect(page.getByTestId('menu-item-type-git')).toBeVisible()
        await expect(page.getByTestId('menu-item-type-llm')).toBeVisible()

        await page.screenshot({ path: 'evidence/CTX8_set_type_menu.png' })
    })

    test.skip('SET TYPE → git を選択するとメニューが閉じる', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })
        await page.getByTestId('menu-item-type-git').click()

        await expect(page.getByTestId('context-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX8_set_type_git.png' })
    })

    test.skip('SET TYPE → llm を選択するとノードに llm バッジが表示される', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })
        await page.getByTestId('menu-item-type-llm').click()

        await expect(page.locator('[data-testid="node-type-badge"]').first()).toHaveText('llm')

        await page.screenshot({ path: 'evidence/CTX8_type_badge_llm.png' })
    })

    test.skip('エッジ右クリックメニューに SET TYPE が表示されない', async ({ page }) => {
        await createNewGraph(page)

        // インポートで離れた位置に2ノードを確定配置
        const json = JSON.stringify({
            graph: {
                nodes: [
                    { id: 'a', label: 'Node A', position: { x: 100, y: 200 } },
                    { id: 'b', label: 'Node B', position: { x: 420, y: 200 } },
                ],
                edges: [{ source: 'a', target: 'b' }],
            },
        })
        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })
        await page.getByTestId('import-textarea').fill(json)
        await page.getByTestId('import-submit-btn').click()
        await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 5000 })
        await page.getByRole('button', { name: 'Fit View' }).click()
        await page.waitForTimeout(300)

        const edge = page.locator('.react-flow__edge-interaction').first()
        const box = await edge.boundingBox()
        if (!box) throw new Error('edge bounding box not found')
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })

        await expect(page.getByTestId('context-menu')).toBeVisible()
        await expect(page.getByTestId('menu-section-set-type')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX8_edge_no_set_type.png' })
    })
})

// =============================================================================
// CTX-8: Status Checkbox
// =============================================================================

test.describe('NodeStatus — Checkbox [CTX-8]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('チェックボックスをクリックすると done ビジュアルになる', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const checkbox = page.locator('[data-testid="node-status-checkbox"]').first()
        await checkbox.click()

        const node = page.locator('[data-testid="editable-node"]').first()
        await expect(node).toHaveAttribute('data-status', 'done')

        await page.screenshot({ path: 'evidence/CTX8_status_done.png' })
    })

    test.skip('done 状態のチェックボックスを再クリックすると todo に戻る', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)

        const checkbox = page.locator('[data-testid="node-status-checkbox"]').first()
        await checkbox.click()
        await checkbox.click()

        const node = page.locator('[data-testid="editable-node"]').first()
        await expect(node).toHaveAttribute('data-status', 'todo')

        await page.screenshot({ path: 'evidence/CTX8_status_todo_restored.png' })
    })

})

// =============================================================================
// CTX-8: Persistence — nodeType / status がリロード後に復元される
// =============================================================================

test.describe('NodeType + Status — Persistence [CTX-8]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('nodeType を設定してリロードすると復元される', async ({ page }) => {
        // TODO: invoke('save_graph') 実装後に有効化する
        await createNewGraph(page)
        await addNode(page)

        // llm に設定
        const node = page.locator('.react-flow__node').first()
        await node.click({ button: 'right' })
        await page.getByTestId('menu-item-type-llm').click()
        await expect(page.locator('[data-testid="node-type-badge"]').first()).toHaveText('llm')

        // リロード
        await page.reload()
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })

        await expect(page.locator('[data-testid="node-type-badge"]').first()).toHaveText('llm')
        await page.screenshot({ path: 'evidence/CTX8_persistence_nodetype.png' })
    })

    test.skip('status=done にしてリロードすると復元される', async ({ page }) => {
        // TODO: invoke('save_graph') 実装後に有効化する
        await createNewGraph(page)
        await addNode(page)

        const checkbox = page.locator('[data-testid="node-status-checkbox"]').first()
        await checkbox.click()
        await expect(page.locator('[data-testid="editable-node"]').first()).toHaveAttribute('data-status', 'done')

        await page.waitForTimeout(500)

        await page.reload()
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })

        await expect(page.locator('[data-testid="editable-node"]').first())
            .toHaveAttribute('data-status', 'done', { timeout: 10000 })

        await page.screenshot({ path: 'evidence/CTX8_persistence_status.png' })
    })

})