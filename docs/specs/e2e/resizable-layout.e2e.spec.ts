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
        const firstCard = page.locator('[data-testid^="card-"]').first()
        await firstCard.click()
        await page.waitForURL(/\/projects\//)
        // ペインが描画されるまで待つ
        await expect(page.getByTestId('file-tree')).toBeVisible()
    })

    test('should render 3 panes on /projects/:id', async ({ page }) => {
        await expect(page.getByTestId('file-tree')).toBeVisible()
        await expect(page.getByTestId('graph-editor')).toBeVisible()
        await expect(page.getByTestId('node-property-pane')).toBeVisible()
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

        // steps を指定して連続した mousemove を発生させる
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

        // 大きく右にドラッグして maxSize (40%) を超えないことを確認
        await page.mouse.move(cx, cy)
        await page.mouse.down()
        await page.mouse.move(cx + 9999, cy, { steps: 20 })
        await page.mouse.up()

        const viewport = page.viewportSize()!
        const maxAllowedWidth = viewport.width * 0.4 // maxSize: 40%
        const actualWidth = (await fileTree.boundingBox())!.width
        expect(actualWidth).toBeLessThanOrEqual(maxAllowedWidth + 4) // 4px tolerance

        await page.screenshot({ path: 'evidence/resizable-layout_max-size.png' })
    })
})