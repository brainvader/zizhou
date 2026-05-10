/**
 * Slot 1: 発注用ヘッダー
 * @context CTX-2: GraphEditor (E2E)
 * @bom docs/bom/graph.ts
 * @story
 * 1. Project Detail ページを開く（initStatus は graphs/ の有無によって変化）
 * 2. graphs/ が存在しない場合、エディタ領域に Setup ビューが表示される
 * 3. 「初期化」ボタンをクリックすると graphs/ が作成されエディタビューに切り替わる
 * 4. 「＋ ノード追加」ボタンをクリックするとノードがキャンバスに追加される
 * 5. nodes[] が空のとき Empty State が表示される
 * @output src/components/GraphEditor.tsx
 *
 * @note ?fs=uninitialized を付けると plugin-fs モックの exists が false を返す
 */

import { test, expect } from '@playwright/test'

const PROJECT_DETAIL_URL = '/projects/1'
const PROJECT_DETAIL_UNINITIALIZED_URL = '/projects/1?fs=uninitialized'

test.describe('GraphEditor: Setup View', () => {

    test('graphs/ が存在しない場合 Setup ビューが表示される', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_UNINITIALIZED_URL)
        await expect(page.getByRole('button', { name: /初期化/ })).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_setup-view.png' })
    })

    test('「初期化」ボタンクリックでエディタビューに切り替わる', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_UNINITIALIZED_URL)
        await expect(page.getByRole('button', { name: /初期化/ })).toBeVisible()
        await page.getByRole('button', { name: /初期化/ }).click()
        await expect(page.locator('#graph-editor')).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_after-init.png' })
    })

})

test.describe('GraphEditor: Add Node', () => {

    test('「＋ ノード追加」クリックでノードがキャンバスに追加される', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_add-node.png' })
    })

    test('initStatus が "ready" 以外のとき「＋ ノード追加」ボタンは disabled になる', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_UNINITIALIZED_URL)
        await expect(page.getByRole('button', { name: /ノード追加/ })).toBeDisabled()
        await page.screenshot({ path: 'evidence/graph-editor_add-node-disabled.png' })
    })

})

test.describe('GraphEditor: Empty State', () => {

    test('nodes[] が空のとき Empty State が表示される', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
        await expect(page.getByText('ノードを追加してください')).toBeVisible()
        await page.screenshot({ path: 'evidence/graph-editor_empty-state.png' })
    })

})