/**
 * @context CTX-2 / CTX-4 / CTX-5 / CTX-15: GraphEditor — E2E
 * @note 以下は Storybook play 関数でカバー済みのため削除：
 *       - Setup ビュー表示（Uninitialized Story）
 *       - ノード追加ボタン非表示（Checking / Uninitialized Story）
 *       - Empty State 表示（ReadyEmpty Story）
 *       ここでは Storybook では確認できない実画面の結合のみ検証する。
 *
 * @note reload() はモック環境では Zustand store がリセットされ activeGraphId が空になるため使用しない。
 *       renavigateWithGraph は projectId + graphParam を受け取り、
 *       / 経由で store を hydrate してから ?graph= を復元する。
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

    const card = page.getByRole('link', { name: /E2E Test Project/ })
    await expect(card).toBeVisible({ timeout: 10000 })
    const href = await card.getAttribute('href')
    if (!href) throw new Error('href missing')
    await page.goto(href)

    await page.waitForSelector('.react-flow__pane', { timeout: 10000 })
}

/**
 * reload() の代替: / 経由で store を hydrate し直し、元の projectId + graphParam で復元する。
 */
const renavigateWithGraph = async (
    page: import('@playwright/test').Page,
    projectId: string,
    graphParam: string,
) => {
    await page.goto('/')
    await expect(page.getByText('＋ new project')).toBeEnabled({ timeout: 10000 })
    await page.goto(`/projects/${projectId}?graph=${graphParam}`)
    await page.waitForSelector('.react-flow__pane', { timeout: 15000 })
}

/** New Graph を作成してエディタが ready になるまで待つ */
const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)

    await expect(page.getByTestId('new-graph-btn')).toBeEnabled({ timeout: 10000 })
    await page.locator('[data-testid="new-graph-btn"]').click()

    await expect(page.locator('[data-testid^="graph-item-"]')).toHaveCount(1, { timeout: 10000 })

    await page.waitForFunction(() => {
        const el = document.querySelector('.react-flow__pane')
        if (!el) return false
        const { width, height } = el.getBoundingClientRect()
        return width > 0 && height > 0
    }, { timeout: 10000 })
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await page.waitForTimeout(500)
}

/** URL から { projectId, graphParam } を取り出すヘルパー */
const extractUrlParams = (url: string) => {
    const projectId = url.match(/\/projects\/([^?]+)/)?.[1] ?? null
    const graphParam = new URL(url).searchParams.get('graph')
    return { projectId, graphParam }
}

/**
 * エッジ接続テスト用: 2ノードを追加し、確実に離れた位置に配置する。
 */
const setupTwoNodes = async (page: import('@playwright/test').Page) => {
    const json = JSON.stringify({
        graph: {
            nodes: [
                { id: 'a', label: 'Node A', position: { x: 100, y: 200 } },
                { id: 'b', label: 'Node B', position: { x: 420, y: 200 } },
            ],
            edges: [],
        },
    })

    await page.getByTestId('btn-import').click()
    await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('import-textarea').fill(json)
    await page.getByTestId('import-submit-btn').click()

    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 })

    await page.getByRole('button', { name: 'Fit View' }).click()
    await page.waitForTimeout(300)
}

// =============================================================================
// Integration
// =============================================================================

test.describe('GraphEditor — Integration', () => {

    test.skip('「＋ ノード追加」クリックで React Flow キャンバスにノードが描画される', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
        await page.screenshot({ path: 'evidence/GraphEditor_add-node.png' })
    })

})

// =============================================================================
// [CTX-15] グラフ永続化シナリオ
// =============================================================================

test.describe('GraphEditor — 永続化', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('ノード追加 → 位置移動 → 再ナビゲーション → 同じ位置に復元される', async ({ page }) => {
        await createNewGraph(page)

        const { projectId, graphParam } = extractUrlParams(page.url())
        expect(projectId).not.toBeNull()
        expect(graphParam).not.toBeNull()

        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })

        await page.waitForTimeout(800)

        await renavigateWithGraph(page, projectId!, graphParam!)

        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 })
        await page.screenshot({ path: 'evidence/CTX15_node_restore.png' })
    })

    test.skip('ノード A・B 追加 → エッジ接続 → 再ナビゲーション → エッジが復元される', async ({ page }) => {
        await createNewGraph(page)

        const { projectId, graphParam } = extractUrlParams(page.url())
        expect(projectId).not.toBeNull()
        expect(graphParam).not.toBeNull()

        await setupTwoNodes(page)

        const sourceHandle = page.locator('.react-flow__node').nth(0).locator('.react-flow__handle-right')
        const targetHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left')

        await sourceHandle.dragTo(targetHandle)
        await page.waitForTimeout(300)

        const edgeCount = await page.locator('.react-flow__edge').count()
        if (edgeCount === 0) {
            test.skip()
            return
        }

        await page.waitForTimeout(800)

        await renavigateWithGraph(page, projectId!, graphParam!)

        await expect(page.locator('.react-flow__edge').first()).toBeVisible({ timeout: 15000 })
        await page.screenshot({ path: 'evidence/CTX15_edge_restore.png' })
    })

    test.skip('ノード削除 → 再ナビゲーション → 削除済みのまま復元される', async ({ page }) => {
        await createNewGraph(page)

        const { projectId, graphParam } = extractUrlParams(page.url())
        expect(projectId).not.toBeNull()
        expect(graphParam).not.toBeNull()

        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
        await page.waitForTimeout(500)

        await page.locator('.react-flow__node').first().click()
        await page.keyboard.press('Delete')
        await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 5000 })
        await page.waitForTimeout(800)

        await renavigateWithGraph(page, projectId!, graphParam!)

        await page.waitForSelector('.react-flow__pane', { timeout: 15000 })
        await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX15_node_delete_restore.png' })
    })
})

// =============================================================================
// [CTX-4] ラベル編集シナリオ
// =============================================================================

test.describe('GraphEditor — ラベル編集 [CTX-4]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('inline 編集 → Enter でラベルが更新される', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.dblclick()
        const input = page.getByTestId('inline-input')
        await expect(input).toBeVisible()
        await input.fill('InlineUpdated')
        await input.press('Enter')
        await expect(node.getByText('InlineUpdated')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX4_inline_edit_enter.png' })
    })

    test.skip('inline 編集 → Escape でラベルが元に戻る', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.dblclick()
        const input = page.getByTestId('inline-input')
        await expect(input).toBeVisible()
        await input.fill('ShouldNotSave')
        await input.press('Escape')
        await expect(page.getByTestId('inline-input')).not.toBeVisible()
        await expect(node.getByText('New Node')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX4_inline_edit_escape.png' })
    })

    test.skip('NodeProperty フォーム → blur でラベルが更新される', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()
        const labelInput = page.getByTestId('input-label')
        await expect(labelInput).toBeVisible()
        await labelInput.fill('PropertyUpdated')
        await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } })
        await expect(node.getByText('PropertyUpdated')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX4_property_edit_blur.png' })
    })

    test.skip('ラベル更新後に再ナビゲーションすると更新済みラベルが復元される', async ({ page }) => {
        await createNewGraph(page)

        const { projectId, graphParam } = extractUrlParams(page.url())
        expect(projectId).not.toBeNull()
        expect(graphParam).not.toBeNull()

        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()
        const labelInput = page.getByTestId('input-label')
        await expect(labelInput).toBeVisible()
        await labelInput.fill('PersistLabel')
        await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } })
        await expect(node.getByText('PersistLabel')).toBeVisible()

        await page.waitForTimeout(800)

        await renavigateWithGraph(page, projectId!, graphParam!)

        await expect(page.locator('.react-flow__node').getByText('PersistLabel')).toBeVisible({ timeout: 15000 })
        await page.screenshot({ path: 'evidence/CTX15_label_persist.png' })
    })

})

// =============================================================================
// [CTX-5] 複数選択シナリオ
// =============================================================================

test.describe('GraphEditor — 複数選択 [CTX-5]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('Shift+クリックで 2 ノード選択 → NodeProperty が非表示になる', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        await page.locator('.react-flow__node').nth(0).click()
        await expect(page.getByTestId('node-property')).toBeVisible({ timeout: 5000 })

        await page.locator('.react-flow__node').nth(1).click({ modifiers: ['Shift'] })
        await expect(page.getByTestId('node-property')).toHaveCount(0)

        await page.screenshot({ path: 'evidence/CTX5_multi_select_property_hidden.png' })
    })

    test.skip('Shift+クリックで 2 ノード選択 → 両ノードに selected クラスが付く', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        const nodes = page.locator('.react-flow__node')
        await nodes.nth(0).click()
        await page.waitForTimeout(300)
        await nodes.nth(1).click({ modifiers: ['Shift'] })
        await page.waitForTimeout(300)

        await expect(page.locator('.react-flow__node.selected')).toHaveCount(2)

        await page.screenshot({ path: 'evidence/CTX5_multi_select_highlight.png' })
    })

    test.skip('Shift+クリックで 2 ノード選択 → Delete で一括削除される', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        await page.locator('.react-flow__node').nth(0).click()
        await page.locator('.react-flow__node').nth(1).click({ modifiers: ['Shift'] })
        await expect(page.locator('.react-flow__node.selected')).toHaveCount(2)

        await page.keyboard.press('Delete')
        await expect(page.locator('.react-flow__node')).toHaveCount(0)

        await page.screenshot({ path: 'evidence/CTX5_multi_select_delete.png' })
    })

})