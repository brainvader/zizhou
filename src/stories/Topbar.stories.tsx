/**
 * @context Topbar
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時にトップバーが表示される
 * 2. 「地蔵」ロゴ・「Zizou」・「Protocol v7.00」が表示される
 * 3. Settings ボタンをクリックすると onSettingsClick が発火する
 * 4. onSettingsClick が未指定でもクリックでエラーが発生しない
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Topbar } from '@/components/Topbar'

const meta: Meta<typeof Topbar> = {
    component: Topbar,
    title: 'Projects/Topbar',
    parameters: { layout: 'fullscreen' },
    args: {
        onSettingsClick: fn(),
    },
}
export default meta
type Story = StoryObj<typeof Topbar>

// @story 状態 1-2: ロゴ・ボタンの表示確認
export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('地蔵')).toBeVisible()
        await expect(canvas.getByText(/zizou/i)).toBeVisible()
        await expect(canvas.getByText(/protocol v7\.00/i)).toBeVisible()
        await expect(canvas.getByRole('button', { name: /settings/i })).toBeVisible()
    },
}

// @story 状態 3: Settings ボタンクリックで onSettingsClick が発火する
export const ClickSettings: Story = {
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /settings/i }))
        await expect(args.onSettingsClick).toHaveBeenCalledTimes(1)
    },
}

// @story 状態 4: onSettingsClick 未指定でもクリックでエラーが発生しない
export const NoCallback: Story = {
    args: {
        onSettingsClick: undefined,
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /settings/i }))
        await expect(canvas.getByRole('button', { name: /settings/i })).toBeVisible()
    },
}