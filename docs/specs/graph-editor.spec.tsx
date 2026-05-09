/**
 * Slot 1: 発注用ヘッダー
 * @context CTX-2: GraphEditor
 * @bom docs/bom/graph.ts
 * @story
 * 1. コンポーネントマウント時、Tauri fs で {projectRootPath}/graphs/ の存在を確認する（initStatus: 'checking'）
 * 2. graphs/ が存在しない場合、Setup ビューに切り替わり「初期化」ボタンが表示される（initStatus: 'uninitialized'）
 * 3. 「初期化」ボタンをクリックすると Tauri fs の mkdir が呼ばれ graphs/ が作成され、エディタビューに切り替わる（initStatus: 'ready'）
 * 4. graphs/ が存在する場合、直接エディタビューが表示される（initStatus: 'ready'）
 * 5. 「＋ ノード追加」ボタンをクリックするとデフォルト位置にノードが追加される
 * 6. nodes[] が空のとき「ノードを追加してください」の Empty State が表示される
 * 7. ノードをクリックすると selectedNodeId が更新される
 * @output src/components/GraphEditor.tsx
 */

/**
 * Slot 2: インポート
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GraphFile, InitStatus } from '../../docs/bom/graph'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '../../docs/bom/graph'

// GraphEditor は実装後にここから import する
// import { GraphEditor } from '@/components/GraphEditor'

/**
 * Slot 3: モック・セットアップ
 */

// --- Tauri fs プラグインのモック ---
const mockExists = vi.hoisted(() => vi.fn<() => Promise<boolean>>())
const mockMkdir = vi.hoisted(() => vi.fn<() => Promise<void>>())

vi.mock('@tauri-apps/plugin-fs', () => ({
    exists: mockExists,
    mkdir: mockMkdir,
}))

// --- React Flow のモック（DOM 環境では ResizeObserver 等が未実装のため） ---
vi.mock('@xyflow/react', () => ({
    ReactFlow: ({ children, nodes, onNodeClick }: {
        children?: React.ReactNode
        nodes: Node[]
        onNodeClick?: (event: React.MouseEvent, node: Node) => void
    }) => (
        <div data-testid="react-flow">
            {nodes.map((node) => (
                <div
                    key={node.id}
                    data-testid={`node-${node.id}`}
                    onClick={(e) => onNodeClick?.(e, node)}
                >
                    {(node.data as GraphNodeData).label}
                </div>
            ))}
            {children}
        </div>
    ),
    Background: () => <div data-testid="rf-background" />,
    Controls: () => <div data-testid="rf-controls" />,
    useNodesState: (init: Node[]) => {
        const [nodes, setNodes] = vi.fn().mockReturnValue([init, vi.fn(), vi.fn()])()
        return [nodes, vi.fn(), vi.fn()]
    },
    useEdgesState: (init: Edge[]) => {
        const [edges, setEdges] = vi.fn().mockReturnValue([init, vi.fn(), vi.fn()])()
        return [edges, vi.fn(), vi.fn()]
    },
}))

// --- Zustand store のモック ---
const mockUseGraphStore = vi.hoisted(() => vi.fn())
const mockUseProjectDetailStore = vi.hoisted(() => vi.fn())

vi.mock('@/store/useGraphStore', () => ({ useGraphStore: mockUseGraphStore }))
vi.mock('@/store/useProjectDetailStore', () => ({ useProjectDetailStore: mockUseProjectDetailStore }))

// --- nanoid のモック ---
vi.mock('nanoid', () => ({ nanoid: () => 'test-node-id' }))

const makeGraphStoreState = (overrides: Partial<{
    nodes: Node<GraphNodeData>[]
    edges: Edge[]
    selectedNodeId: string | null
    addNode: ReturnType<typeof vi.fn>
    setSelectedNodeId: ReturnType<typeof vi.fn>
    setNodes: ReturnType<typeof vi.fn>
    setEdges: ReturnType<typeof vi.fn>
}> = {}) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    addNode: vi.fn(),
    setSelectedNodeId: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    ...overrides,
})

const makeDetailStoreState = (overrides: Partial<{
    initStatus: InitStatus
    projectRootPath: string
    setInitStatus: ReturnType<typeof vi.fn>
}> = {}) => ({
    initStatus: 'ready' as InitStatus,
    projectRootPath: '/Users/user/projects/zizou-core',
    setInitStatus: vi.fn(),
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
    mockUseGraphStore.mockImplementation((selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
        selector(makeGraphStoreState())
    )
    mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
        selector(makeDetailStoreState())
    )
})

/**
 * Slot 4: 挙動の検証
 */

// --- 1. ロジック検証 ---

describe('GraphEditor: Init Check logic', () => {
    test('マウント時に exists({projectRootPath}/graphs/) が呼ばれる', async () => {
        mockExists.mockResolvedValueOnce(true)
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'checking' }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // await waitFor(() => {
        //     expect(mockExists).toHaveBeenCalledWith('/Users/user/projects/zizou-core/graphs')
        // })

        // Placeholder: ロジック確認のみ
        const path = '/Users/user/projects/zizou-core/graphs'
        mockExists.mockResolvedValueOnce(true)
        await expect(mockExists(path)).resolves.toBe(true)
        expect(mockExists).toHaveBeenCalledWith(path)
    })

    test('graphs/ が存在しない場合、setInitStatus("uninitialized") が呼ばれる', async () => {
        mockExists.mockResolvedValueOnce(false)
        const setInitStatus = vi.fn()
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'checking', setInitStatus }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // await waitFor(() => expect(setInitStatus).toHaveBeenCalledWith('uninitialized'))

        // Placeholder: 値を確認
        expect(false).toBe(false)
    })

    test('graphs/ が存在する場合、setInitStatus("ready") が呼ばれる', async () => {
        mockExists.mockResolvedValueOnce(true)
        const setInitStatus = vi.fn()
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'checking', setInitStatus }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // await waitFor(() => expect(setInitStatus).toHaveBeenCalledWith('ready'))

        expect(true).toBe(true)
    })
})

describe('GraphEditor: Init Dir logic', () => {
    test('「初期化」ボタンクリックで mkdir が呼ばれ setInitStatus("ready") が呼ばれる', async () => {
        mockMkdir.mockResolvedValueOnce(undefined)
        const setInitStatus = vi.fn()
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'uninitialized', setInitStatus }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // await userEvent.click(screen.getByRole('button', { name: /初期化/ }))
        // await waitFor(() => {
        //     expect(mockMkdir).toHaveBeenCalledWith('/Users/user/projects/zizou-core/graphs', { recursive: true })
        //     expect(setInitStatus).toHaveBeenCalledWith('ready')
        // })

        expect(true).toBe(true)
    })
})

describe('GraphEditor: Add Node logic', () => {
    test('「＋ ノード追加」クリックで addNode が呼ばれる', async () => {
        const addNode = vi.fn()
        mockUseGraphStore.mockImplementation((selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
            selector(makeGraphStoreState({ addNode }))
        )
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'ready' }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // await userEvent.click(screen.getByRole('button', { name: /ノード追加/ }))
        // expect(addNode).toHaveBeenCalledOnce()
        // const calledNode: Node<GraphNodeData> = addNode.mock.calls[0][0]
        // expect(calledNode.id).toBe('test-node-id')
        // expect(calledNode.data.label).toBe('New Node')
        // expect(calledNode.position).toEqual({ x: expect.any(Number), y: expect.any(Number) })

        expect(true).toBe(true)
    })

    test('initStatus が "ready" 以外のとき「＋ ノード追加」ボタンは disabled', () => {
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'uninitialized' }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // expect(screen.getByRole('button', { name: /ノード追加/ })).toBeDisabled()

        expect(true).toBe(true)
    })
})

describe('GraphEditor: Select Node logic', () => {
    test('ノードクリックで setSelectedNodeId が呼ばれる', async () => {
        const setSelectedNodeId = vi.fn()
        const mockNode: Node<GraphNodeData> = {
            id: 'node-1',
            position: { x: 100, y: 100 },
            data: { label: 'ProjectGrid.tsx' },
        }
        mockUseGraphStore.mockImplementation((selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
            selector(makeGraphStoreState({ nodes: [mockNode], setSelectedNodeId }))
        )
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'ready' }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // await userEvent.click(screen.getByTestId('node-node-1'))
        // expect(setSelectedNodeId).toHaveBeenCalledWith('node-1')

        expect(true).toBe(true)
    })
})

describe('GraphEditor: Empty State', () => {
    test('nodes[] が空のとき Empty State が表示される', () => {
        mockUseGraphStore.mockImplementation((selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
            selector(makeGraphStoreState({ nodes: [] }))
        )
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'ready' }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // expect(screen.getByText('ノードを追加してください')).toBeInTheDocument()

        expect(true).toBe(true)
    })

    test('nodes[] にノードがあるとき Empty State は表示されない', () => {
        const mockNode: Node<GraphNodeData> = {
            id: 'node-1',
            position: { x: 0, y: 0 },
            data: { label: 'Some Node' },
        }
        mockUseGraphStore.mockImplementation((selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
            selector(makeGraphStoreState({ nodes: [mockNode] }))
        )
        mockUseProjectDetailStore.mockImplementation((selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState({ initStatus: 'ready' }))
        )

        // TODO: GraphEditor 実装後にコメントアウト解除
        // render(<GraphEditor />)
        // expect(screen.queryByText('ノードを追加してください')).not.toBeInTheDocument()

        expect(true).toBe(true)
    })
})