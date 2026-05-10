/**
 * @context CTX-4: SETTINGS DIALOG — E2E
 * @note ダイアログ開閉・overlay クリックは Storybook play 関数でカバー済み。
 *       Tauri WebDriver が利用可能になったらネイティブウィンドウ統合テストを追記する。
 */
import { test } from '@playwright/test'

test.describe('SettingsDialog — E2E', () => {
    test('Tauri WebDriver 統合テスト', () => { test.skip(true, '実装待ち') })
})