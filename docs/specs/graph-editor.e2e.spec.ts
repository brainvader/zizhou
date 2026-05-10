/**
 * @context CTX-2: GraphEditor — E2E
 * @note 以下は Storybook play 関数でカバー済みのため削除：
 *       - Setup ビュー表示（Uninitialized Story）
 *       - ノード追加ボタン非表示（Checking / Uninitialized Story）
 *       - Empty State 表示（ReadyEmpty Story）
 *       ここでは Storybook では確認できない実画面の結合のみ検証する。
 */
import { test, expect } from '@playwright/test'

const PROJECT_DETAIL_URL = '/projects/1'
const PROJECT_DETAIL_UNINITIALIZED_URL = '/projects/1?fs=uninitialized'

test.describe('GraphEditor — Integration', () => {

    test('「初期化」クリックでエディタビューに切り替わる（initStatus 遷移）', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_UNINITIALIZED_URL)
        await expect(page.getByRole('button', { name: /初期化/ })).toBeVisible()
        await page.getByRole('button', { name: /初期化/ }).click()
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await page.screenshot({ path: 'evidence/GraphEditor_after-init.png' })
    })

    test('「＋ ノード追加」クリックで React Flow キャンバスにノードが描画される', async ({ page }) => {
        await page.goto(PROJECT_DETAIL_URL)
        await expect(page.getByText('Loading…')).toBeHidden()
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await expect(page.locator('.react-flow__node').first()).toBeVisible()
        await page.screenshot({ path: 'evidence/GraphEditor_add-node.png' })
    })

})