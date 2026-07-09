import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ContextGraphView } from '@/components/ContextGraphView'
import { DEFAULT_VISIBLE_CONTEXT_IDS } from '@/bom/workspace'

const meta: Meta<typeof ContextGraphView> = {
    component: ContextGraphView,
    title: 'Workspace/ContextGraphView',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="bg-background text-foreground p-4">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof ContextGraphView>

/** @story 初期表示（foundation のみ） */
export const FoundationOnly: Story = {
    args: { visibleIds: [...DEFAULT_VISIBLE_CONTEXT_IDS] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-node-foundation')).toBeVisible()
        await expect(canvas.queryByTestId('graph-empty')).not.toBeInTheDocument()
    },
}

/** @story 複数 Contexts ON */
export const MultipleContexts: Story = {
    args: { visibleIds: ['foundation', 'source', 'project'] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-node-foundation')).toBeVisible()
        await expect(canvas.getByTestId('graph-node-source')).toBeVisible()
        await expect(canvas.getByTestId('graph-node-project')).toBeVisible()
        await expect(canvas.getByTestId('graph-edge-foundation-source')).toBeInTheDocument()
        await expect(canvas.getByTestId('graph-edge-foundation-project')).toBeInTheDocument()
    },
}

/** @story Todo UI コンテキスト */
export const Todo: Story = {
    args: { visibleIds: ['todo'] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-node-add-todo-form')).toBeVisible()
        await expect(canvas.getByTestId('graph-node-use-todo-store')).toBeVisible()
        await expect(canvas.queryByTestId('graph-node-foundation')).not.toBeInTheDocument()
    },
}

/** @story 可視なし → 空状態 */
export const Empty: Story = {
    args: { visibleIds: [] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-empty')).toBeVisible()
        await expect(canvas.getByText('表示中のコンテクストがありません')).toBeVisible()
    },
}
