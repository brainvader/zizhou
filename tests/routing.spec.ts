/**
 * @context CTX-5: ROUTING / CTX-11: Root Layout
 * @bom     docs/bom/project.ts
 */

import { test, expect } from '@playwright/test';

const EVIDENCE = 'evidence';
const TEST_PROJECT_NAME = 'Routing Test Project';

/** 「＋ new project」からプロジェクトを1件作成するヘルパー */
const createProject = async (page: import('@playwright/test').Page, name: string) => {
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
    await newProjectBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByPlaceholder('My Awesome App').fill(name)
    await page.getByPlaceholder('/Users/user/projects/my-app').fill('/tmp/e2e-test')
    await page.getByRole('button', { name: '作成' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })
}

test.describe('CTX-5 ROUTING — Visual Story (Playwright)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await createProject(page, TEST_PROJECT_NAME)
    })

    test('step 1: ProjectGrid and project card are visible on "/"', async ({ page }) => {
        await expect(page.getByRole('link', { name: TEST_PROJECT_NAME })).toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/routing_step1_project_grid.png`,
            fullPage: true,
        })
    })

    test('step 2-3: clicking a card navigates to Workspace', async ({ page }) => {
        await page.getByRole('link', { name: TEST_PROJECT_NAME }).click()
        await expect(page).toHaveURL(/\/workspace/)
        await expect(page.getByTestId('workspace-route')).toBeVisible({ timeout: 10000 })

        await page.screenshot({ path: `${EVIDENCE}/routing_step3_project_detail.png`, fullPage: true })
    })

    test('step 4: browser back() returns to ProjectGrid', async ({ page }) => {
        await page.getByRole('link', { name: TEST_PROJECT_NAME }).click()
        await expect(page).toHaveURL(/\/workspace/)

        await page.screenshot({ path: `${EVIDENCE}/routing_step4_before_back.png`, fullPage: true })

        await page.goBack()

        await expect(page).toHaveURL('/')
        await expect(page.getByRole('link', { name: TEST_PROJECT_NAME })).toBeVisible()

        await page.screenshot({ path: `${EVIDENCE}/routing_step4_after_back.png`, fullPage: true })
    })

    test.skip('direct navigation to /projects/:id renders project detail (CTX-11)', async () => {
        // TODO: SurrealDB embedded（実Tauri）環境でのみ検証可能。
        // インメモリモックはページリロードでデータが消えるため E2E では検証不可。
    })
})