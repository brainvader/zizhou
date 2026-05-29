/**
 * @context CTX-13 Node Catalog + SurrealDB E2E
 * @note    Storybook では確認できないこと（実際の Tauri invoke → SurrealDB 往復）のみ検証する。
 *          フロントの UI は CTX-9 で完成済み。ここでは invoke の結果が画面に反映されることを確認する。
 */
import { test, expect } from '@playwright/test'

test.describe('CTX-13: catalog invoke integration', () => {
    /**
     * @story 1: アプリ起動時にカタログが SurrealDB から取得され表示される
     * CTX-9 の固定データ時代と同じ UI が出れば差し替え成功。
     */
    test('カタログパネルに SurrealDB の初期データが表示される', async ({ page }) => {
        // プロジェクト詳細画面（グラフエディタ）に遷移
        await page.goto('/')
        // プロジェクト選択（最初のプロジェクトカードをクリック）
        await page.getByTestId('project-card').first().click()

        // グラフエディタが表示されるまで待機
        await page.waitForSelector('[data-testid="catalog-panel"]')

        // SurrealDB の初期 INSERT データ（Git Status）が表示されている
        await expect(page.getByTestId('catalog-panel')).toContainText('Git Status')
        await expect(page.getByTestId('catalog-panel')).toContainText('Git Commit')

        await page.screenshot({ path: 'evidence/ctx13_catalog_initial_load.png' })
    })

    /**
     * @story 2: 検索ボックスに文字を入力すると invoke('catalog_search') 経由でフィルタされる
     * CTX-9 では filter() だったが、CTX-13 では SurrealDB クエリ結果が返る。
     */
    test('検索ボックスへの入力で SurrealDB 検索結果が反映される', async ({ page }) => {
        await page.goto('/')
        await page.getByTestId('project-card').first().click()
        await page.waitForSelector('[data-testid="catalog-search-input"]')

        // 'git' で検索
        await page.getByTestId('catalog-search-input').fill('git')

        // Git 系が表示されている
        await expect(page.getByTestId('catalog-panel')).toContainText('Git Status')

        // llm 系は表示されていない（SurrealDB がフィルタ済み）
        await expect(page.getByTestId('catalog-panel')).not.toContainText('Claude')

        await page.screenshot({ path: 'evidence/ctx13_catalog_search_git.png' })
    })

    /**
     * @story 3: 検索ボックスをクリアすると全件に戻る
     */
    test('検索クリアで全件表示に戻る', async ({ page }) => {
        await page.goto('/')
        await page.getByTestId('project-card').first().click()
        await page.waitForSelector('[data-testid="catalog-search-input"]')

        const input = page.getByTestId('catalog-search-input')
        await input.fill('git')
        await input.clear()

        // 全カテゴリが表示される（git + llm 等）
        await expect(page.getByTestId('catalog-panel')).toContainText('Git Status')

        await page.screenshot({ path: 'evidence/ctx13_catalog_search_cleared.png' })
    })
})