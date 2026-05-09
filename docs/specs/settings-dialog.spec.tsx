/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-4: SETTINGS DIALOG
 * @bom docs/bom/project.ts
 * @story
 * 1. Topbar の Settings アイコンボタンをクリックする
 * 2. Settings ダイアログが開き「Settings」タイトルと「閉じる」ボタンが表示される
 * 3. 「閉じる」ボタンをクリックする
 * 4. ダイアログが閉じる（アンマウントされる）
 * 5. overlay（backdrop）をクリックする
 * 6. ダイアログが閉じる（アンマウントされる）
 * @output src/components/SettingsDialog.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDialog } from '../../src/components/SettingsDialog'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */
const onOpenChange = vi.fn<[boolean], void>()

const renderOpen = () =>
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)

const renderClosed = () =>
    render(<SettingsDialog open={false} onOpenChange={onOpenChange} />)

beforeEach(() => {
    onOpenChange.mockClear()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 1. AIの内省 (Logic Verification) ---

describe('SettingsDialog — logic', () => {
    it('open=true のとき「Settings」タイトルが表示される', () => {
        renderOpen()
        expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('open=true のとき「閉じる」ボタンが表示される', () => {
        renderOpen()
        expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    })

    it('open=false のときダイアログコンテンツがマウントされない', () => {
        renderClosed()
        expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })

    it('「閉じる」ボタンクリックで onOpenChange(false) が呼ばれる', async () => {
        const user = userEvent.setup()
        renderOpen()
        await user.click(screen.getByRole('button', { name: '閉じる' }))
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(onOpenChange).toHaveBeenCalledTimes(1)
    })
})

// --- 2. 監督へのプレゼン (Visual Story) ---
// Playwright E2E にて証拠スクリーンショットを撮影する。
// → docs/specs/settings-dialog.e2e.spec.ts を参照。