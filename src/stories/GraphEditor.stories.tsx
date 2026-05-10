/**
 * @context GraphEditor
 * @bom docs/bom/graph.ts
 * @story
 * 1. initStatus が 'checking' のときローディングを表示する
 * 2. initStatus が 'uninitialized' のとき Setup ビューを表示する
 * 3. initStatus が 'ready' かつ nodes[] が空のとき Empty State を表示する
 * 4. initStatus が 'ready' かつ nodes[] があるとき React Flow を表示する
 * 5. 「初期化」ボタンをクリックすると onMkdir が呼ばれ initStatus が 'ready' になる
 * 6. 「＋ ノード追加」ボタンをクリックすると onAddNode が呼ばれる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import { GraphEditor } from '@/components/GraphEditor'

const meta: Meta<typeof GraphEditor> = {
    component: GraphEditor,
    title: 'Project Detail/GraphEditor',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: '100%', height: '100vh', display: 'flex' }}>
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof GraphEditor>

const mockNodes: Node<GraphNodeData>[] = [
    {
        id: 'node-001',
        position: { x: 100, y: 100 },
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
    },
    {
        id: 'node-002',
        position: { x: 350, y: 200 },
        data: { label: 'useProjectStore' },
    },
]

const mockEdges: Edge[] = [
    { id: 'e-001', source: 'node-001', target: 'node-002' },
]

const noopAsync = async () => { }

// @story 状態 1: ローディング中
export const Checking: Story = {
    args: {
        initStatus: 'checking',
        projectRootPath: '/mock/project',
        onExists: () => new Promise(() => { }),
    },
}

// @story 状態 2: 未初期化（Setup ビュー）
export const Uninitialized: Story = {
    args: {
        initStatus: 'uninitialized',
        projectRootPath: '/mock/project',
        onExists: async () => false,
        onMkdir: noopAsync,
        setHydrated: () => { },
    },
}

// @story 状態 3: ready — Empty State
export const ReadyEmpty: Story = {
    args: {
        initStatus: 'ready',
        projectRootPath: '/mock/project',
        activeGraphId: null,
        nodes: [],
        edges: [],
        onExists: async () => true,
        setHydrated: () => { },
    },
}

// @story 状態 4: ready — ノードあり
export const ReadyWithNodes: Story = {
    args: {
        initStatus: 'ready',
        projectRootPath: '/mock/project',
        activeGraphId: 'graph-01',
        nodes: mockNodes,
        edges: mockEdges,
        onExists: async () => true,
        onReadTextFile: async () => JSON.stringify({
            id: 'graph-01',
            nodes: mockNodes,
            edges: mockEdges,
        }),
        setHydrated: () => { },
    },
}