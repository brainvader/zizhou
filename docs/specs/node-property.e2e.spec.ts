/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-3 / NodeProperty — E2E Visual Story
 * @bom      docs/bom/graph.ts (GraphStore, GraphNodeData)
 * @story    node-property.spec.tsx の @story に準拠
 * @output   src/components/NodeProperty.tsx
 *
 * @note     Tauri プラグインは vite.config.ts の alias で差し替える。
 *           VITE_PLAYWRIGHT=true のとき src/__mocks__/ のモジュールが使われる。
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

test.describe('CTX-3 NodeProperty — Visual Story', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
    })

    /**
     * @story ステップ 1: 空状態
     * selectedNodeId が null のとき NodeProperty は何も表示しない。
     */
    test('step 1: renders nothing when no node is selected', async ({ page }) => {
        await expect(page.getByTestId('node-property')).toBeVisible()
        await expect(page.getByTestId('node-property')).toBeEmpty()
        await page.screenshot({
            path: 'evidence/NodeProperty_step1_empty.png',
        })
    })

    /**
     * @story ステップ 2-3: プロパティ表示
     * ノードを追加してクリックすると name と description が表示される。
     */
    test('step 2-3: displays node properties after selecting a node', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.getByTestId('node-property').getByText('New Node')).toBeVisible()
        await page.screenshot({
            path: 'evidence/NodeProperty_step2-3_selected.png',
        })
    })

    /**
     * @story ステップ 4: description なし
     * description がないノードを選択したとき description フィールドは表示しない。
     */
    test('step 4: does not show description field when node has no description', async ({ page }) => {
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.getByTestId('node-property').getByText('description')).not.toBeVisible()
        await page.screenshot({
            path: 'evidence/NodeProperty_step4_no_description.png',
        })
    })

})