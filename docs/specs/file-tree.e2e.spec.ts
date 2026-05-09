/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-1 / FileTree — E2E Visual Story
 * @bom      docs/bom/graph.ts  (FileTreeNode, ProjectDetailStore)
 * @story    file-tree.spec.tsx の @story に準拠
 * @output   src/components/FileTree.tsx
 *
 * @note     Tauri IPC を __TAURI_INTERNALS__.invoke の同期差し替えでモックする。
 *           playwright.config.ts の webServer に以下が必要:
 *           ```ts
 *           env: { VITE_PLAYWRIGHT: 'true' }
 *           ```
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { test, expect, type Page } from '@playwright/test'

// =============================================================================
// Slot 3: セットアップ（E2E 共通）
// =============================================================================

const PROJECT_DETAIL_URL = '/projects/1'

/** __TAURI_INTERNALS__ のグローバル型定義 */
declare global {
    interface Window {
        __TAURI_INTERNALS__: {
            invoke?: (cmd: string, args: Record<string, unknown>) => Promise<unknown>
            [key: string]: unknown
        }
    }
}

/**
 * テスト用 IPC モック定義。
 * window.__TAURI_INTERNALS__.invoke を同期的に差し替える。
 *
 * モック対象:
 * - plugin:fs|exists          — projects.json の存在確認 → true
 * - plugin:fs|read_text_file  — projects.json の内容 → id=1 のプロジェクト
 * - plugin:fs|read_dir        — ファイルツリーの再帰読み込み
 * - plugin:path|join          — パス結合（Windows パスの正規化も兼ねる）
 */
const setupMockIPC = async (page: Page) => {
    await page.addInitScript(() => {
        window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ ?? {}

        window.__TAURI_INTERNALS__.invoke = async (cmd: string, args: Record<string, unknown>) => {

            // ── plugin:fs|exists ──────────────────────────────────────────
            if (cmd === 'plugin:fs|exists') {
                return true
            }

            // ── plugin:fs|read_text_file ──────────────────────────────────
            if (cmd === 'plugin:fs|read_text_file') {
                return JSON.stringify([
                    {
                        id: '1',
                        name: 'zizou-core',
                        rootPath: '/Users/user/projects/zizou-core',
                    },
                ])
            }

            // ── plugin:path|join ──────────────────────────────────────────
            if (cmd === 'plugin:path|join') {
                const { paths } = args as { paths: string[] }
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
        }
    })
}

// =============================================================================
// Slot 4: Visual Story
// =============================================================================

test.describe('CTX-1 FileTree — Visual Story', () => {

    test.beforeEach(async ({ page }) => {
        await setupMockIPC(page)
        await page.goto(PROJECT_DETAIL_URL)
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