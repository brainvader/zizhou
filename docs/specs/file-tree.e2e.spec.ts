/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-1 / FileTree — E2E Visual Story
 * @bom      docs/bom/graph.ts  (FileTreeNode, ProjectDetailStore)
 * @story    file-tree.spec.tsx の @story に準拠
 * @output   src/components/FileTree.tsx
 *
 * @note     Tauri IPC を mockIPC でモックして dev サーバー上で動作する。
 *           index.html に VITE_PLAYWRIGHT ガードが必要（下記参照）。
 *
 *           index.html に以下を追加すること:
 *           ```html
 *           <script type="module">
 *             if (import.meta.env.VITE_PLAYWRIGHT) {
 *               const { mockIPC } = await import('@tauri-apps/api/mocks')
 *               window.mockIPC = mockIPC
 *             }
 *           </script>
 *           ```
 *
 *           playwright.config.ts の webServer に以下を追加すること:
 *           ```ts
 *           env: { VITE_PLAYWRIGHT: 'true' }
 *           ```
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { test, expect, type Page } from '@playwright/test'
import type { mockIPC } from '@tauri-apps/api/mocks'

// =============================================================================
// Slot 3: セットアップ（E2E 共通）
// =============================================================================

const APP_URL = 'http://localhost:1420'
const PROJECT_DETAIL_URL = `${APP_URL}/projects/1`

/** mockIPC のグローバル型定義 */
declare global {
    interface Window {
        mockIPC: typeof mockIPC
    }
}

/**
 * テスト用ファイルツリーの IPC モック定義。
 * plugin:fs|read_dir  — path をキーにしたマップで DirEntry[] を返す。
 * plugin:path|join    — パスを '/' で結合して返す（Windows パスの検証も兼ねる）。
 */
const setupMockIPC = async (page: Page) => {
    await page.evaluate(() => {
        window.mockIPC((cmd, args) => {
            // ── plugin:path|join ──────────────────────────────────────────
            if (cmd === 'plugin:path|join') {
                const { paths } = args as { paths: string[] }
                // OS セパレータに依存しない結合（Windows の \ も正規化）
                return paths.join('/').replace(/\/+/g, '/')
            }

            // ── plugin:fs|read_dir ────────────────────────────────────────
            if (cmd === 'plugin:fs|read_dir') {
                const { path } = args as { path: string }

                const tree: Record<string, Array<{
                    name: string
                    isFile: boolean
                    isDirectory: boolean
                    isSymlink: boolean
                }>> = {
                    '/Users/user/projects/zizou-core': [
                        { name: 'src', isFile: false, isDirectory: true, isSymlink: false },
                        { name: 'graphs', isFile: false, isDirectory: true, isSymlink: false },
                    ],
                    '/Users/user/projects/zizou-core/src': [
                        { name: 'components', isFile: false, isDirectory: true, isSymlink: false },
                    ],
                    '/Users/user/projects/zizou-core/src/components': [
                        { name: 'FileTree.tsx', isFile: true, isDirectory: false, isSymlink: false },
                    ],
                    '/Users/user/projects/zizou-core/graphs': [
                        { name: 'graph-01.json', isFile: true, isDirectory: false, isSymlink: false },
                        { name: 'graph-02.json', isFile: true, isDirectory: false, isSymlink: false },
                    ],
                }

                return tree[path] ?? []
            }
        })
    })
}

// =============================================================================
// Slot 4: Visual Story
// =============================================================================

test.describe('CTX-1 FileTree — Visual Story', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await setupMockIPC(page)
    })

    /**
     * @story ステップ 1-2: ツリー初期表示
     * マウント時に readDir が呼ばれ、ルートディレクトリが表示される。
     */
    test('step 1-2: shows root directories on mount', async ({ page }) => {
        await expect(page.locator('#ctx-file-tree')).toBeVisible()
        await expect(page.getByText('src')).toBeVisible()
        await expect(page.getByText('graphs')).toBeVisible()
        await page.screenshot({
            path: 'evidence/FileTree_step1-2_initial.png',
        })
    })

    /**
     * @story ステップ 3: ディレクトリ展開
     * src/ をクリックして子ノードが表示される。
     */
    test('step 3: expands directory on click', async ({ page }) => {
        await page.getByText('src').click()
        await expect(page.getByText('components')).toBeVisible()
        await page.screenshot({
            path: 'evidence/FileTree_step3_expanded.png',
        })
    })

    /**
     * @story ステップ 4: ディレクトリ折りたたみ
     * 展開済みを再クリックして子ノードが非表示になる。
     */
    test('step 4: collapses directory on second click', async ({ page }) => {
        await page.getByText('src').click()
        await page.screenshot({ path: 'evidence/FileTree_step4_before_collapse.png' })
        await page.getByText('src').click()
        await expect(page.getByText('components')).not.toBeVisible()
        await page.screenshot({ path: 'evidence/FileTree_step4_after_collapse.png' })
    })

    /**
     * @story ステップ 7-8: graphs/*.json 選択 → activeGraphId 更新
     * graph-01.json をクリックしたあと、グラフエディタに切り替わる。
     * Windows パスの isGraphJson 正規表現の動作も同時に検証する。
     */
    test('step 7-8: selects graph json and updates activeGraphId', async ({ page }) => {
        await page.getByText('graphs').click()
        await page.getByText('graph-01.json').click()
        await expect(page.locator('#ctx-graph-editor')).toBeVisible()
        await page.screenshot({
            path: 'evidence/FileTree_step7-8_graph_selected.png',
        })
    })

})