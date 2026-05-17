/**
 * @context CTX-2 / CTX-4: GraphEditor — E2E
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

/** / に goto → loadProjects → カードクリック → /projects/1 に遷移して store を hydrate */
const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    await expect(page.getByText('zizou-core')).toBeVisible()
    await page.locator('[data-testid^="card-"]').first().click()
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
}

/** reload() の代替: / 経由で store を hydrate し直し、?graph= パラメータを復元する */
const renavigateWithGraph = async (page: import('@playwright/test').Page, graphParam: string | null) => {
    await page.goto('/')
    await expect(page.getByText('zizou-core')).toBeVisible()
    await page.locator('[data-testid^="card-"]').first().click()
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
    if (graphParam) {
        await page.evaluate((param) => {
            window.history.pushState({}, '', `/projects/1?graph=${param}`)
        }, graphParam)
        await page.waitForTimeout(500)
    }
}

/** New Graph を作成してエディタが ready になるまで待つ */
const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)
    await page.locator('[data-testid="new-graph-btn"]').click()
    // graph-editor コンテナが実際に幅・高さを持つまで待つ
    // ReactFlow は親コンテナのサイズが 0 のとき visibility: hidden のままになる（error#004）
    await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="graph-editor"]')
        if (!el) return false
        const { width, height } = el.getBoundingClientRect()
        return width > 0 && height > 0
    }, { timeout: 10000 })
    // サイズ確定後に resize を発火して ReactFlow に認識させる
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await page.waitForTimeout(500)
}

// =============================================================================
// Integration
// =============================================================================

test.describe('GraphEditor — Integration', () => {

    test('「＋ ノード追加」クリックで React Flow キャンバスにノードが描画される', async ({ page }) => {
        // グラフが選択された状態（ready）で開始する必要があるため createNewGraph を使う
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
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.evaluate(() => localStorage.clear())
    })

    /**
     * シナリオ 1: ノード位置の永続化
     */
    test('ノード追加 → 位置移動 → 再ナビゲーション → 同じ位置に復元される', async ({ page }) => {
        await createNewGraph(page)

        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible({ timeout: 10000 })

        const nodeBefore = await node.boundingBox()
        await page.mouse.move(nodeBefore!.x + nodeBefore!.width / 2, nodeBefore!.y + nodeBefore!.height / 2)
        await page.mouse.down()
        await page.mouse.move(nodeBefore!.x + 200, nodeBefore!.y + 150, { steps: 10 })
        await page.mouse.up()

        await page.waitForTimeout(500)

        const nodeAfterMove = await node.boundingBox()
        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-moved.png' })

        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })

        const nodeAfterReload = await page.locator('.react-flow__node').first().boundingBox()
        expect(nodeAfterReload).not.toBeNull()
        expect(Math.abs(nodeAfterReload!.x - nodeAfterMove!.x)).toBeLessThan(20)
        expect(Math.abs(nodeAfterReload!.y - nodeAfterMove!.y)).toBeLessThan(20)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-restored.png' })
    })

    /**
     * シナリオ 2: エッジの永続化
     */
    test('ノード A・B 追加 → エッジ接続 → 再ナビゲーション → エッジが復元される', async ({ page }) => {
        await createNewGraph(page)

        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node')).toHaveCount(2)

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
        await page.screenshot({ path: 'evidence/GraphEditor_persist_edge-connected.png' })

        const edgeCountBefore = await page.locator('.react-flow__edge').count()

        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })

        await expect(page.locator('.react-flow__node')).toHaveCount(2)
        const edgeCountAfter = await page.locator('.react-flow__edge').count()
        expect(edgeCountAfter).toBe(edgeCountBefore)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_edge-restored.png' })
    })

    /**
     * シナリオ 3: ノード削除の永続化
     */
    test('ノード削除 → 再ナビゲーション → 削除済みのまま復元される', async ({ page }) => {
        await createNewGraph(page)

        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 10000 })

        await page.locator('.react-flow__renderer').click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.locator('.react-flow__node.selected').first()).toBeVisible()
        await page.keyboard.press('Delete')
        await expect(page.locator('.react-flow__node')).toHaveCount(0)

        await page.waitForTimeout(500)
        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-deleted.png' })

        const nodeCountAfterDelete = await page.locator('.react-flow__node').count()

        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('.react-flow__node')).toHaveCount(nodeCountAfterDelete)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-delete-restored.png' })
    })

})

// =============================================================================
// [CTX-4] ラベル編集シナリオ
// =============================================================================

test.describe('GraphEditor — ラベル編集 [CTX-4]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('zizou-core')).toBeVisible()
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
     * @note NodeProperty の編集フォームは CTX-4 NodeProperty 実装後に有効化する
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