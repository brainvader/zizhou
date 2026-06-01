/**
 * @context ResizableLayout E2E
 * @note Storybook で確認できないことのみをここで検証する
 *
 * 検証対象:
 * - /projects/:id 実ルートで3ペインが表示される（ルーティング依存）
 * - ハンドルのドラッグで FileTree 幅が実際に変化する（ピクセル計測）
 * - minSize / maxSize の制約が守られる（ドラッグ限界の確認）
 */
import { test, expect } from '@playwright/test'

test.describe('ResizableLayout: Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')

        // プロジェクト作成
        const newProjectBtn = page.getByText('＋ new project')
        await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
        await newProjectBtn.click()
        await page.waitForSelector('[role="dialog"]')
        await page.getByPlaceholder('My Awesome App').fill('E2E Test Project')
        await page.getByRole('button', { name: '作成' }).click()
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

        // プロジェクト詳細へ遷移
        await page.getByRole('link', { name: 'E2E Test Project' }).click()
        await page.waitForURL(/\/projects\//)

        // ペインが描画されるまで待つ
        await expect(page.getByTestId('file-tree')).toBeVisible({ timeout: 10000 })
    })

    test('should render 3 panes on /projects/:id', async ({ page }) => {
        await expect(page.getByTestId('file-tree')).toBeVisible()
        await expect(page.getByTestId('graph-editor')).toBeVisible()

        // NodeProperty はノード単一選択時のみ表示される
        await expect(page.getByTestId('new-graph-btn')).toBeEnabled({ timeout: 10000 })
        await page.getByTestId('new-graph-btn').click()
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-testid="graph-editor"]')
            if (!el) return false
            const { width, height } = el.getBoundingClientRect()
            return width > 0 && height > 0
        }, { timeout: 10000 })
        await page.getByRole('button', { name: /ノード追加/ }).click()
        await page.locator('.react-flow__node').first().click()
        await expect(page.getByTestId('node-property')).toBeVisible({ timeout: 5000 })

        await page.screenshot({ path: 'evidence/resizable-layout_initial.png' })
    })

    test('should resize FileTree pane by dragging handle', async ({ page }) => {
        const fileTree = page.getByTestId('file-tree')
        const handle = page.locator('[data-separator]').first()

        await expect(handle).toBeVisible()
        const initialWidth = (await fileTree.boundingBox())!.width

        const handleBox = (await handle.boundingBox())!
        const cx = handleBox.x + handleBox.width / 2
        const cy = handleBox.y + handleBox.height / 2

        await page.mouse.move(cx, cy)
        await page.mouse.down()
        await page.mouse.move(cx + 80, cy, { steps: 20 })
        await page.mouse.up()

        const newWidth = (await fileTree.boundingBox())!.width
        expect(newWidth).toBeGreaterThan(initialWidth)

        await page.screenshot({ path: 'evidence/resizable-layout_after-drag.png' })
    })

    test('should respect maxSize constraint for FileTree', async ({ page }) => {
        const fileTree = page.getByTestId('file-tree')
        const handle = page.locator('[data-separator]').first()

        await expect(handle).toBeVisible()
        const handleBox = (await handle.boundingBox())!
        const cx = handleBox.x + handleBox.width / 2
        const cy = handleBox.y + handleBox.height / 2

        await page.mouse.move(cx, cy)
        await page.mouse.down()
        await page.mouse.move(cx + 9999, cy, { steps: 20 })
        await page.mouse.up()

        const viewport = page.viewportSize()!
        const maxAllowedWidth = viewport.width * 0.4
        const actualWidth = (await fileTree.boundingBox())!.width
        expect(actualWidth).toBeLessThanOrEqual(maxAllowedWidth + 4)

        await page.screenshot({ path: 'evidence/resizable-layout_max-size.png' })
    })
})