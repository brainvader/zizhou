/**
 * @context SettingsDialog
 * @story
 * 1. Settings ボタンをクリックするとダイアログが開く
 * 2. 「閉じる」ボタンをクリックするとダイアログが閉じる
 * 3. overlay をクリックするとダイアログが閉じる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsDialog } from '@/components/SettingsDialog'

const meta: Meta<typeof SettingsDialog> = {
    component: SettingsDialog,
    title: 'Projects/SettingsDialog',
    parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof SettingsDialog>

// @story 状態 1: 開いている
export const Open: Story = {
    args: {
        open: true,
        onOpenChange: (open) => console.log('onOpenChange', open),
    },
}

// @story 状態 2: 閉じている
export const Closed: Story = {
    args: {
        open: false,
        onOpenChange: (open) => console.log('onOpenChange', open),
    },
}