import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { WorkspaceTopbar } from '@/components/WorkspaceTopbar'

const meta: Meta<typeof WorkspaceTopbar> = {
    component: WorkspaceTopbar,
    title: 'Workspace/WorkspaceTopbar',
    parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof WorkspaceTopbar>

/** @story ロゴ・Zizou・「Context Graph Workspace」が表示される */
export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('地蔵')).toBeVisible()
        await expect(canvas.getByText('Zizou')).toBeVisible()
        await expect(canvas.getByText('Context Graph Workspace')).toBeVisible()
    },
}
