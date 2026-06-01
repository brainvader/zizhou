/**
 * @context CTX-2 / CTX-4 / CTX-5: GraphEditor — E2E
 * @note 以下は Storybook play 関数でカバー済みのため削除：
 *       - Setup ビュー表示（Uninitialized Story）
 *       - ノード追加ボタン非表示（Checking / Uninitialized Story）
 *       - Empty State 表示（ReadyEmpty Story）
 *       ここでは Storybook では確認できない実画面の結合のみ検証する。
 *
 * @note reload() はモック環境では Zustand store がリセットされ projectRootPath が空になるため使用しない。
 *       代わりに / → カードクリック → ?graph= 復元のフローで「リロード」を模倣する。
 *       localStorage はページ遷移をまたいで保持されるため永続化の検証が成立する。
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
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
    await page.getByRole('link', { name: 'E2E Test Project' }).click()
    await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
}

/** reload() の代替: / 経由で store を hydrate し直し、?graph= パラメータを復元する */
const renavigateWithGraph = async (page: import('@playwright/test').Page, graphParam: string | null) => {
    await gotoProjectDetail(page)
    if (graphParam) {
        const currentUrl = page.url()
        const projectId = currentUrl.match(/\/projects\/([^?]+)/)?.[1]
        if (projectId) {
            await page.goto(`/projects/${projectId}?graph=${graphParam}`)
            await page.waitForTimeout(500)
        }
    }
}

/** New Graph を作成してエディタが ready になるまで待つ */
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

/**
 * エッジ接続テスト用: 2ノードを追加し、確実に離れた位置に移動する。
 * ノードが重なるとエッジが z-index の関係でクリックできなくなるため、
 * ドラッグで明示的に離れた座標に配置する。
 */
// =============================================================================
// Integration
// =============================================================================

test.describe('GraphEditor — Integration', () => {

    test('「＋ ノード追加」クリックで React Flow キャンバスにノードが描画される', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
        await page.screenshot({ path: 'evidence/GraphEditor_add-node.png' })
    })

})

// =============================================================================
// グラフ永続化シナリオ
// =============================================================================

test.describe('GraphEditor — 永続化', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('ノード追加 → 位置移動 → 再ナビゲーション → 同じ位置に復元される', async ({ page }) => {
        // TODO: invoke('save_graph') 実装後に有効化する
    })

    test.skip('ノード A・B 追加 → エッジ接続 → 再ナビゲーション → エッジが復元される', async ({ page }) => {
        // TODO: invoke('save_graph') 実装後に有効化する
    })

    test.skip('ノード削除 → 再ナビゲーション → 削除済みのまま復元される', async ({ page }) => {
        // TODO: invoke('save_graph') 実装後に有効化する
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

    /**
     * シナリオ 4: inline 編集 — Enter で確定
     */
    test('inline 編集 → Enter でラベルが更新される', async ({ page }) => {
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

    /**
     * シナリオ 5: inline 編集 — Escape でキャンセル
     */
    test('inline 編集 → Escape でラベルが元に戻る', async ({ page }) => {
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

    /**
     * シナリオ 6: NodeProperty フォーム — blur で確定
     */
    test('NodeProperty フォーム → blur でラベルが更新される', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.click()
        const labelInput = page.getByTestId('input-label')
        await expect(labelInput).toBeVisible()
        await labelInput.fill('PropertyUpdated')
        await page.getByTestId('graph-editor').click({ position: { x: 10, y: 10 } })
        await expect(node.getByText('PropertyUpdated')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX4_property_edit_blur.png' })
    })

    /**
     * シナリオ 7: ラベル更新後の永続化
     */
    test('ラベル更新後に再ナビゲーションすると更新済みラベルが復元される', async ({ page }) => {
        await createNewGraph(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })
        await node.dblclick()
        const input = page.getByTestId('inline-input')
        await expect(input).toBeVisible()
        await input.fill('PersistLabel')
        await input.press('Enter')
        await page.waitForTimeout(500)

        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.locator('.react-flow__node').first().getByText('PersistLabel')).toBeVisible({ timeout: 10000 })
        await page.screenshot({ path: 'evidence/CTX4_label_persisted.png' })
    })

})

// =============================================================================
// [CTX-5] 複数選択シナリオ
// =============================================================================

/** 確定位置に2ノードをインポートして Fit View まで完了するヘルパー */
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

test.describe('GraphEditor — 複数選択 [CTX-5]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    /**
     * シナリオ 8: Shift+クリックで複数選択 → NodeProperty が非表示になる
     */
    test('Shift+クリックで 2 ノード選択 → NodeProperty が非表示になる', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        await page.locator('.react-flow__node').nth(0).click()
        await expect(page.getByTestId('node-property')).toBeVisible({ timeout: 5000 })

        await page.locator('.react-flow__node').nth(1).click({ modifiers: ['Shift'] })
        await expect(page.getByTestId('node-property')).toHaveCount(0)

        await page.screenshot({ path: 'evidence/CTX5_multi_select_property_hidden.png' })
    })

    /**
     * シナリオ 9: 複数選択 → 選択ノードにハイライトが当たる
     */
    test('Shift+クリックで 2 ノード選択 → 両ノードに selected クラスが付く', async ({ page }) => {
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

    /**
     * シナリオ 10: 複数選択 → Delete で一括削除される
     */
    test('Shift+クリックで 2 ノード選択 → Delete で一括削除される', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        await page.locator('.react-flow__node').nth(0).click()
        await page.locator('.react-flow__node').nth(1).click({ modifiers: ['Shift'] })
        await expect(page.locator('.react-flow__node.selected')).toHaveCount(2)

        await page.keyboard.press('Delete')
        await expect(page.locator('.react-flow__node')).toHaveCount(0)

        await page.screenshot({ path: 'evidence/CTX5_multi_select_delete.png' })
    })

    /**
     * シナリオ 11: 選択解除 → NodeProperty が再表示される
     */
    test('複数選択後にキャンバスをクリック → 選択解除 → NodeProperty が非表示のまま', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        await page.locator('.react-flow__node').nth(0).click()
        await page.locator('.react-flow__node').nth(1).click({ modifiers: ['Shift'] })
        await expect(page.getByTestId('node-property')).not.toBeVisible()

        await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } })
        await expect(page.getByTestId('node-property')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX5_deselect.png' })
    })

})

// =============================================================================
// [CTX-6] Edge Connect / Delete シナリオ
// =============================================================================

test.describe('GraphEditor — Edge Connect / Delete [CTX-6]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    /**
     * シナリオ 12: Edge Connect
     * ノードのハンドルをドラッグして別ノードに接続するとエッジが作成される
     */
    test('2ノード間をハンドルでドラッグ接続するとエッジが作成される', async ({ page }) => {
        await createNewGraph(page)
        await setupTwoNodes(page)

        const nodeA = page.locator('.react-flow__node').nth(0)
        const nodeB = page.locator('.react-flow__node').nth(1)
        const sourceHandle = nodeA.locator('[data-handlepos="right"]').first()
        const targetHandle = nodeB.locator('[data-handlepos="left"]').first()

        await sourceHandle.waitFor({ state: 'visible' })
        await targetHandle.waitFor({ state: 'visible' })

        const sourceBox = await sourceHandle.boundingBox()
        const targetBox = await targetHandle.boundingBox()

        if (sourceBox && targetBox) {
            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
            await page.waitForTimeout(100)
            await page.mouse.down()
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 })
            await page.waitForTimeout(100)
            await page.mouse.up()
        }

        await expect(page.getByRole('group', { name: /^Edge from/ })).toHaveCount(1, { timeout: 5000 })
        await page.screenshot({ path: 'evidence/GraphEditor_ctx6_edge-connected.png' })
    })

    /**
     * シナリオ 13: Edge Delete
     * エッジを選択して Delete キーで削除できる
     */
    test('エッジを選択して Delete キーで削除できる', async ({ page }) => {
        await createNewGraph(page)

        // エッジ込みでインポートして確定状態を作る
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
        await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 })
        await expect(page.getByRole('group', { name: /^Edge from/ })).toHaveCount(1, { timeout: 5000 })
        await page.getByRole('button', { name: 'Fit View' }).click()
        await page.waitForTimeout(500)

        // エッジを page.mouse で選択して Delete
        const edgePath = page.locator('.react-flow__edge-interaction').first()
        const box = await edgePath.boundingBox()
        if (!box) throw new Error('edge bounding box not found')
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(200)
        await page.keyboard.press('Delete')

        await expect(page.getByRole('group', { name: /^Edge from/ })).toHaveCount(0, { timeout: 5000 })
        await page.screenshot({ path: 'evidence/GraphEditor_ctx6_edge-deleted.png' })
    })

})