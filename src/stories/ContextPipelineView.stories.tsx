import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ContextPipelineView } from '@/components/ContextPipelineView'
import { DEFAULT_VISIBLE_CONTEXT_IDS } from '@/bom/workspace'

const meta: Meta<typeof ContextPipelineView> = {
    component: ContextPipelineView,
    title: 'Workspace/ContextPipelineView',
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
type Story = StoryObj<typeof ContextPipelineView>

/** @story 初期表示（foundation） */
export const Foundation: Story = {
    args: { visibleIds: [...DEFAULT_VISIBLE_CONTEXT_IDS] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('pipeline-breadcrumb')).toHaveTextContent(
            'グラフ基盤',
        )
        await expect(canvas.getByTestId('pipeline-stage-design')).toBeVisible()
        await expect(canvas.queryByTestId('pipeline-empty')).not.toBeInTheDocument()
    },
}

/** @story ソース解析コンテキスト */
export const Source: Story = {
    args: { visibleIds: ['source'] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('pipeline-breadcrumb')).toHaveTextContent(
            'ソース解析',
        )
        await expect(canvas.getByTestId('pipeline-stage-task-splitting')).toHaveAttribute(
            'data-status',
            'doing',
        )
    },
}

/** @story 可視なし → 空状態 */
export const Empty: Story = {
    args: { visibleIds: [] },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('pipeline-empty')).toBeVisible()
        await expect(
            canvas.queryByTestId('pipeline-stage-design'),
        ).not.toBeInTheDocument()
    },
}
