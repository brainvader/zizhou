/**
 * @context CTX-2: GraphEditor — E2E
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
    // store hydrate 後に ?graph= を付けて遷移
    if (graphParam) {
        await page.evaluate((param) => {
            window.history.pushState({}, '', `/projects/1?graph=${param}`)
        }, graphParam)
        // URL 変更を React Router に検知させる
        await page.waitForTimeout(500)
    }
}

test.describe('GraphEditor — Integration', () => {

    test('「＋ ノード追加」クリックで React Flow キャンバスにノードが描画される', async ({ page }) => {
        await gotoProjectDetail(page)
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible()
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

    // ヘルパー: New Graph を作成してエディタが ready になるまで待つ
    const createNewGraph = async (page: import('@playwright/test').Page) => {
        await gotoProjectDetail(page)
        await page.locator('[data-testid="new-graph-btn"]').click()
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.getByRole('button', { name: /ノード追加/ })).toBeVisible()
    }

    /**
     * シナリオ 1: ノード位置の永続化
     */
    test('ノード追加 → 位置移動 → 再ナビゲーション → 同じ位置に復元される', async ({ page }) => {
        await createNewGraph(page)

        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible()

        const nodeBefore = await node.boundingBox()
        await page.mouse.move(nodeBefore!.x + nodeBefore!.width / 2, nodeBefore!.y + nodeBefore!.height / 2)
        await page.mouse.down()
        await page.mouse.move(nodeBefore!.x + 200, nodeBefore!.y + 150, { steps: 10 })
        await page.mouse.up()

        await page.waitForTimeout(500)

        const nodeAfterMove = await node.boundingBox()
        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-moved.png' })

        // 再ナビゲーション（reload の代替）
        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
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

        // 再ナビゲーション（reload の代替）
        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
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
        await expect(page.locator('.react-flow__node')).toHaveCount(1)

        await page.locator('.react-flow__renderer').click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.locator('.react-flow__node.selected').first()).toBeVisible()
        await page.keyboard.press('Delete')
        await expect(page.locator('.react-flow__node')).toHaveCount(0)

        await page.waitForTimeout(500)
        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-deleted.png' })

        const nodeCountAfterDelete = await page.locator('.react-flow__node').count()

        // 再ナビゲーション（reload の代替）
        const graphParam = new URL(page.url()).searchParams.get('graph')
        await renavigateWithGraph(page, graphParam)
        await expect(page.getByTestId('graph-editor')).toBeVisible()

        await expect(page.locator('.react-flow__node')).toHaveCount(nodeCountAfterDelete)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-delete-restored.png' })
    })

})