/**
 * @context CTX-13 Node Catalog + SurrealDB E2E
 * @note    Tauri invoke → SurrealDB 往復が実際に動作することを確認する。
 *          CatalogMenu はキャンバス右クリックで表示される。
 */
import { test, expect, type Page } from '@playwright/test'

// プロジェクト詳細画面に遷移してグラフエディタが ready になるまで待つヘルパー
async function navigateToEditor(page: Page) {
    await page.goto('/')
    // ProjectGrid の card-1 をクリック（plugin-fs モックの固定フィクスチャ ID）
    await page.getByTestId('card-1').click()
    // グラフエディタが表示されるまで待機
    await page.waitForSelector('[data-testid="graph-editor"]')
    // ReactFlow のキャンバス要素が描画されるまで待機
    await page.waitForSelector('.react-flow__pane')
}

test.describe('CTX-13: catalog invoke integration', () => {
    /**
     * @story 1: キャンバス右クリックで CatalogMenu が表示され SurrealDB の初期データが含まれる
     */
    test('キャンバス右クリックで CatalogMenu が表示され初期データが含まれる', async ({ page }) => {
        await navigateToEditor(page)

        // キャンバスを右クリック → CatalogMenu が表示される
        await page.locator('.react-flow__pane').click({ button: 'right' })
        await page.waitForSelector('[data-testid="catalog-menu"]')

        // SurrealDB の初期データが表示されている
        await expect(page.getByTestId('catalog-search-input')).toBeVisible()
        await expect(page.getByTestId('catalog-entry-git-status')).toBeVisible()
        await expect(page.getByTestId('catalog-entry-git-commit')).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx13_catalog_initial_load.png' })
    })

    /**
     * @story 2: 検索ボックスに入力すると invoke('catalog_search') 経由でフィルタされる
     */
    test('検索ボックスへの入力で SurrealDB 検索結果が反映される', async ({ page }) => {
        await navigateToEditor(page)

        await page.locator('.react-flow__pane').click({ button: 'right' })
        await page.waitForSelector('[data-testid="catalog-search-input"]')

        // 'git' で検索
        await page.getByTestId('catalog-search-input').fill('git')

        // Git 系が表示されている
        await expect(page.getByTestId('catalog-category-git')).toBeVisible()

        // llm 系は表示されていない
        await expect(page.getByTestId('catalog-category-llm')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/ctx13_catalog_search_git.png' })
    })

    /**
     * @story 3: 検索をクリアすると全件に戻る
     */
    test('検索クリアで全件表示に戻る', async ({ page }) => {
        await navigateToEditor(page)

        await page.locator('.react-flow__pane').click({ button: 'right' })
        await page.waitForSelector('[data-testid="catalog-search-input"]')

        const input = page.getByTestId('catalog-search-input')
        await input.fill('git')
        await input.clear()

        // 全カテゴリが表示される
        await expect(page.getByTestId('catalog-category-git')).toBeVisible()
        await expect(page.getByTestId('catalog-category-llm')).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx13_catalog_search_cleared.png' })
    })
})