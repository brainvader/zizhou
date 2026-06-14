/**
 * @context CTX-22b: Test as a Context (TaaC) — E2E 結合テスト
 * @note Storybook では確認できない以下の動作を検証する:
 *   - FileTree でのファイル選択 → SourceGraphView への反映
 *   - テストファイル選択時のみグラフが更新される
 *   - 別テストファイルへの切り替えでグラフが置き換わる
 *   - テストファイル以外の選択ではグラフが更新されない
 */

import { test, expect } from '@playwright/test'

test.describe('CTX-22b: Test as a Context (TaaC)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        // プロジェクト詳細ページへ遷移
        await page.getByRole('link', { name: /test-project/i }).click()
        await page.waitForURL(/\/projects\//)
    })

    // ============================================================
    // Empty State
    // ============================================================

    test('テストファイルが未選択の場合、空グラフが表示される', async ({ page }) => {
        // FileTree でファイルを選択しない初期状態
        const graphArea = page.getByTestId('source-graph-view')
        await expect(graphArea).toBeVisible()

        // 空グラフのガイダンスメッセージが表示される
        await expect(
            page.getByTestId('taac-empty-state'),
        ).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_empty_state.png' })
    })

    // ============================================================
    // TaaC フィルタ: テストファイルのみ選択可能
    // ============================================================

    test('テストファイルを選択するとグラフが表示される', async ({ page }) => {
        // FileTree でテストファイルを選択
        await page.getByTestId('file-tree').getByText('App.test.tsx').click()

        // グラフに center ノードが表示される
        await expect(
            page.getByTestId('source-node-src-components-App.test.tsx'),
        ).toBeVisible({ timeout: 5000 })

        // 空グラフメッセージが消える
        await expect(page.getByTestId('taac-empty-state')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_test_file_selected.png' })
    })

    test('テストファイル以外を選択してもグラフは更新されない', async ({ page }) => {
        // まずテストファイルを選択してグラフを表示
        await page.getByTestId('file-tree').getByText('App.test.tsx').click()
        await expect(
            page.getByTestId('source-node-src-components-App.test.tsx'),
        ).toBeVisible({ timeout: 5000 })

        // 非テストファイルを選択
        await page.getByTestId('file-tree').getByText('App.tsx').click()

        // グラフは App.test.tsx のままで更新されていない
        await expect(
            page.getByTestId('source-node-src-components-App.test.tsx'),
        ).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_non_test_no_update.png' })
    })

    // ============================================================
    // Graph on Demand: レイアウト確認
    // ============================================================

    test('依存先ノードが center より左側に表示される', async ({ page }) => {
        await page.getByTestId('file-tree').getByText('App.test.tsx').click()

        const centerNode = page.getByTestId('source-node-src-components-App.test.tsx')
        const depNode = page.getByTestId('source-node-src-components-App.tsx')

        await expect(centerNode).toBeVisible({ timeout: 5000 })
        await expect(depNode).toBeVisible()

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
        await page.getByTestId('file-tree').getByText('App.test.tsx').click()
        await expect(
            page.getByTestId('source-node-src-components-App.test.tsx'),
        ).toBeVisible({ timeout: 5000 })

        // 別のテストファイルを選択
        await page.getByTestId('file-tree').getByText('utils.test.ts').click()

        // 新しいグラフが表示される
        await expect(
            page.getByTestId('source-node-src-lib-utils.test.ts'),
        ).toBeVisible({ timeout: 5000 })

        // 前のグラフは消える
        await expect(
            page.getByTestId('source-node-src-components-App.test.tsx'),
        ).not.toBeVisible()

        await page.screenshot({ path: 'evidence/ctx22b_selection_switch.png' })
    })
})