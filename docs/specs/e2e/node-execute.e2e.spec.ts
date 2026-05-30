/**
 * @context CTX-14: NODE EXECUTE DISPATCH — E2E
 * @note    Storybook で確認できない結合のみを検証する。
 *          - カタログから追加した service 付きノードに "▶ Run" ボタンが表示される
 *          - "▶ Run" クリックでノードの status が doing → done に変化する（モック invoke）
 *          - 手動追加ノード（service なし）に "▶ Run" ボタンが表示されない
 *
 * E2E 環境: VITE_PLAYWRIGHT=true の dev server
 *   src/__mocks__/api-core.ts の execute_node モックが使われる。
 *   モックは即時 success:true を返す。
 */
import { test, expect } from '@playwright/test'

// ─── ヘルパー ──────────────────────────────────────────────────────────────

/** / に goto → zizou-core カードクリック → プロジェクト詳細へ遷移 */
const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    await expect(page.getByText('zizou-core')).toBeVisible()
    await page.locator('[data-testid^="card-"]').first().click()
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
}

/** New Graph を作成してエディタが ready になるまで待つ */
const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)
    await page.locator('[data-testid="new-graph-btn"]').click()
    await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="graph-editor"]')
        if (!el) return false
        const { width, height } = el.getBoundingClientRect()
        return width > 0 && height > 0
    }, { timeout: 10000 })
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await page.waitForTimeout(500)
}

/** カタログから Git Status ノードを追加する */
const addGitStatusNode = async (page: import('@playwright/test').Page) => {
    const canvas = page.locator('.react-flow__pane')
    await canvas.click({ button: 'right', position: { x: 200, y: 200 } })
    await expect(page.getByTestId('catalog-menu')).toBeVisible({ timeout: 5000 })
    await page.getByText('Git Status').click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
}

/** 手動ノード追加（カタログなし・service=null） */
const addPlainNode = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: /ノード追加/ }).click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
}

// ─── テスト ────────────────────────────────────────────────────────────────

test.describe('CTX-14: Run Node [E2E]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test('カタログ追加ノードに "▶ Run" ボタンが表示される', async ({ page }) => {
        await createNewGraph(page)
        await addGitStatusNode(page)

        const node = page.locator('.react-flow__node').first()
        await expect(node.getByTestId('btn-run-node')).toBeVisible()

        await page.screenshot({ path: 'evidence/CTX14_run_button_visible.png' })
    })

    test('"▶ Run" クリックでノードの status が done になる', async ({ page }) => {
        await createNewGraph(page)
        await addGitStatusNode(page)

        const node = page.locator('.react-flow__node').first()
        await node.getByTestId('btn-run-node').click()

        // done になるまで待つ（モックは即時応答なので短い timeout で良い）
        await expect(
            node.locator('[data-status="done"]')
        ).toBeVisible({ timeout: 5000 })

        await page.screenshot({ path: 'evidence/CTX14_run_node_done.png' })
    })

    test('手動追加ノードに "▶ Run" ボタンが表示されない', async ({ page }) => {
        await createNewGraph(page)
        await addPlainNode(page)

        const node = page.locator('.react-flow__node').first()
        await expect(node.getByTestId('btn-run-node')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX14_no_run_button_plain.png' })
    })

})