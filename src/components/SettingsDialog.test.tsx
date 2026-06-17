import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'

// Radix UI Dialog はポータルレンダリングを使う外部ライブラリのためモックする。
// 視覚的な動作確認は SettingsDialog.stories.tsx に委ねる。
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

describe('SettingsDialog', () => {
    it('open=true のとき「Settings」タイトルと「閉じる」ボタンが表示される', () => {
        render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    })

    it('open=false のときコンテンツが表示されない', () => {
        render(<SettingsDialog open={false} onOpenChange={vi.fn()} />)
        expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })

    it('「閉じる」ボタンをクリックすると onOpenChange(false) が呼ばれる', () => {
        const onOpenChange = vi.fn()
        render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)
        fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(onOpenChange).toHaveBeenCalledTimes(1)
    })
})