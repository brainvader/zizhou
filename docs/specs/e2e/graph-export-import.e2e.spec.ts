/**
 * @context CTX-10: Graph Export / Import — E2E
 */
import { test, expect } from '@playwright/test'

const gotoProjectDetail = async (page: import('@playwright/test').Page) => {
    await page.goto('/')
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
    await newProjectBtn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByPlaceholder('My Awesome App').fill('E2E Test Project')
    await page.getByPlaceholder('/Users/user/projects/my-app').fill('/tmp/e2e-test')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
    await page.getByRole('link', { name: 'E2E Test Project' }).click()
    await expect(page.getByTestId('graph-editor')).toBeVisible({ timeout: 10000 })
}

const createNewGraph = async (page: import('@playwright/test').Page) => {
    await gotoProjectDetail(page)

    // New Graph ボタンが有効になるまで待機
    await expect(page.getByTestId('new-graph-btn')).toBeEnabled({ timeout: 10000 })

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

test.describe('CTX-10: Graph Export [E2E]', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.evaluate(() => localStorage.clear())
    })

    test.skip('Export ボタンが表示される', async ({ page }) => {
        await createNewGraph(page)
        await expect(page.getByTestId('btn-export')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX10_export_btn.png' })
    })

    test.skip('Export クリックで ExportModal が開く', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-export').click()
        await expect(page.getByTestId('export-textarea')).toBeVisible({ timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX10_export_modal_open.png' })
    })

    test.skip('ExportModal の JSON にグラフ情報が含まれる', async ({ page }) => {
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

    test.skip('ExportModal の閉じるボタンでモーダルが閉じる', async ({ page }) => {
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

    test.skip('Import ボタンが表示される', async ({ page }) => {
        await createNewGraph(page)
        await expect(page.getByTestId('btn-import')).toBeVisible()
        await page.screenshot({ path: 'evidence/CTX10_import_btn.png' })
    })

    test.skip('Import クリックで ImportModal が開く', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })
        await page.screenshot({ path: 'evidence/CTX10_import_modal_open.png' })
    })

    test.skip('ImportModal の閉じるボタンでモーダルが閉じる', async ({ page }) => {
        await createNewGraph(page)
        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })
        await page.getByTestId('import-close-btn').click()
        await expect(page.getByTestId('import-textarea')).not.toBeVisible()
        await page.screenshot({ path: 'evidence/CTX10_import_modal_closed.png' })
    })

    test.skip('有効な JSON をインポートするとノードがグラフに反映される', async ({ page }) => {
        await createNewGraph(page)
        await expect(page.locator('.react-flow__node')).toHaveCount(0)
        await page.getByTestId('btn-import').click()
        await expect(page.getByTestId('import-textarea')).toBeVisible({ timeout: 5000 })
        await page.getByTestId('import-textarea').fill(importJson)
        await page.getByTestId('import-submit-btn').click()
        await expect(page.getByTestId('import-textarea')).not.toBeVisible({ timeout: 5000 })
        await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 })
        await page.screenshot({ path: 'evidence/CTX10_import_result.png' })
    })

})