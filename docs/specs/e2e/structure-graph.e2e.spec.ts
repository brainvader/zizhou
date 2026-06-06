/**
 * @context CTX-20 / Structure Graph E2E
 *
 * 前提:
 *   VITE_PLAYWRIGHT=true pnpm dev で起動済み
 *   src/__mocks__/api-core.ts が invoke をモック
 *   src/__mocks__/plugin-fs.ts が readDir をモック
 *
 * フィクスチャ:
 *   api-core.ts の _changedFiles = ['src/main.tsx']
 *   plugin-fs.ts の readDir → ROOT/src/main.tsx 等を返す
 *
 * 注意:
 *   page.reload() / 直接 page.goto('/projects/$id') は NG
 *   Zustand + loadProjects の都合で page.goto('/') → カードクリックが必須
 */
import { test, expect } from '@playwright/test'

// ============================================================
// ヘルパー: プロジェクト作成 → 詳細画面に遷移
// ============================================================

async function navigateToProjectDetail(page: import('@playwright/test').Page) {
    await page.goto('/')

    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })

    await newProjectBtn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByPlaceholder('My Awesome App').fill('E2E Test Project')
    await page.getByPlaceholder('/Users/user/projects/my-app').fill('/Users/user/projects/zizou-core')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    await page.getByRole('link', { name: /E2E Test Project/ }).click()
    await expect(page.getByTestId('reanalyze-all-button')).toBeVisible({ timeout: 10000 })
}

// ============================================================
// テスト
// ============================================================

test.describe('CTX-20: Structure Graph', () => {
    test.describe.configure({ mode: 'serial' })

    test('ツールバーに Reanalyze All ボタンが表示される', async ({ page }) => {
        await navigateToProjectDetail(page)

        const btn = page.getByTestId('reanalyze-all-button')
        await expect(btn).toBeVisible()
        await expect(btn).toHaveText('Reanalyze All')
    })

    test('Reanalyze All クリックで一括解析が走る', async ({ page }) => {
        await navigateToProjectDetail(page)

        const btn = page.getByTestId('reanalyze-all-button')
        await btn.click()

        // モックは即完了するので、完了後にボタンが元に戻っていることを確認
        await expect(btn).toHaveText('Reanalyze All', { timeout: 5000 })
    })

    test('ファイルクリックで解析登録される', async ({ page }) => {
        await navigateToProjectDetail(page)

        // src ディレクトリを展開
        await page.getByTestId('fs-entry-src').click()
        // main.tsx をクリック
        const mainTsx = page.getByTestId('fs-entry-main.tsx')
        await expect(mainTsx).toBeVisible()
        await mainTsx.click()

        // analyze_file がモック内で呼ばれ、再フェッチ後に analyzed=true になる
        await expect(mainTsx).toHaveAttribute('data-analyzed', 'true', { timeout: 3000 })
    })

    test('変更ファイルは stale 表示される', async ({ page }) => {
        await navigateToProjectDetail(page)

        await page.getByTestId('fs-entry-src').click()
        const mainTsx = page.getByTestId('fs-entry-main.tsx')
        await expect(mainTsx).toBeVisible()

        // まずクリックして解析登録
        await mainTsx.click()
        await expect(mainTsx).toHaveAttribute('data-analyzed', 'true', { timeout: 3000 })

        // _changedFiles に含まれるので stale 判定される
        await expect(mainTsx).toHaveAttribute('data-stale', 'true', { timeout: 3000 })
    })

    test('選択中ファイルに Reanalyze ボタンが表示される', async ({ page }) => {
        await navigateToProjectDetail(page)

        // src 展開してファイルクリック
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-main.tsx').click()

        // Reanalyze ボタンが表示される（analyzed 済みファイルを選択した場合のみ）
        const reanalyzeBtn = page.getByTestId('reanalyze-selected-button')
        await expect(reanalyzeBtn).toBeVisible({ timeout: 3000 })
        await expect(reanalyzeBtn).toHaveText('Reanalyze')
    })
})