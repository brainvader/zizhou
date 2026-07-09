/**
 * ContextChatPanel — 作業指示のチャットを表示する
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-chat.ts
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ContextChatPanel } from './ContextChatPanel'

describe('作業指示のチャットを表示する', () => {
    it('Chat 見出しとメッセージ一覧が表示される', () => {
        render(<ContextChatPanel />)
        expect(screen.getByTestId('context-chat-panel')).toBeInTheDocument()
        expect(screen.getByText('Chat')).toBeInTheDocument()
        expect(screen.getByTestId('chat-messages')).toBeInTheDocument()
    })

    it('初期メッセージ（EXECUTION / ユーザー / SONNET）が表示される', () => {
        render(<ContextChatPanel />)
        expect(screen.getByText('EXECUTION · Haiku')).toBeInTheDocument()
        expect(screen.getByText(/toggles node visibility の失敗/)).toBeInTheDocument()
        expect(screen.getByText('SONNET')).toBeInTheDocument()
    })

    it('入力して送信するとユーザーメッセージが末尾に追加される', async () => {
        const user = userEvent.setup()
        render(<ContextChatPanel />)

        const before = screen.getAllByTestId(/^chat-message-/).length
        await user.type(screen.getByPlaceholderText('指示を入力…'), '次の修正を進めて')
        await user.click(screen.getByRole('button', { name: '送信' }))

        const messages = screen.getAllByTestId(/^chat-message-/)
        expect(messages).toHaveLength(before + 1)
        expect(messages[messages.length - 1]).toHaveTextContent('次の修正を進めて')
        expect(messages[messages.length - 1]).toHaveAttribute('data-role', 'user')
    })

    it('空文字では送信してもメッセージが増えない', async () => {
        const user = userEvent.setup()
        render(<ContextChatPanel />)

        const before = screen.getAllByTestId(/^chat-message-/).length
        await user.click(screen.getByRole('button', { name: '送信' }))
        expect(screen.getAllByTestId(/^chat-message-/)).toHaveLength(before)
    })
})
