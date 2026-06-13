/**
 * @context CTX-22: Test Context Subflow — E2E
 * @note Storybook で確認できない結合のみを検証する
 *
 * 前提:
 *   VITE_PLAYWRIGHT=true pnpm dev で起動済み
 *   src/__mocks__/api-core.ts が invoke をモック
 *
 * フィクスチャ:
 *   analyze_tests モックは以下を登録する:
 *     - src/components/App.test.tsx  → node_type='test'
 *     - src/hooks/useStore.test.ts   → node_type='test'
 *   analyze_project モックは以下を登録する:
 *     - src/main.tsx / src/components/App.tsx / src/hooks/useStore.ts
 *
 * data-testid 規約:
 *   filePath の / を - に変換
 *   例: src/components/App.test.tsx → test-node-src-components-App.test.tsx
 *
 * テストシナリオ:
 *   1. Reanalyze All でテストノードが表示される
 *   2. テストノードをクリックすると Subflow が表示される
 *   3. 通常ノードをクリックすると Subflow が消える
 */
import { test, expect } from '@playwright/test'

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

async function setupNodes(page: import('@playwright/test').Page) {
    const btn = page.getByTestId('reanalyze-all-button')
    await btn.click()
    await expect(btn).toHaveText('Reanalyze All', { timeout: 10000 })
    // ソースノードが表示されるまで待つ
    await expect(
        page.getByTestId('source-node-src-main.tsx')
    ).toBeVisible({ timeout: 5000 })
    // テストノードが表示されるまで待つ
    await expect(
        page.getByTestId('test-node-src-components-App.test.tsx')
    ).toBeVisible({ timeout: 5000 })
}

test.describe('CTX-22: Test Context Subflow', () => {
    test.describe.configure({ mode: 'serial' })

    test.beforeEach(async ({ page }) => {
        await navigateToProjectDetail(page)
        await setupNodes(page)
    })

    test('Reanalyze All でテストノードが表示される', async ({ page }) => {
        const testNode = page.getByTestId('test-node-src-components-App.test.tsx')
        await expect(testNode).toBeVisible()
        await page.screenshot({ path: 'evidence/test-context_test-node-visible.png' })
    })

    test('テストノードをクリックすると Subflow が表示される', async ({ page }) => {
        await page.getByTitle('fit view').click()
        await page.waitForTimeout(300)
        const testNode = page.getByTestId('test-node-src-components-App.test.tsx')
        await testNode.click()
        await page.waitForTimeout(500)

        // Subflow コンテナが表示されるまで待つ
        // test_suite の ID は `test_suite:mock-N` 形式
        // context-container は test_suite の id をそのまま使う
        await expect(
            page.locator('[data-testid^="context-container-test_suite:mock-"]')
        ).toBeVisible({ timeout: 3000 })
        await page.screenshot({ path: 'evidence/test-context_subflow-visible.png' })
    })

    test('通常ノードをクリックすると Subflow が消える', async ({ page }) => {
        const testNode = page.getByTestId('test-node-src-components-App.test.tsx')
        await testNode.click()

        // Fit View で全ノードを画面内に収める（list_test_suites の完了も待てる）
        await page.getByTitle('fit view').click()

        await expect(
            page.locator('[data-testid^="context-container-test_suite:mock-"]')
        ).toBeVisible({ timeout: 3000 })

        const sourceNode = page.getByTestId('source-node-src-main.tsx')
        await sourceNode.click()

        await expect(
            page.locator('[data-testid^="context-container-test_suite:mock-"]')
        ).not.toBeVisible({ timeout: 3000 })
        await page.screenshot({ path: 'evidence/test-context_subflow-hidden.png' })
    })
})