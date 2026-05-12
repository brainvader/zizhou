/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectFile — Tauri fs を使った projects.json の永続化 hook E2E
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時、loadProjects が自動的に呼ばれ projects[] がグリッドに表示される。
 * 2. 新規プロジェクトを作成すると localStorage に自動保存される。
 * 3. ページリロード後、保存済みの projects[] が復元される。
 * 4. saveProjects が失敗した場合、toast.error が画面に表示される。
 *    注意: alias モック環境では fs の強制失敗が困難なため、
 *          このステップは tauri dev 環境での手動検証とする。
 * @output src/hooks/useProjectFile.ts
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect } from '@playwright/test'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 * VITE_PLAYWRIGHT=true + src/__mocks__/plugin-fs.ts（localStorage バックエンド）で動作する。
 * テスト間の干渉を防ぐため beforeEach で localStorage をクリアする。
 */

test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('＋ new project')).toBeVisible()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

test.describe('useProjectFile — Integration', () => {

    test('Step 1: アプリ起動時にデフォルトプロジェクトが表示される', async ({ page }) => {
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.screenshot({ path: 'evidence/useProjectFile_01_initial.png', fullPage: true })
    })

    test('Step 2-3: 新規プロジェクト作成 → リロード後も復元される', async ({ page }) => {
        // Step 2: 新規プロジェクト作成 → localStorage に保存
        await page.getByText('＋ new project').click()
        await page.getByPlaceholder('My Awesome App').fill('永続化テストプロジェクト')
        await page.getByPlaceholder('/Users/user/projects/my-app').fill('/Users/user/projects/test')
        await page.getByRole('button', { name: '作成' }).click()
        await expect(page.getByText('永続化テストプロジェクト')).toBeVisible()
        await page.screenshot({ path: 'evidence/useProjectFile_02_after_save.png', fullPage: true })

        // Step 3: リロード → localStorage から復元
        await page.reload()
        await expect(page.getByText('永続化テストプロジェクト')).toBeVisible()
        await page.screenshot({ path: 'evidence/useProjectFile_03_after_reload.png', fullPage: true })
    })

    test.skip('Step 4: saveProjects 失敗時に toast.error が表示される', async () => {
        /**
         * SKIP REASON: alias モック環境では fs の強制失敗が困難。
         * TODO: tauri dev 環境での手動検証、または将来の WebDriver 対応時に実装する。
         * @see https://tauri.app/develop/tests/webdriver/
         */
    })

})