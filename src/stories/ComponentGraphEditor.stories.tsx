import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ComponentGraphEditor } from '@/components/ComponentGraphEditor'
import { DEFAULT_VISIBLE_CONTEXT_IDS } from '@/bom/workspace'

const meta: Meta<typeof ComponentGraphEditor> = {
    component: ComponentGraphEditor,
    title: 'Workspace/ComponentGraphEditor',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="bg-background text-foreground p-4 w-[700px] h-[600px] flex flex-col">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof ComponentGraphEditor>

/** @story 初期表示（foundation のみ） */
export const FoundationOnly: Story = {
    args: { visibleIds: [...DEFAULT_VISIBLE_CONTEXT_IDS] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-node-foundation')).toBeVisible()
    },
}

/** @story 複数 Contexts ON */
export const MultipleContexts: Story = {
    args: { visibleIds: ['foundation', 'source', 'project'] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-node-foundation')).toBeVisible()
        await expect(canvas.getByTestId('graph-node-source')).toBeVisible()
        await expect(canvas.getByTestId('graph-node-project')).toBeVisible()
    },
}

/** @story Todo UI コンテキスト */
export const Todo: Story = {
    args: { visibleIds: ['todo'] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('graph-node-add-todo-form')).toBeVisible()
        await expect(canvas.getByTestId('graph-node-use-todo-store')).toBeVisible()
    },
}

/** @story 可視なし → 空状態 */
export const Empty: Story = {
    args: { visibleIds: [] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('component-graph-empty')).toBeVisible()
    },
}
