/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context Topbar
 * @bom docs/bom/project.ts
 * @story
 * 1. ユーザーがアプリを起動する
 * 2. Topbar に「地蔵」ロゴ（漢字・romaji・バージョン）、Settings アイコンボタンが表示される
 * 3. ユーザーが Settings ボタンをクリックする
 * 4. onSettingsClick コールバックが呼び出される
 * @output src/components/Topbar.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Topbar } from '../../src/components/Topbar'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */
const { mockOnSettingsClick } = vi.hoisted(() => ({
    mockOnSettingsClick: vi.fn(),
}))

const setup = (overrides?: { onSettingsClick?: () => void }) => {
    const onSettingsClick = overrides?.onSettingsClick ?? mockOnSettingsClick
    return render(<Topbar onSettingsClick={onSettingsClick} />)
}

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 1. AIの内省 (Logic Verification) ---

describe('Topbar — logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('logic: ロゴ漢字「地蔵」が表示される', () => {
        setup()
        expect(screen.getByText('地蔵')).toBeTruthy()
    })

    it('logic: romaji「Zizou」が表示される', () => {
        setup()
        expect(screen.getByText(/zizou/i)).toBeTruthy()
    })

    it('logic: バージョン文字列「Protocol v7.00」が表示される', () => {
        setup()
        expect(screen.getByText(/protocol v7\.00/i)).toBeTruthy()
    })

    it('logic: Settings ボタンが role=button として存在する', () => {
        setup()
        expect(screen.getByRole('button', { name: /settings/i })).toBeTruthy()
    })

    it('logic: Settings ボタンクリックで onSettingsClick が1回呼ばれる', () => {
        setup()
        fireEvent.click(screen.getByRole('button', { name: /settings/i }))
        expect(mockOnSettingsClick).toHaveBeenCalledTimes(1)
    })

    it('logic: onSettingsClick が未指定でもクリックでエラーが発生しない', () => {
        // デフォルト props なし — クラッシュしないことを確認
        expect(() => {
            render(<Topbar />)
            fireEvent.click(screen.getByRole('button', { name: /settings/i }))
        }).not.toThrow()
    })
})

// --- 2. 監督へのプレゼン (Visual Story) は topbar.e2e.spec.ts で実施 ---