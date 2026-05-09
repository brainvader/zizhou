/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-1 / FileTree — E2E Visual Story
 * @bom      docs/bom/graph.ts  (FileTreeNode, ProjectDetailStore)
 * @story    file-tree.spec.tsx の @story に準拠
 * @output   src/components/FileTree.tsx
 *
 * @note     Tauri WebDriver 未対応のため全テスト test.skip。
 *           対応後、test.skip を test に変更して実行する。
 *           スクリーンショットは evidence/ に保存する。
 *
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { test, expect } from '@playwright/test'

// =============================================================================
// Slot 3: セットアップ（E2E 共通）
// =============================================================================

const PROJECT_DETAIL_URL = '/projects/1'

// =============================================================================
// Slot 4: Visual Story
// =============================================================================

test.describe('CTX-1 FileTree — Visual Story', () => {

    /**
     * @story ステップ 1-2: ツリー初期表示
     * マウント時に projectRootPath 配下が再帰読み込みされ、
     * ルートディレクトリ名が表示される状態をスクリーンショットで証明する。
     */
    test.skip('step 1-2: shows root directories on mount', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.locator('#ctx-file-tree')).toBeVisible()
        await expect(page.getByText('src')).toBeVisible()
        await expect(page.getByText('graphs')).toBeVisible()
        await page.screenshot({
            path: 'evidence/FileTree_step1-2_initial.png',
        })
    })

    /**
     * @story ステップ 3: ディレクトリ展開
     * src/ をクリックして子ノードが表示される状態を証明する。
     */
    test.skip('step 3: expands directory on click', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await page.getByText('src').click()
        await expect(page.getByText('components')).toBeVisible()
        await page.screenshot({
            path: 'evidence/FileTree_step3_expanded.png',
        })
    })

    /**
     * @story ステップ 4: ディレクトリ折りたたみ
     * 展開済みを再クリックして子ノードが非表示になる before/after を証明する。
     */
    test.skip('step 4: collapses directory on second click', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await page.getByText('src').click()
        await page.screenshot({ path: 'evidence/FileTree_step4_before_collapse.png' })
        await page.getByText('src').click()
        await expect(page.getByText('components')).not.toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step4_after_collapse.png' })
    })

    /**
     * @story ステップ 7-8: graphs/*.json 選択 → activeGraphId 更新
     * graph-01.json をクリックしたあと、グラフエディタにグラフがロードされた状態を証明する。
     */
    test.skip('step 7-8: selects graph json and updates activeGraphId', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await page.getByText('graphs').click()
        await page.getByText('graph-01.json').click()
        await expect(page.locator('#ctx-graph-editor')).toBeVisible()
        await page.screenshot({
            path: 'evidence/FileTree_step7-8_graph_selected.png',
        })
    })

})