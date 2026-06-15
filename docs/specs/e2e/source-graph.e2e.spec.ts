/**
 * @context SourceGraphView E2E
 * @note Storybook で確認できないことのみをここで検証する
 *
 * 前提:
 *   VITE_PLAYWRIGHT=true pnpm dev で起動済み
 *   src/__mocks__/api-core.ts が invoke をモック
 *
 * フィクスチャ:
 *   analyze_project モックは ['src/main.tsx', 'src/components/App.tsx', 'src/hooks/useStore.ts'] を登録する
 *   _changedFiles = ['src/main.tsx'] → src/main.tsx は stale 判定される
 *
 * data-testid 規約:
 *   filePath の / を - に変換。例: src/main.tsx → source-node-src-main.tsx
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
    await expect(btn).toHaveText('Reanalyze All', { timeout: 5000 })
    // / → - 変換済み testid
    await expect(page.getByTestId('source-node-src-main.tsx')).toBeVisible({ timeout: 5000 })
}

test.describe('SourceGraphView: Integration', () => {
    test.describe.configure({ mode: 'serial' })

    test.beforeEach(async ({ page }) => {
        await navigateToProjectDetail(page)
        await setupNodes(page)
    })

    test('Reanalyze All ボタンをクリックすると analyze_project が呼ばれノードが更新される', async ({ page }) => {
        const btn = page.getByTestId('reanalyze-all-button')
        await btn.click()
        await expect(btn).toHaveText('Reanalyze All', { timeout: 10_000 })
        await expect(page.getByTestId('source-node-src-main.tsx')).toBeVisible()
        await page.screenshot({ path: 'evidence/source-graph_reanalyze-all.png' })
    })

    test('FileTree でファイルをクリックすると対応ノードがハイライトされる', async ({ page }) => {
        await page.getByTestId('fs-entry-src').click()
        await page.getByTestId('fs-entry-main.tsx').click()

        await page.getByRole('button', { name: 'Fit View' }).click()

        const node = page.getByTestId('source-node-src-main.tsx')
        await expect(node).toHaveAttribute('data-selected', 'true', { timeout: 5000 })
        await page.screenshot({ path: 'evidence/source-graph_file-node-sync.png' })
    })

    test('SourceGraphView でノードをクリックすると FileTree の対応ファイルがハイライトされる', async ({ page }) => {
        await page.getByTestId('fs-entry-src').click()
        await expect(page.getByTestId('fs-entry-main.tsx')).toBeVisible()

        // ノードをビューポート内に収める
        await page.getByRole('button', { name: 'Fit View' }).click()
        await page.waitForTimeout(300)

        const node = page.locator('.react-flow__node').filter({ has: page.getByTestId('source-node-src-main.tsx') })
        await node.click({ force: true })

        const fileEntry = page.getByTestId('fs-entry-main.tsx')
        await expect(fileEntry).toHaveAttribute('data-selected', 'true', { timeout: 3000 })
        await page.screenshot({ path: 'evidence/source-graph_node-file-sync.png' })
    })

    test.skip('ノードをドラッグ後にページを再読み込みすると位置が保持されている', async ({ page }) => {
        const node = page.getByTestId('source-node-src-main.tsx')
        const box = await node.boundingBox()
        if (!box) throw new Error('node not visible')

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2)
        await page.mouse.up()

        await page.reload()
        await navigateToProjectDetail(page)

        const nodeAfter = page.getByTestId('source-node-src-main.tsx')
        const boxAfter = await nodeAfter.boundingBox()
        if (!boxAfter) throw new Error('node not visible after reload')

        expect(boxAfter.x).toBeGreaterThan(box.x + 50)
        await page.screenshot({ path: 'evidence/source-graph_position-persist.png' })
    })
})