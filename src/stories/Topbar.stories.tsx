/**
 * @context Topbar
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時にトップバーが表示される
 * 2. 「地蔵」ロゴ・「Zizou」・「Protocol v7.00」が表示される
 * 3. Settings ボタンをクリックすると onSettingsClick が発火する
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Topbar } from '@/components/Topbar'

const meta: Meta<typeof Topbar> = {
    component: Topbar,
    title: 'Projects/Topbar',
    parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Topbar>

export const Default: Story = {
    args: {
        onSettingsClick: () => console.log('settings clicked'),
    },
}