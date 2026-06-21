import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { screen } from 'storybook/test'
import { SettingsDialog } from '@/components/SettingsDialog'

const meta: Meta<typeof SettingsDialog> = {
    component: SettingsDialog,
    title: 'Projects/SettingsDialog',
    parameters: { layout: 'centered' },
    args: {
        onOpenChange: fn(),
    },
}
export default meta
type Story = StoryObj<typeof SettingsDialog>

// @story 状態 1: 開いている — タイトルと閉じるボタンの表示確認
export const Open: Story = {
    args: { open: true },
    play: async () => {
        await expect(await screen.findByText('Settings')).toBeVisible()
        await expect(screen.getByRole('button', { name: '閉じる' })).toBeVisible()
    },
}

// @story 状態 2: 閉じている — コンテンツが表示されない
export const Closed: Story = {
    args: {
        open: false,
    },
    play: async () => {
        await expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    },
}

// @story 状態 3: 「閉じる」ボタンクリックで onOpenChange(false) が呼ばれる
export const CloseButton: Story = {
    args: { open: true },
    play: async ({ userEvent, args }) => {
        await userEvent.click(await screen.findByRole('button', { name: '閉じる' }))
        await expect(args.onOpenChange).toHaveBeenCalledWith(false)
        await expect(args.onOpenChange).toHaveBeenCalledTimes(1)
    },
}