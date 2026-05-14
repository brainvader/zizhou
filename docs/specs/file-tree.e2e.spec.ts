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

const PROJECT_DETAIL_URL = '/projects/1'
const ROOT = '/Users/user/projects/zizou-core'

test.describe('CTX-1 FileTree — Visual Story', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
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
     * graph-01.json をクリックしたあと、URL に ?graph=graph-01 が反映される。
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
//
// 前提: plugin-fs モックの localStorage バックエンドが有効であること。
//       graph-01 / graph-02 は page.evaluate() で localStorage に直接書き込む。
//       exists() はキーの有無で判定するため、事前書き込みが必須。
//       テスト間の localStorage 干渉を防ぐため beforeEach でクリアする。
//
// @note FileTree の表示は readDir モック（静的ツリー）に基づく。
//       useGraphInit の exists() は localStorage のキー有無で判定する。
//       両者は独立したソースのため、事前書き込みなしでは
//       graph-editor が ready になっても resetGraph() が呼ばれる。
// =============================================================================

test.describe('CTX-1 FileTree — グラフ切り替え', () => {

    test.beforeEach(async ({ page }) => {
        // goto → clear の順で干渉を防ぐ
        // （graph-editor.e2e.spec.ts の永続化テストと同じパターン）
        await page.goto(PROJECT_DETAIL_URL)
        await page.evaluate(() => localStorage.clear())
        await expect(page.getByText('Loading…')).toBeHidden()
    })

    /**
     * @story ステップ 9: graph-01 → graph-02 切り替え
     * graph-02.json をクリックすると URL が ?graph=graph-02 に更新され、
     * GraphEditor が graph-02 のノードで再描画される。
     */
    test('step 9: graph-01 → graph-02 に切り替えると URL・GraphEditor・ノードが更新される', async ({ page }) => {
        // graph-01 / graph-02 を localStorage に事前書き込み
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

        // graphs/ を展開
        await page.getByText('graphs').click()
        await expect(page.getByText('graph-01.json')).toBeVisible()
        await expect(page.getByText('graph-02.json')).toBeVisible()

        // graph-01 を選択
        await page.getByText('graph-01.json').click()
        await expect(page).toHaveURL(/\?graph=graph-01/)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.locator('.react-flow__node')).toHaveCount(1)
        await page.screenshot({ path: 'evidence/FileTree_step9_graph-01.png' })

        // graph-02 に切り替え
        await page.getByText('graph-02.json').click()
        await expect(page).toHaveURL(/\?graph=graph-02/)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.locator('.react-flow__node')).toHaveCount(1)
        await page.screenshot({ path: 'evidence/FileTree_step9_graph-02.png' })
    })

})

// =============================================================================
// URL 直打ち復元シナリオ
//
// ?graph=graph-02 で直接アクセスしたとき localStorage から graph-02 が読み込まれる。
// URL SSOT（activeGraphId の根拠が URL の ?graph= パラメータ）の設計を証明する。
// beforeEach を持たず、テスト本体で goto → clear → goto の順で完結させる。
// =============================================================================

test.describe('CTX-1 FileTree — URL 直打ち復元', () => {

    /**
     * @story ステップ 10: ?graph=graph-02 で直アクセスすると graph-02 が読み込まれる
     */
    test('step 10: ?graph=graph-02 で直アクセスすると graph-02 が読み込まれる', async ({ page }) => {
        // まず通常ページに goto して localStorage を操作できる状態にする
        await page.goto(PROJECT_DETAIL_URL)
        await page.evaluate((root) => {
            localStorage.clear()
            localStorage.setItem(
                `${root}/graphs/graph-02.json`,
                JSON.stringify({
                    id: 'graph-02',
                    nodes: [{ id: 'n2', position: { x: 100, y: 100 }, data: { label: 'Node B' } }],
                    edges: [],
                }),
            )
        }, ROOT)

        // ?graph=graph-02 で直接アクセス（リロード耐性の確認）
        await page.goto(`${PROJECT_DETAIL_URL}?graph=graph-02`)
        await expect(page.getByText('Loading…')).toBeHidden()
        await expect(page).toHaveURL(/\?graph=graph-02/)
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.locator('.react-flow__node')).toHaveCount(1)
        await page.screenshot({ path: 'evidence/FileTree_step10_direct-access-graph-02.png' })
    })

})