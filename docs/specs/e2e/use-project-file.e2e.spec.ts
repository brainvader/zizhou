/**
 * @context useProjectFile — Tauri fs を使った projects.json の永続化 hook E2E
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時、loadProjects が自動的に呼ばれ projects[] がグリッドに表示される。
 * @output src/hooks/useProjectFile.ts
 */

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await expect(page.getByText('＋ new project')).toBeVisible()
})

test.describe('useProjectFile — Integration', () => {

    test('Step 1: アプリ起動時にデフォルトプロジェクトが表示される', async ({ page }) => {
        await expect(page.getByText('zizou-core')).toBeVisible()
        await page.screenshot({ path: 'evidence/useProjectFile_01_initial.png', fullPage: true })
    })

})