/**
 * @context CTX-10: Graph Export / Import — E2E
 * @note Storybook で確認できないことのみを検証する。
 *       - Export ボタンが GraphEditor に表示される
 *       - Export ボタンクリックで ExportModal が開く
 *       - ExportModal の JSON に現在のグラフ情報が含まれる
 *       - ExportModal の閉じるボタンでモーダルが閉じる
 *       - Import ボタンクリックで ImportModal が開く
 *       - ImportModal に有効な JSON を入力してインポートするとノードが追加される
 *       - ImportModal の閉じるボタンでモーダルが閉じる
 *
 * E2E 環境: VITE_PLAYWRIGHT=true の dev server
 *   クリップボード・ファイル保存は E2E では検証しない（Tauri API 依存のため）
 */
import { test, expect } from '@playwright/test'

// ─── ヘルパー ──────────────────────────────────────────────────────────────

const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    await expect(page.getByText('zizou-core')).toBeVisible()
    await page.locator('[data-testid^="card-"]').first().click()
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 10000 })
}

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

const addNode = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: /ノード追加/ }).click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 10000 })
}

// ─── テスト ────────────────────────────────────────────────────────────────

test.describe('CTX-10: Graph Export [E2E]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test('Export ボタンが表示される', async ({ page }) => {
        await createNewGraph(page)
        await expect(page.getByTestId('btn-export')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX10_export_btn.png' })
    })

    test('Export クリックで ExportModal が開く', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-export').click()
        await expect(page.getByTestId('export-textarea')).toBeVisible({ timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX10_export_modal_open.png' })
    })

    test('ExportModal の JSON にグラフ情報が含まれる', async ({ page }) => {
        await createNewGraph(page)
        await addNode(page)
        await page.getByTestId('btn-export').click()
        await expect(page.getByTestId('export-textarea')).toBeVisible({ timeout: 5000 })

        const json = await page.getByTestId('export-textarea').inputValue()
        const payload = JSON.parse(json)

        expect(payload.graph).toBeDefined()
        expect(payload.graph.nodes).toBeDefined()
        expect(payload.progress).toBeDefined()
        expect(payload.exported_at).toBeDefined()

        await page.screenshot({ path: 'evidence/CTX10_export_modal_content.png' })
    })

    test('ExportModal の閉じるボタンでモーダルが閉じる', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-export').click()
        await expect(page.getByTestId('export-textarea')).toBeVisible({ timeout: 5000 })

        await page.getByTestId('export-close-btn').click()
        await expect(page.getByTestId('export-textarea')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX10_export_modal_closed.png' })
    })

})

test.describe('CTX-10: Graph Import [E2E]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    const importJson = JSON.stringify({
        graph: {
            nodes: [
                { id: 'x', label: 'Imported Node A', nodeType: 'git' },
                { id: 'y', label: 'Imported Node B', nodeType: 'llm' },
            ],
            edges: [{ source: 'x', target: 'y' }],
        },
    })

    test('Import ボタンが表示される', async ({ page }) => {
        await createNewGraph(page)
        await expect(page.getByTestId('btn-import')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX10_import_btn.png' })
    })

    test('Import クリックで ImportModal が開く', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX10_import_modal_open.png' })
    })

    test('ImportModal の閉じるボタンでモーダルが閉じる', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })

        await page.getByTestId('import-close-btn').click()
        await expect(page.getByTestId('import-textarea')).not.toBeVisible()

        await page.screenshot({ path: 'evidence/CTX10_import_modal_closed.png' })
    })

    test('有効な JSON をインポートするとノードがグラフに反映される', async ({ page }) => {
        await createNewGraph(page)

        // インポート前: ノードなし
        await expect(page.locator('.react-flow__node')).toHaveCount(0)

        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })

        await page.getByTestId('import-textarea').fill(importJson)
        await page.getByTestId('import-submit-btn').click()

        // モーダルが閉じる
        await expect(page.getByTestId('import-textarea')).not.toBeVisible({ timeout: 5000 })

        // インポート後: 2ノードが表示される
        await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 })

        await page.screenshot({ path: 'evidence/CTX10_import_result.png' })
    })

})