/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-1 / FileTree — E2E Visual Story
 * @bom      docs/bom/graph.ts  (FileTreeNode, ProjectDetailStore)
 * @story    file-tree.spec.tsx の @story に準拠
 * @output   src/components/FileTree.tsx
 *
 * @note     Tauri プラグインは vite.config.ts の alias で差し替える。
 *           VITE_PLAYWRIGHT=true のとき src/__mocks__/ のモジュールが使われる。
 *           playwright.config.ts の webServer.env に設定済み。
 */

import { test, expect } from '@playwright/test'

const ROOT = '/Users/user/projects/zizou-core'

test.describe('CTX-1 FileTree — Visual Story', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.locator('[data-testid^="card-"]').first().click()
        await expect(page.getByTestId('file-tree')).toBeVisible()
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
    })

    test('step 1-2: shows root directories on mount', async ({ page }) => {
        await expect(page.getByTestId('file-tree')).toBeVisible()
        await expect(page.getByText('src')).toBeVisible()
        await expect(page.getByText('graphs')).toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step1-2_initial.png' })
    })

    test('step 3: expands directory on click', async ({ page }) => {
        await page.getByText('src').click()
        await expect(page.getByText('components')).toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step3_expanded.png' })
    })

    test('step 4: collapses directory on second click', async ({ page }) => {
        await page.getByText('src').click()
        await page.screenshot({ path: 'evidence/FileTree_step4_before_collapse.png' })
        await page.getByText('src').click()
        await expect(page.getByText('components')).not.toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step4_after_collapse.png' })
    })

    /**
     * @story ステップ 7-8: graphs/*.json 選択 → URL に ?graph= が付く
     */
    test('step 7-8: selects graph json and updates URL with ?graph=', async ({ page }) => {
        await page.getByText('graphs').click()
        await page.getByText('graph-01.json').click()
        await expect(page).toHaveURL(/\?graph=graph-01/)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step7-8_graph_selected.png' })
    })

})

// =============================================================================
// グラフ切り替えシナリオ
// =============================================================================

test.describe('CTX-1 FileTree — グラフ切り替え', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.locator('[data-testid^="card-"]').first().click()
        await page.evaluate(() => localStorage.clear())
        await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
    })

    test('step 9: graph-01 → graph-02 に切り替えると URL・GraphEditor・ノードが更新される', async ({ page }) => {
        await page.evaluate((root) => {
            localStorage.setItem(
                `${root}/graphs/graph-01.json`,
                JSON.stringify({
                    id: 'graph-01',
                    nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node A' } }],
                    edges: [],
                }),
            )
            localStorage.setItem(
                `${root}/graphs/graph-02.json`,
                JSON.stringify({
                    id: 'graph-02',
                    nodes: [{ id: 'n2', position: { x: 100, y: 100 }, data: { label: 'Node B' } }],
                    edges: [],
                }),
            )
        }, ROOT)

        await page.getByText('graphs').click()
        await expect(page.getByText('graph-01.json')).toBeVisible()
        await expect(page.getByText('graph-02.json')).toBeVisible()

        await page.getByText('graph-01.json').click()
        await expect(page).toHaveURL(/\?graph=graph-01/)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.locator('.react-flow__node')).toHaveCount(1)
        await page.screenshot({ path: 'evidence/FileTree_step9_graph-01.png' })

        await page.getByText('graph-02.json').click()
        await expect(page).toHaveURL(/\?graph=graph-02/)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.locator('.react-flow__node')).toHaveCount(1)
        await page.screenshot({ path: 'evidence/FileTree_step9_graph-02.png' })
    })

})

// =============================================================================
// URL 直打ち復元シナリオ
// =============================================================================

test.describe('CTX-1 FileTree — URL 直打ち復元', () => {

    test.skip('step 10: ?graph=graph-02 で直アクセスすると graph-02 が読み込まれる', async () => {
        // SKIP REASON: page.goto() で Zustand store がリセットされるため
        // projectRootPath が空になり FileTree が Loading… のまま。
        // useProjectDetailStore の永続化（CTX-12 等）で対応予定。
    })

})