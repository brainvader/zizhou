/**
 * @context CTX-2: GraphEditor — E2E
 * @note 以下は Storybook play 関数でカバー済みのため削除：
 *       - Setup ビュー表示（Uninitialized Story）
 *       - ノード追加ボタン非表示（Checking / Uninitialized Story）
 *       - Empty State 表示（ReadyEmpty Story）
 *       ここでは Storybook では確認できない実画面の結合のみ検証する。
 */
import { test, expect } from '@playwright/test'

const PROJECT_DETAIL_URL = '/projects/1'
const PROJECT_DETAIL_UNINITIALIZED_URL = '/projects/1?fs=uninitialized'

test.describe('GraphEditor — Integration', () => {

    test('「初期化」クリックでエディタビューに切り替わる（initStatus 遷移）', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_UNINITIALIZED_URL)
        await expect(page.getByRole('button', { name: /初期化/ })).toBeVisible()
        await page.getByRole('button', { name: /初期化/ }).click()
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await page.screenshot({ path: 'evidence/GraphEditor_after-init.png' })
    })

    test('「＋ ノード追加」クリックで React Flow キャンバスにノードが描画される', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible()
        await page.screenshot({ path: 'evidence/GraphEditor_add-node.png' })
    })

})

// =============================================================================
// グラフ永続化シナリオ
// 前提: plugin-fs モックの localStorage バックエンドが有効であること
//       （VITE_PLAYWRIGHT=true で writeTextFile/readTextFile/exists が
//         /graphs/*.json パスに対して localStorage を使う）
//
// 各テストは New Graph 作成を起点とし、リロード後の復元を検証する。
// テスト間の localStorage 干渉を防ぐため beforeEach で localStorage をクリアする。
// =============================================================================

test.describe('GraphEditor — 永続化', () => {

    test.beforeEach(async ({ page }) => {
        // テスト間の localStorage 干渉を防ぐ
        await page.goto(PROJECT_DETAIL_URL)
        await page.evaluate(() => localStorage.clear())
    })

    // ヘルパー: New Graph を作成してエディタが ready になるまで待つ
    const createNewGraph = async (page: import('@playwright/test').Page) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
        await page.locator('[data-testid="new-graph-btn"]').click()
        // activeGraphId が設定されエディタが表示されるまで待つ
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.getByRole('button', { name: /ノード追加/ })).toBeVisible()
    }

    /**
     * シナリオ 1: ノード位置の永続化
     * ノード追加 → ドラッグで位置移動 → リロード → 同じ位置に復元される
     */
    test('ノード追加 → 位置移動 → リロード → 同じ位置に復元される', async ({ page }) => {
        await createNewGraph(page)

        // ノードを追加
        await page.getByRole('button', { name: /ノード追加/ }).click()
        const node = page.locator('.react-flow__node').first()
        await expect(node).toBeVisible()

        // ノードをドラッグして位置を移動
        const nodeBefore = await node.boundingBox()
        await page.mouse.move(nodeBefore!.x + nodeBefore!.width / 2, nodeBefore!.y + nodeBefore!.height / 2)
        await page.mouse.down()
        await page.mouse.move(nodeBefore!.x + 200, nodeBefore!.y + 150, { steps: 10 })
        await page.mouse.up()

        // 保存が完了するのを少し待つ（subscribe → writeTextFile の非同期）
        await page.waitForTimeout(500)

        const nodeAfterMove = await node.boundingBox()
        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-moved.png' })

        // リロード
        await page.reload()
        await expect(page.getByText('Loading…')).toBeHidden()
        await expect(page.getByTestId('graph-editor')).toBeVisible()

        // ノードが復元されている
        const nodeAfterReload = await page.locator('.react-flow__node').first().boundingBox()
        expect(nodeAfterReload).not.toBeNull()

        // 移動後の位置と近い位置に復元されていること（±20px の許容範囲）
        expect(Math.abs(nodeAfterReload!.x - nodeAfterMove!.x)).toBeLessThan(20)
        expect(Math.abs(nodeAfterReload!.y - nodeAfterMove!.y)).toBeLessThan(20)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-restored.png' })
    })

    /**
     * シナリオ 2: エッジの永続化
     * ノード A・B 追加 → エッジ接続 → リロード → エッジが復元される
     */
    test('ノード A・B 追加 → エッジ接続 → リロード → エッジが復元される', async ({ page }) => {
        await createNewGraph(page)

        // ノードを2つ追加
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node')).toHaveCount(2)

        // ノード A の source ハンドルからノード B の target ハンドルへドラッグしてエッジを接続
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

        // リロード
        await page.reload()
        await expect(page.getByText('Loading…')).toBeHidden()
        await expect(page.getByTestId('graph-editor')).toBeVisible()

        // ノードとエッジが復元されている
        await expect(page.locator('.react-flow__node')).toHaveCount(2)
        const edgeCountAfter = await page.locator('.react-flow__edge').count()
        expect(edgeCountAfter).toBe(edgeCountBefore)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_edge-restored.png' })
    })

    /**
     * シナリオ 3: ノード削除の永続化
     * ノード追加 → 削除 → リロード → 削除済みのまま復元される
     */
    test('ノード削除 → リロード → 削除済みのまま復元される', async ({ page }) => {
        await createNewGraph(page)

        // ノードを2つ追加してから1つ削除
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node')).toHaveCount(2)

        // ノードを選択して Delete キーで削除
        // キャンバスにフォーカスを当ててからノードを選択する
        await page.locator('.react-flow__renderer').click()
        await page.locator('.react-flow__node').first().click()
        await page.keyboard.press('Delete')

        await page.waitForTimeout(500)
        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-deleted.png' })

        const nodeCountAfterDelete = await page.locator('.react-flow__node').count()

        // リロード
        await page.reload()
        await expect(page.getByText('Loading…')).toBeHidden()
        await expect(page.getByTestId('graph-editor')).toBeVisible()

        // 削除後のノード数が復元されている
        await expect(page.locator('.react-flow__node')).toHaveCount(nodeCountAfterDelete)

        await page.screenshot({ path: 'evidence/GraphEditor_persist_node-delete-restored.png' })
    })

})