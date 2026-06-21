/**
 * @context  CTX-19 / FileTree — E2E
 * @note     Storybook で確認できないことのみ検証する。
 *           - file-tree が表示される（plugin-fs.ts モック経由）
 *           - rootPath 配下の src ディレクトリが見える
 *           - src をクリックすると子エントリが展開される
 */
import { test, expect } from '@playwright/test'

const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
    await newProjectBtn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByPlaceholder('My Awesome App').fill('E2E Test Project')
    await page.getByPlaceholder('/Users/user/projects/my-app').fill('/Users/user/projects/zizou-core')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    // フルリロードを避けるため Link クリックで SPA ナビゲーション
    await page.getByRole('link', { name: /E2E Test Project/ }).click()
    await expect(page.getByTestId('file-tree')).toBeVisible({ timeout: 10000 })
}

test.describe('CTX-19 FileTree — ファイルツリー表示', () => {

    test.beforeEach(async ({ page }) => {
        await gotoProjectDetail(page)
    })

    test('step 1: file-tree が表示され rootPath 直下のエントリが見える', async ({ page }) => {
        await expect(page.getByTestId('file-tree')).toBeVisible()
        await expect(page.getByText('src')).toBeVisible({ timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX19_step1_file_tree.png' })
    })

    test('step 2: ディレクトリをクリックすると子エントリが展開される', async ({ page }) => {
        await expect(page.getByText('src')).toBeVisible({ timeout: 5000 })

        // src をクリック → 展開
        await page.getByTestId('fs-entry-src').click()
        await expect(page.getByText('components')).toBeVisible({ timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX19_step2_expand.png' })
    })

})