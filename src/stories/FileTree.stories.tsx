/**
 * @context CTX-1 / FileTree
 * @bom docs/bom/graph.ts (FileTreeProps, GraphListItem)
 * @story
 * 1. グラフ一覧が表示される
 * 2. グラフが存在しない場合は「No graphs」が表示される
 * 3. ローディング中は「Loading…」が表示される
 * 4. エラー時はエラーメッセージが表示される
 * 5. activeGraphId に一致するグラフはハイライトされる
 * 6. グラフをクリックすると onNavigate が呼ばれる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { FileTree } from '@/components/FileTree'

const meta: Meta<typeof FileTree> = {
    component: FileTree,
    title: 'Project Detail/FileTree',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: '220px', height: '100vh' }}>
                <Story />
            </div>
        ),
    ],
    args: {
        projectId: 'proj-001',
        onNavigate: fn(),
    },
}
export default meta
type Story = StoryObj<typeof FileTree>

const mockGraphs = [
    { id: 'graph-01', name: 'main' },
    { id: 'graph-02', name: 'feature-x' },
]

// @story 状態 1: 通常表示
export const Default: Story = {
    args: {
        onListGraphs: async () => mockGraphs,
    },
    play: async ({ canvas }) => {
        await expect(canvas.findByText('main')).resolves.toBeVisible()
        await expect(canvas.getByText('feature-x')).toBeVisible()
    },
}

// @story 状態 2: グラフなし
export const Empty: Story = {
    args: {
        onListGraphs: async () => [],
    },
    play: async ({ canvas }) => {
        await expect(canvas.findByText('No graphs')).resolves.toBeVisible()
    },
}

// @story 状態 3: ローディング中
export const Loading: Story = {
    args: {
        onListGraphs: () => new Promise(() => { }),
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Loading…')).toBeVisible()
    },
}

// @story 状態 4: エラー
export const LoadError: Story = {
    args: {
        onListGraphs: async () => { throw new Error('db error') },
    },
    play: async ({ canvas }) => {
        await expect(canvas.findByText('Failed to load graphs')).resolves.toBeVisible()
    },
}

// @story 状態 5: アクティブグラフあり
export const WithActiveGraph: Story = {
    args: {
        onListGraphs: async () => mockGraphs,
        activeGraphId: 'graph-01',
    },
    play: async ({ canvas }) => {
        const item = await canvas.findByTestId('graph-item-graph-01')
        await expect(item).toBeVisible()
    },
}

// @story 状態 6: クリックで onNavigate が呼ばれる
export const ClickNavigate: Story = {
    args: {
        onListGraphs: async () => mockGraphs,
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(await canvas.findByText('main'))
        await expect(args.onNavigate).toHaveBeenCalledWith('graph-01')
    },
}