/**
 * @context CTX-22b: Test as a Context (TaaC) — E2E 結合テスト
 * @note Storybook では確認できない以下の動作を検証する:
 *   - FileTree でのテストファイル選択 → SourceGraphView への反映
 *   - テストファイル選択時のみグラフが更新される
 *   - 別テストファイルへの切り替えでグラフが置き換わる
 *   - テストファイル以外の選択ではグラフが更新されない
 *
 * フィクスチャ前提:
 *   api-core.ts の analyze_tests モックが以下を登録する:
 *     src/components/App.test.tsx  (node_type='test')
 *     src/hooks/useStore.test.ts  (node_type='test')
 *   analyze_file/analyze_project モックが以下を登録する:
 *     src/components/App.tsx, src/lib/utils.ts 等のソースノード
 *
 * data-testid 規約:
 *   filePath の / を - に変換。
 *   TestNode: test-node-{filePath の / → -}
 *   SourceNode: source-node-{filePath の / → -}
 */

import { test, expect } from '@playwright/test'

async function navigateToProjectDetail(page: import('@playwright/test').Page) {
    await page.goto('/')
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
    await newProjectBtn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByPlaceholder('My Awesome App').fill('TaaC Test Project')
    await page.getByPlaceholder('/Users/user/projects/my-app').fill('/Users/user/projects/zizou-core')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
    await page.getByRole('link', { name: /TaaC Test Project/ }).click()
    await expect(page.getByTestId('reanalyze-all-button')).toBeVisible({ timeout: 10000 })
}

async function setupNodes(page: import('@playwright/test').Page) {
    // analyze_project でソースノードを登録し、analyze_tests でテストノードを登録する
    const btn = page.getByTestId('reanalyze-all-button')
    await btn.click()
    await expect(btn).toHaveText('Reanalyze All', { timeout: 5000 })
}

test.describe('CTX-22b: Test as a Context (TaaC)', () => {
    test.describe.configure({ mode: 'serial' })

    test.beforeEach(async ({ page }) => {
        await navigateToProjectDetail(page)
        await setupNodes(page)
    })

    // ============================================================
    // Empty State
    // ============================================================

    test('テストファイルが未選択の場合、空グラフが表示される', async ({ page }) => {
        await expect(page.getByTestId('taac-empty-state')).toBeVisible({ timeout: 3000 })
        await page.screenshot({ path: 'evidence/ctx22b_empty_state.png' })
    })

    // ============================================================
    // TaaC フィルタ: テストファイルのみ選択可能
    // ============================================================

    test('テストファイルを選択するとグラフが表示される', async ({ page }) => {
        // FileTree を展開してテストファイルをクリック
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-components').click()
        await page.getByTestId('fs-entry-App.test.tsx').click()

        // center ノード（テストノード）が表示される
        await expect(
            page.getByTestId('test-node-src-components-App.test.tsx'),
        ).toBeVisible({ timeout: 5000 })

        // 空グラフメッセージが消える
        await expect(page.getByTestId('taac-empty-state')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_test_file_selected.png' })
    })

    test('テストファイル以外を選択してもグラフは更新されない', async ({ page }) => {
        // まずテストファイルを選択してグラフを表示
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-components').click()
        await page.getByTestId('fs-entry-App.test.tsx').click()
        await expect(
            page.getByTestId('test-node-src-components-App.test.tsx'),
        ).toBeVisible({ timeout: 5000 })

        // 非テストファイルをクリック
        await page.getByTestId('fs-entry-App.tsx').click()

        // グラフは App.test.tsx のままで更新されていない
        await expect(
            page.getByTestId('test-node-src-components-App.test.tsx'),
        ).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_non_test_no_update.png' })
    })

    // ============================================================
    // Graph on Demand: レイアウト確認
    // ============================================================

    test('依存先ノードが center より左側に表示される', async ({ page }) => {
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-components').click()
        await page.getByTestId('fs-entry-App.test.tsx').click()

        const centerNode = page.getByTestId('test-node-src-components-App.test.tsx')
        const depNode = page.getByTestId('source-node-src-components-App.tsx')

        await expect(centerNode).toBeVisible({ timeout: 5000 })
        await expect(depNode).toBeVisible({ timeout: 5000 })

        const centerBox = await centerNode.boundingBox()
        const depBox = await depNode.boundingBox()

        expect(depBox!.x).toBeLessThan(centerBox!.x)

        await page.screenshot({ path: 'evidence/ctx22b_layout_deps_left.png' })
    })

    // ============================================================
    // Cache Last Selection: 別ファイルへの切り替え
    // ============================================================

    test('別のテストファイルを選択すると前の表示が置き換わる', async ({ page }) => {
        // 最初のテストファイルを選択
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-components').click()
        await page.getByTestId('fs-entry-App.test.tsx').click()
        await expect(
            page.getByTestId('test-node-src-components-App.test.tsx'),
        ).toBeVisible({ timeout: 5000 })

        // 別のテストファイルを選択
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-hooks').click()
        await page.getByTestId('fs-entry-useStore.test.ts').click()

        // 新しいグラフが表示される
        await expect(
            page.getByTestId('test-node-src-hooks-useStore.test.ts'),
        ).toBeVisible({ timeout: 5000 })

        // 前のグラフは消える
        await expect(
            page.getByTestId('test-node-src-components-App.test.tsx'),
        ).not.toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_selection_switch.png' })
    })
})