/**
 * @context ProjectGrid — E2E
 * @note ダイアログ操作・バリデーション・キャンセルは Storybook play 関数でカバー済み。
 *       ここでは Tauri fs 経由の実ファイル読み込みによる初期表示のみ検証する。
 */
import { test, expect } from '@playwright/test'

test.describe('ProjectGrid — Integration', () => {
    test('should render grid on mount via real fs', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('＋ new project')).toBeVisible()
        await page.screenshot({ path: 'evidence/ProjectGrid_initial.png', fullPage: true })
    })
})