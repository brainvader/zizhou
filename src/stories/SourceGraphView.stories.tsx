/**
 * @context SourceGraphView / SourceNode
 * @bom docs/bom/source-graph.ts
 * @story
 * 1. ノードが pending / fresh / stale の各状態で正しく表示される
 * 2. staleFiles に含まれるノードが amber でハイライトされる
 * 3. selectedFilePath に一致するノードが blue でハイライトされる（File→Node 同期）
 * 4. ↺ボタンをクリックすると onReanalyze(filePath) が呼ばれる
 * 5. ノードをクリックすると onNodeSelect(filePath) が呼ばれる（Node→File 同期）
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { SourceGraphView } from '@/components/SourceGraphView'
import type { SourceNode, SourceEdge } from '@/bom/source-graph'

const NODES: SourceNode[] = [
    {
        id: 'node-1',
        type: 'sourceNode',
        position: { x: 100, y: 100 },
        data: { label: 'main.ts', filePath: 'src/main.ts', analyzed: 'fresh' },
    },
    {
        id: 'node-2',
        type: 'sourceNode',
        position: { x: 300, y: 100 },
        data: { label: 'App.tsx', filePath: 'src/App.tsx', analyzed: 'fresh' },
    },
    {
        id: 'node-3',
        type: 'sourceNode',
        position: { x: 500, y: 100 },
        data: { label: 'utils.ts', filePath: 'src/utils.ts', analyzed: 'pending' },
    },
]

const EDGES: SourceEdge[] = [
    { id: 'e1-2', source: 'node-1', target: 'node-2', kind: 'imports' },
    { id: 'e2-3', source: 'node-2', target: 'node-3', kind: 'renders' },
]

const meta: Meta<typeof SourceGraphView> = {
    component: SourceGraphView,
    title: 'Project Detail/SourceGraphView',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: '100%', height: '600px' }}>
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof SourceGraphView>

export const AllFresh: Story = {
    args: {
        nodes: NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

export const WithStaleNodes: Story = {
    args: {
        nodes: NODES,
        edges: EDGES,
        staleFiles: new Set(['src/main.ts', 'src/App.tsx']),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

export const WithPendingNode: Story = {
    args: {
        nodes: NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

export const FileNodeSync: Story = {
    args: {
        nodes: NODES,
        edges: EDGES,
        staleFiles: new Set(),
        selectedFilePath: 'src/App.tsx',
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

/** @story ↺ボタンクリックで onReanalyze が呼ばれる */
export const ReanalyzeButton: Story = {
    args: {
        nodes: NODES,
        edges: EDGES,
        staleFiles: new Set(['src/main.ts']),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        // filePath の / → - 変換済み
        const btn = await canvas.findByTestId('reanalyze-node-src-main.ts')
        await userEvent.click(btn)
        await expect(args.onReanalyze).toHaveBeenCalledWith('src/main.ts')
    },
}

/** @story ノードクリックで onNodeSelect が呼ばれる（Node→File 同期） */
export const NodeClick: Story = {
    args: {
        nodes: NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        const node = await canvas.findByTestId('source-node-src-App.tsx')
        await userEvent.click(node)
        await expect(args.onNodeSelect).toHaveBeenCalledWith('src/App.tsx')
    },
}

export const Empty: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}