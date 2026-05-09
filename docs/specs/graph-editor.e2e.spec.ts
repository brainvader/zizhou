/**
 * Slot 1: 発注用ヘッダー
 * @context CTX-2: GraphEditor (E2E)
 * @bom docs/bom/graph.ts
 * @story
 * 1. Project Detail ページを開く（initStatus は graphs/ の有無によって変化）
 * 2. graphs/ が存在しない場合、エディタ領域に Setup ビューが表示される
 * 3. 「初期化」ボタンをクリックすると graphs/ が作成されエディタビューに切り替わる
 * 4. 「＋ ノード追加」ボタンをクリックするとノードがキャンバスに追加される
 * 5. 追加したノードをクリックすると Properties ペインにノード情報が表示される
 * @output src/components/GraphEditor.tsx
 */

import { test, expect } from '@playwright/test'

// Tauri WebDriver 未対応のため全テストスキップ
// 実装完了後、Tauri WebDriver 対応時に解除する

test.describe('GraphEditor: Setup View', () => {
    test.skip('graphs/ が存在しない場合 Setup ビューが表示される', async ({ page }) => {
        // TODO: Tauri WebDriver 対応後に実装
        // graphs/ を削除した状態でページを開く
        await page.goto('/projects/1')
        await expect(page.getByRole('button', { name: /初期化/ })).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_setup-view.png' })
    })

    test.skip('「初期化」ボタンクリックでエディタビューに切り替わる', async ({ page }) => {
        await page.goto('/projects/1')
        await page.getByRole('button', { name: /初期化/ }).click()
        // initStatus が 'ready' になりエディタが表示される
        await expect(page.getByTestId('react-flow')).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_after-init.png' })
    })
})

test.describe('GraphEditor: Add Node', () => {
    test.skip('「＋ ノード追加」クリックでノードがキャンバスに追加される', async ({ page }) => {
        await page.goto('/projects/1')
        // graphs/ が存在する前提（ready 状態）
        await page.getByRole('button', { name: /ノード追加/ }).click()
        // React Flow キャンバス内にノードが出現する
        await expect(page.locator('.react-flow__node').first()).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_add-node.png' })
    })

    test.skip('initStatus が "ready" 以外のとき「＋ ノード追加」ボタンは disabled', async ({ page }) => {
        // graphs/ を削除した状態
        await page.goto('/projects/1')
        await expect(page.getByRole('button', { name: /ノード追加/ })).toBeDisabled()
        await page.screenshot({ path: 'evidence/graph-editor_add-node-disabled.png' })
    })
})

test.describe('GraphEditor: Node Select', () => {
    test.skip('ノードをクリックすると Properties ペインにノード情報が表示される', async ({ page }) => {
        await page.goto('/projects/1')
        // ノードを追加して選択する
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.locator('.react-flow__node').first().click()
        // Properties ペインに name が表示される
        await expect(page.getByTestId('node-property-name')).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_node-selected.png' })
    })
})

test.describe('GraphEditor: Empty State', () => {
    test.skip('nodes[] が空のとき Empty State が表示される', async ({ page }) => {
        await page.goto('/projects/1')
        // ノードが 0 件の状態
        await expect(page.getByText('ノードを追加してください')).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_empty-state.png' })
    })
})

test.describe('GraphEditor: Loading', () => {
    test.skip('マウント直後（checking）にローディングスピナーが表示される', async ({ page }) => {
        await page.goto('/projects/1')
        // 非同期の存在確認中はスピナーが見える（即時解決するため timing に依存する）
        await page.screenshot({ path: 'evidence/graph-editor_loading.png' })
    })
})