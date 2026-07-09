import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ContextChatPanel } from '@/components/ContextChatPanel'

const meta: Meta<typeof ContextChatPanel> = {
    component: ContextChatPanel,
    title: 'Workspace/ContextChatPanel',
    parameters: { layout: 'centered' },
    args: { onSend: fn() },
    decorators: [
        (Story) => (
            <div className="bg-background text-foreground p-4">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof ContextChatPanel>

/** @story 初期メッセージ表示 */
export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Chat')).toBeVisible()
        await expect(canvas.getByText('EXECUTION · Haiku')).toBeVisible()
        await expect(canvas.getByText('SONNET')).toBeVisible()
    },
}

/** @story 送信でユーザーメッセージ追加 */
export const SendMessage: Story = {
    play: async ({ canvas, args }) => {
        await userEvent.type(canvas.getByPlaceholderText('指示を入力…'), '確認しました')
        await userEvent.click(canvas.getByRole('button', { name: '送信' }))
        const messages = canvas.getAllByTestId(/^chat-message-/)
        await expect(messages[messages.length - 1]).toHaveTextContent('確認しました')
        await expect(args.onSend).toHaveBeenCalledWith('確認しました')
    },
}
