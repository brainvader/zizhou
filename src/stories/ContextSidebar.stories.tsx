import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ContextSidebar } from '@/components/ContextSidebar'
import {
    WORKSPACE_SIDEBAR_ITEMS,
    DEFAULT_VISIBLE_CONTEXT_IDS,
    type ContextNodeId,
} from '@/bom/workspace'

const meta: Meta<typeof ContextSidebar> = {
    component: ContextSidebar,
    title: 'Workspace/ContextSidebar',
    parameters: { layout: 'centered' },
    args: {
        items: [...WORKSPACE_SIDEBAR_ITEMS],
        defaultVisibleIds: [...DEFAULT_VISIBLE_CONTEXT_IDS],
        onVisibilityChange: fn(),
    },
    decorators: [
        (Story) => (
            <div className="bg-background text-foreground p-4 min-h-[360px]">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof ContextSidebar>

function getRow(canvasElement: HTMLElement, id: ContextNodeId) {
    return canvasElement.querySelector(`[data-testid="ctx-row-${id}"]`) as HTMLElement
}

/** @story Contexts / UI セクションのラベル表示 */
export const Default: Story = {
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByText('グラフ基盤')).toBeVisible()
        await expect(canvas.getByText('ソース解析')).toBeVisible()
        await expect(canvas.getByText('プロジェクト管理')).toBeVisible()
        await expect(canvas.getByText('Todo')).toBeVisible()
        await expect(canvas.getByText('設定画面')).toBeVisible()
        await expect(canvas.getByText('ログイン画面')).toBeVisible()

        const foundation = getRow(canvasElement, 'foundation')
        await expect(foundation).toHaveAttribute('data-visible', 'true')
        await expect(foundation.querySelector('[data-eye="open"]')).toBeInTheDocument()
    },
}

/** @story Contexts は排他選択（1つ選ぶと他の Contexts も OFF） */
export const ContextsExclusiveSelect: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(getRow(canvasElement, 'source'))

        await expect(getRow(canvasElement, 'foundation')).toHaveAttribute(
            'data-visible',
            'false',
        )
        await expect(getRow(canvasElement, 'source')).toHaveAttribute(
            'data-visible',
            'true',
        )
        await expect(getRow(canvasElement, 'project')).toHaveAttribute(
            'data-visible',
            'false',
        )
    },
}

/** @story UI は排他選択（1つ選ぶと他が OFF） */
export const UiExclusiveSelect: Story = {
    args: { defaultVisibleIds: [] },
    play: async ({ canvasElement }) => {
        await userEvent.click(getRow(canvasElement, 'todo'))
        await expect(getRow(canvasElement, 'todo')).toHaveAttribute(
            'data-visible',
            'true',
        )

        await userEvent.click(getRow(canvasElement, 'settings'))
        await expect(getRow(canvasElement, 'settings')).toHaveAttribute(
            'data-visible',
            'true',
        )
        await expect(getRow(canvasElement, 'todo')).toHaveAttribute(
            'data-visible',
            'false',
        )
        await expect(getRow(canvasElement, 'login')).toHaveAttribute(
            'data-visible',
            'false',
        )
    },
}

/** @story Contexts を ON にすると UI は全 OFF */
export const ContextsClearsUi: Story = {
    args: { defaultVisibleIds: [] },
    play: async ({ canvasElement }) => {
        await userEvent.click(getRow(canvasElement, 'todo'))
        await expect(getRow(canvasElement, 'todo')).toHaveAttribute(
            'data-visible',
            'true',
        )

        await userEvent.click(getRow(canvasElement, 'foundation'))
        await expect(getRow(canvasElement, 'foundation')).toHaveAttribute(
            'data-visible',
            'true',
        )
        await expect(getRow(canvasElement, 'todo')).toHaveAttribute(
            'data-visible',
            'false',
        )
    },
}

/** @story UI を選ぶと Contexts は全 OFF */
export const UiClearsContexts: Story = {
    play: async ({ canvasElement }) => {
        await expect(getRow(canvasElement, 'foundation')).toHaveAttribute(
            'data-visible',
            'true',
        )

        await userEvent.click(getRow(canvasElement, 'login'))
        await expect(getRow(canvasElement, 'login')).toHaveAttribute(
            'data-visible',
            'true',
        )
        await expect(getRow(canvasElement, 'foundation')).toHaveAttribute(
            'data-visible',
            'false',
        )
        await expect(getRow(canvasElement, 'source')).toHaveAttribute(
            'data-visible',
            'false',
        )
        await expect(getRow(canvasElement, 'project')).toHaveAttribute(
            'data-visible',
            'false',
        )
    },
}

/** @story 可視変化で onVisibilityChange が呼ばれる */
export const VisibilityChangeCallback: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(getRow(canvasElement, 'source'))
        await expect(args.onVisibilityChange).toHaveBeenCalled()
        const calls = (args.onVisibilityChange as ReturnType<typeof fn>).mock.calls
        const last = calls[calls.length - 1]?.[0] as ContextNodeId[]
        await expect(last).toEqual(['source'])
    },
}