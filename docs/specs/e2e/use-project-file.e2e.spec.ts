/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectFile — Tauri fs を使った projects.json の永続化 hook E2E
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時、loadProjects が自動的に呼ばれ projects[] がグリッドに表示される。
 * 2. 新規プロジェクトを作成すると localStorage に自動保存される。
 * 3. ページリロード後、保存済みの projects[] が復元される。
 * 4. saveProjects が失敗した場合、toast.error が画面に表示される。
 * @output src/hooks/useProjectFile.ts
 */

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // ハイドレーション完了まで待つ
    await expect(page.getByText('＋ new project')).toBeVisible()
})

test.describe('useProjectFile — Integration', () => {

    test('Step 1: アプリ起動時にデフォルトプロジェクトが表示される', async ({ page }) => {
        // plugin-fs モックの readTextFile は projects.json に対して
        // { id: '1', name: 'zizou-core', rootPath: '/Users/user/projects/zizou-core' } を返す
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
        await expect(page.getByText('＋ new project')).toBeVisible()
        await expect(page.getByText('永続化テストプロジェクト')).toBeVisible()
        await page.screenshot({ path: 'evidence/useProjectFile_03_after_reload.png', fullPage: true })
    })

    test.skip('Step 4: saveProjects 失敗時に toast.error が表示される', async () => {
        /**
         * SKIP REASON: alias モック環境では fs の強制失敗が困難。
         * TODO: tauri dev 環境での手動検証、または将来の WebDriver 対応時に実装する。
         */
    })

})