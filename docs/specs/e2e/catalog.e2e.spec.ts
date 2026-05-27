/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  CTX-9: Node Catalog UI — E2E Visual Story
 * @bom      docs/bom/graph.ts (CatalogEntry, NODE_CATALOG)
 * @story
 * 1. キャンバス空白を右クリックするとカタログメニューが表示される
 * 2. カタログメニューに検索窓とカテゴリ別エントリが表示される
 * 3. 検索窓に "git" と入力するとgitエントリのみ表示される
 * 4. エントリをクリックするとノードがグラフに追加される
 * 5. 追加されたノードに正しいラベルが表示される
 * 6. 追加されたノードに正しいタイプカラーが適用される
 * 7. エントリクリック後にカタログメニューが閉じる
 * 8. キャンバスクリックでカタログメニューが閉じる
 * @output
 *   src/hooks/useCatalogSearch.ts
 *   src/components/CatalogMenu.tsx
 *   src/components/GraphEditor.tsx
 */

import { test, expect } from '@playwright/test'

// =============================================================================
// ヘルパー
// =============================================================================

const createNewGraph = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    await expect(page.getByText('zizou-core')).toBeVisible()
    await page.locator('[data-testid^="card-"]').first().click()
    await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
    // graphs/ ディレクトリが未初期化の場合は初期化する
    const setupBtn = page.getByRole('button', { name: /初期化/ })
    if (await setupBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await setupBtn.click()
        await expect(page.locator('.react-flow__renderer')).toBeVisible({ timeout: 10000 })
    }
}

const openCatalogMenu = async (page: import('@playwright/test').Page) => {
    await page.locator('.react-flow__pane').click({
        button: 'right',
        position: { x: 300, y: 200 },
    })
    await expect(page.getByTestId('catalog-menu')).toBeVisible()
}

// =============================================================================
// CTX-9: Catalog Menu
// =============================================================================

test.describe('CTX-9 Catalog Menu', () => {

    test.beforeEach(async ({ page }) => {
        await createNewGraph(page)
    })

    test('step 1: キャンバス空白を右クリックするとカタログメニューが表示される', async ({ page }) => {
        await openCatalogMenu(page)
        await page.screenshot({ path: 'evidence/CTX9_catalog_menu_open.png' })
    })

    test('step 2: カタログメニューに検索窓とカテゴリ別エントリが表示される', async ({ page }) => {
        await openCatalogMenu(page)

        await expect(page.getByTestId('catalog-search-input')).toBeVisible()
        await expect(page.getByTestId('catalog-category-git')).toBeVisible()
        await expect(page.getByTestId('catalog-category-llm')).toBeVisible()
        await expect(page.getByTestId('catalog-category-validate')).toBeVisible()

        await page.screenshot({ path: 'evidence/CTX9_catalog_categories.png' })
    })

    test('step 3: 検索窓に "git" と入力するとgitエントリのみ表示される', async ({ page }) => {
        await openCatalogMenu(page)

        await page.getByTestId('catalog-search-input').fill('git')

        // git カテゴリは表示される
        await expect(page.getByTestId('catalog-category-git')).toBeVisible()
        // llm カテゴリは非表示になる
        await expect(page.getByTestId('catalog-category-llm')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX9_catalog_search_git.png' })
    })

    test('step 4-5: エントリをクリックするとノードがグラフに追加され正しいラベルが表示される', async ({ page }) => {
        await openCatalogMenu(page)

        // Git Status をクリック
        await page.getByTestId('catalog-entry-git-status').click()

        // ノードが追加される
        await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 })
        await expect(page.locator('.react-flow__node').first()).toContainText('Git Status')

        await page.screenshot({ path: 'evidence/CTX9_node_added.png' })
    })

    test('step 6: 追加されたノードに正しいタイプカラーが適用される', async ({ page }) => {
        await openCatalogMenu(page)
        await page.getByTestId('catalog-entry-git-status').click()

        // git タイプバッジが表示される
        await expect(page.locator('[data-testid="node-type-badge"]').first()).toHaveText('git')

        await page.screenshot({ path: 'evidence/CTX9_node_type_badge.png' })
    })

    test('step 7: エントリクリック後にカタログメニューが閉じる', async ({ page }) => {
        await openCatalogMenu(page)
        await page.getByTestId('catalog-entry-git-status').click()

        await expect(page.getByTestId('catalog-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX9_catalog_menu_closed.png' })
    })

    test('step 8: キャンバスクリックでカタログメニューが閉じる', async ({ page }) => {
        await openCatalogMenu(page)

        await page.locator('.react-flow__pane').click({ position: { x: 100, y: 100 } })

        await expect(page.getByTestId('catalog-menu')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX9_catalog_menu_closed_by_pane.png' })
    })

})