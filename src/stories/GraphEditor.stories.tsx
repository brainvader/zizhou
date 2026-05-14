/**
 * @context GraphEditor
 * @bom docs/bom/graph.ts
 * @story
 * 1. initStatus が 'checking' のときローディングを表示する
 * 2. initStatus が 'uninitialized' のとき Setup ビューを表示する
 * 3. initStatus が 'ready' かつ nodes[] が空のとき Empty State を表示する
 * 4. initStatus が 'ready' かつ nodes[] があるとき React Flow を表示する
 * 5. 「初期化」ボタンをクリックすると onMkdir が呼ばれる
 * 6. 「＋ ノード追加」ボタンをクリックすると onAddNode が呼ばれる
 * 7. initStatus が 'ready' 以外のとき「＋ ノード追加」ボタンは表示されない
 *
 * @note ノード削除（Delete キー）の検証は以下の理由により E2E に委譲する：
 *   - React Flow は ResizeObserver によるサイズ計測完了まで visibility: hidden を維持する
 *   - Vitest browser mode (Chromium) では ResizeObserver が発火しない場合があり toBeVisible() が不安定
 *   - ロジック検証（onNodesChange の remove 処理）は docs/specs/graph-editor.spec.tsx でカバー済み
 *   - 実際のキーボード操作からの削除フローは docs/specs/graph-editor.e2e.spec.ts でカバー済み
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
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
    args: {
        onAddNode: fn(),
        onMkdir: async () => { },
        onExists: async () => true,
        setHydrated: () => { },
    },
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

// @story 状態 1: ローディング中
export const Checking: Story = {
    args: {
        initStatus: 'checking',
        projectRootPath: '/mock/project',
        onExists: () => new Promise(() => { }),
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Loading…')).toBeVisible()
    },
}

// @story 状態 2: 未初期化（Setup ビュー）
export const Uninitialized: Story = {
    args: {
        initStatus: 'uninitialized',
        projectRootPath: '/mock/project',
        onExists: async () => false,
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /初期化/ })).toBeVisible()
        await expect(canvas.queryByRole('button', { name: /ノード追加/ })).not.toBeInTheDocument()
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
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('ノードを追加してください')).toBeVisible()
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
        onReadTextFile: async () => JSON.stringify({
            id: 'graph-01',
            nodes: mockNodes,
            edges: mockEdges,
        }),
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /ノード追加/ })).toBeVisible()
        await expect(canvas.queryByText('ノードを追加してください')).not.toBeInTheDocument()
    },
}

// @story 状態 5: 「初期化」ボタンクリックで onMkdir が呼ばれる
export const ClickInit: Story = {
    args: {
        initStatus: 'uninitialized',
        projectRootPath: '/mock/project',
        onExists: async () => false,
        onMkdir: fn(),
        onSetInitStatus: fn(),
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /初期化/ }))
        await expect(args.onMkdir).toHaveBeenCalledOnce()
    },
}

// @story 状態 6: 「＋ ノード追加」ボタンクリックで onAddNode が呼ばれる
export const ClickAddNode: Story = {
    args: {
        initStatus: 'ready',
        projectRootPath: '/mock/project',
        nodes: [],
        edges: [],
        onAddNode: fn(),
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /ノード追加/ }))
        await expect(args.onAddNode).toHaveBeenCalledOnce()
    },
}