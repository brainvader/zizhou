import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Topbar } from './Topbar'

describe('Topbar', () => {
    it('ロゴ・タイトル・バージョンが表示される', () => {
        render(<Topbar />)
        expect(screen.getByText('地蔵')).toBeInTheDocument()
        expect(screen.getByText('Zizou')).toBeInTheDocument()
        expect(screen.getByText(/Protocol v7\.00/i)).toBeInTheDocument()
    })

    it('Settings ボタンが表示される', () => {
        render(<Topbar />)
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    })

    it('Settings ボタンをクリックすると onSettingsClick が呼ばれる', () => {
        const onSettingsClick = vi.fn()
        render(<Topbar onSettingsClick={onSettingsClick} />)
        fireEvent.click(screen.getByRole('button', { name: /settings/i }))
        expect(onSettingsClick).toHaveBeenCalledTimes(1)
    })

    it('onSettingsClick が未指定でもクリックでエラーが発生しない', () => {
        render(<Topbar />)
        expect(() =>
            fireEvent.click(screen.getByRole('button', { name: /settings/i }))
        ).not.toThrow()
    })
})