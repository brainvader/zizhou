/**
 * @context Topbar — E2E
 * @note すべてのインタラクション・表示検証は Storybook play 関数でカバー済み。
 *       Tauri fs・ルーティング依存の結合テストが発生した場合はここに追記する。
 */
import { test } from '@playwright/test'

test.describe('Topbar — E2E', () => {
    test('Tauri WebDriver 統合テスト', () => { test.skip(true, '実装待ち') })
})