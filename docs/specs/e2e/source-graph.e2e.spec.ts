/**
 * @context SourceGraphView E2E
 * @note Storybook で確認できないことのみをここで検証する
 *       - projects.$id ページ上での FileTree ↔ SourceGraphView 双方向同期
 *       - Reanalyze All ボタンで analyze_project が呼ばれること
 *       - ノード位置変更後に save_graph が呼ばれること（Position Persist）
 */
import { test, expect } from '@playwright/test'

const PROJECT_URL = '/projects/test-project-1'

test.describe('SourceGraphView: Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.getByRole('link', { name: /test-project-1/i }).click()
        await page.waitForURL(PROJECT_URL)
    })

    // ----------------------------------------------------------
    // File→Node 同期
    // ----------------------------------------------------------

    test.skip('FileTree でファイルをクリックすると対応ノードがハイライトされる', async ({ page }) => {
        const fileTree = page.getByTestId('file-tree')
        await fileTree.getByText('App.tsx').click()

        const node = page.getByTestId('source-node-src/App.tsx')
        await expect(node).toHaveAttribute('data-selected', 'true')

        await page.screenshot({ path: 'evidence/source-graph_file-node-sync.png' })
    })

    // ----------------------------------------------------------
    // Node→File 同期
    // ----------------------------------------------------------

    test.skip('SourceGraphView でノードをクリックすると FileTree の対応ファイルがハイライトされる', async ({ page }) => {
        const node = page.getByTestId('source-node-src/main.ts')
        await node.click()

        const fileTree = page.getByTestId('file-tree')
        await expect(fileTree.getByText('main.ts')).toHaveAttribute('data-selected', 'true')

        await page.screenshot({ path: 'evidence/source-graph_node-file-sync.png' })
    })

    // ----------------------------------------------------------
    // Reanalyze All
    // ----------------------------------------------------------

    test.skip('Reanalyze All ボタンをクリックすると analyze_project が呼ばれノードが更新される', async ({ page }) => {
        const btn = page.getByTestId('reanalyze-all-button')
        await btn.click()

        // ローディング中は disabled になる
        await expect(btn).toBeDisabled()
        // 完了後は再び有効になる
        await expect(btn).toBeEnabled({ timeout: 10_000 })

        await page.screenshot({ path: 'evidence/source-graph_reanalyze-all.png' })
    })

    // ----------------------------------------------------------
    // Position Persist
    // ----------------------------------------------------------

    test.skip('ノードをドラッグ後にページを再読み込みすると位置が保持されている', async ({ page }) => {
        const node = page.getByTestId('source-node-src/App.tsx')
        const box = await node.boundingBox()
        if (!box) throw new Error('node not visible')

        // ドラッグで 100px 右に移動
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2)
        await page.mouse.up()

        // ページ再読み込み
        await page.reload()
        await page.waitForURL(PROJECT_URL)

        const nodeAfter = page.getByTestId('source-node-src/App.tsx')
        const boxAfter = await nodeAfter.boundingBox()
        if (!boxAfter) throw new Error('node not visible after reload')

        // 移動前より右にある
        expect(boxAfter.x).toBeGreaterThan(box.x + 50)

        await page.screenshot({ path: 'evidence/source-graph_position-persist.png' })
    })
})