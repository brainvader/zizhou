/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-16: RootPathInput — ディレクトリ選択付きパス入力コンポーネント
 * @bom     docs/bom/project.ts
 * @story
 * 1. テキスト入力に値を入力すると onChange が呼ばれる
 * 2. 📁 ボタンをクリックすると onOpenDirectory が呼ばれ、返ったパスが onChange に渡される
 * 3. onOpenDirectory が null を返したとき onChange は呼ばれない
 * 4. error が渡されたとき エラー文字列が表示される
 * 5. onOpenDirectory を省略したとき Tauri plugin-dialog の open() にフォールバックする（props DI）
 * @output src/components/RootPathInput.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RootPathInput } from '@/components/RootPathInput'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */
const { mockTauriOpen } = vi.hoisted(() => ({
    mockTauriOpen: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: mockTauriOpen,
}))

const makeProps = (overrides: Partial<React.ComponentProps<typeof RootPathInput>> = {}) => ({
    value: '',
    onChange: vi.fn(),
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

describe('RootPathInput: logic', () => {

    // @story 1: テキスト入力 → onChange が呼ばれる
    test('logic: テキスト入力で onChange が呼ばれる', () => {
        const onChange = vi.fn()
        render(<RootPathInput value="" onChange={onChange} />)

        fireEvent.change(screen.getByPlaceholderText(/Users/), {
            target: { value: '/projects/my-app' },
        })

        expect(onChange).toHaveBeenCalledWith('/projects/my-app')
    })

    // @story 2: 📁 ボタン → onOpenDirectory が呼ばれ、返ったパスが onChange に渡される
    test('logic: onOpenDirectory が文字列を返したとき onChange にパスが渡される', async () => {
        const onChange = vi.fn()
        const onOpenDirectory = vi.fn().mockResolvedValue('/selected/path')

        render(<RootPathInput value="" onChange={onChange} onOpenDirectory={onOpenDirectory} />)

        fireEvent.click(screen.getByRole('button', { name: /フォルダを選択/ }))

        await waitFor(() => {
            expect(onOpenDirectory).toHaveBeenCalledOnce()
            expect(onChange).toHaveBeenCalledWith('/selected/path')
        })
    })

    // @story 3: onOpenDirectory が null を返したとき onChange は呼ばれない
    test('logic: onOpenDirectory が null を返したとき onChange は呼ばれない', async () => {
        const onChange = vi.fn()
        const onOpenDirectory = vi.fn().mockResolvedValue(null)

        render(<RootPathInput value="" onChange={onChange} onOpenDirectory={onOpenDirectory} />)

        fireEvent.click(screen.getByRole('button', { name: /フォルダを選択/ }))

        await waitFor(() => {
            expect(onOpenDirectory).toHaveBeenCalledOnce()
        })
        expect(onChange).not.toHaveBeenCalled()
    })

    // @story 4: error が渡されたときエラー文字列が表示される
    test('logic: error が渡されたときエラーメッセージが表示される', () => {
        render(<RootPathInput value="" onChange={vi.fn()} error="root path は必須です" />)

        expect(screen.getByText('root path は必須です')).toBeInTheDocument()
    })

    // error が null/undefined のときエラーが表示されない
    test('logic: error が null のときエラーメッセージが表示されない', () => {
        render(<RootPathInput value="" onChange={vi.fn()} error={null} />)

        expect(screen.queryByText(/必須/)).not.toBeInTheDocument()
    })

    // @story 5: onOpenDirectory 省略時は Tauri plugin-dialog の open() にフォールバック
    test('logic: onOpenDirectory 省略時は Tauri open() が呼ばれる', async () => {
        mockTauriOpen.mockResolvedValue('/tauri/selected/path')
        const onChange = vi.fn()

        render(<RootPathInput value="" onChange={onChange} />)

        fireEvent.click(screen.getByRole('button', { name: /フォルダを選択/ }))

        await waitFor(() => {
            expect(mockTauriOpen).toHaveBeenCalledWith({ directory: true, multiple: false })
            expect(onChange).toHaveBeenCalledWith('/tauri/selected/path')
        })
    })
})