/**
 * @context CTX-2/5/6/7: GraphEditor — ロジック検証
 * @bom docs/bom/graph.ts
 * @story
 * 1. onNodesChange に remove タイプの変更が渡されると store からノードが削除される
 * 2. onEdgesChange に remove タイプの変更が渡されると store からエッジが削除される
 * 3. onNodesChange に position タイプの変更が渡されると store のノード位置が更新される
 * 4. [CTX-5] onSelectionChange で複数ノードが選択されると setSelectedNodeIds が呼ばれる
 * 5. [CTX-5] onSelectionChange で単一ノードが選択されると setSelectedNodeIds が呼ばれる
 * 6. [CTX-6] onConnect が呼ばれると addEdge が呼ばれる
 * 7. [CTX-7] ノード右クリックで contextMenu state が node タイプでセットされる
 * 8. [CTX-7] エッジ右クリックで contextMenu state が edge タイプでセットされる
 * 9. [CTX-7] Delete Node が実行されると onNodesChange(remove) 経由で setNodes が呼ばれる
 * 10. [CTX-7] Delete Edge が実行されると onEdgesChange(remove) 経由で setEdges が呼ばれる
 * 11. [CTX-7] Edit Label が実行されると context-menu が閉じる
 * 12. [CTX-7] pane クリックで contextMenu state が null になる
 * @output src/components/GraphEditor.tsx
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'

const {
    mockSetNodes,
    mockSetEdges,
    mockSetSelectedNodeIds,
    mockAddEdge,
    mockGetState,
    mockNodes,
    mockEdges,
} = vi.hoisted(() => {
    const mockNodes: Node<GraphNodeData>[] = [
        { id: 'node-001', position: { x: 100, y: 100 }, data: { label: 'Node A' } },
        { id: 'node-002', position: { x: 200, y: 200 }, data: { label: 'Node B' } },
    ]
    const mockEdges: Edge[] = [
        { id: 'edge-001', source: 'node-001', target: 'node-002' },
    ]
    return {
        mockSetNodes: vi.fn(),
        mockSetEdges: vi.fn(),
        mockSetSelectedNodeIds: vi.fn(),
        mockAddEdge: vi.fn(),
        mockGetState: vi.fn(() => ({ activeGraphId: null, projectRootPath: '' })),
        mockNodes,
        mockEdges,
    }
})

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({
            nodes: mockNodes,
            edges: mockEdges,
            addNode: vi.fn(),
            addEdge: mockAddEdge,
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            setSelectedNodeId: vi.fn(),
            setSelectedNodeIds: mockSetSelectedNodeIds,
        })
    ),
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: Object.assign(
        vi.fn((selector: (s: any) => any) =>
            selector({
                initStatus: 'ready',
                projectRootPath: '/mock',
                activeGraphId: null,
                isDetailHydrated: true,  // ← 追加
                setInitStatus: vi.fn(),
            })
        ),
        { getState: mockGetState }
    ),
}))

vi.mock('@/hooks/useGraphFile', () => ({
    useGraphFile: () => ({ setHydrated: vi.fn(), saveGraph: vi.fn() }),
}))

vi.mock('@/hooks/useGraphInit', () => ({
    useGraphInit: () => ({}),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    exists: vi.fn(),
    readTextFile: vi.fn(),
}))

vi.mock('@xyflow/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@xyflow/react')>()
    return {
        ...actual,
        ReactFlow: ({
            onNodesChange,
            onEdgesChange,
            onSelectionChange,
            onConnect,
            onNodeContextMenu,
            onEdgeContextMenu,
            onPaneClick,
        }: any) => (
            <div data-testid="mock-react-flow">
                {/* CTX-2: nodes/edges change */}
                <button
                    data-testid="trigger-remove-node"
                    onClick={() => onNodesChange?.([{ type: 'remove', id: 'node-001' } as NodeChange])}
                >
                    remove node
                </button>
                <button
                    data-testid="trigger-remove-edge"
                    onClick={() => onEdgesChange?.([{ type: 'remove', id: 'edge-001' } as EdgeChange])}
                >
                    remove edge
                </button>
                <button
                    data-testid="trigger-move-node"
                    onClick={() => onNodesChange?.([{
                        type: 'position',
                        id: 'node-001',
                        position: { x: 300, y: 400 },
                    } as NodeChange])}
                >
                    move node
                </button>
                {/* CTX-5: selection */}
                <button
                    data-testid="trigger-multi-select"
                    onClick={() => onSelectionChange?.({
                        nodes: [
                            { id: 'node-001', position: { x: 100, y: 100 }, data: { label: 'Node A' } },
                            { id: 'node-002', position: { x: 200, y: 200 }, data: { label: 'Node B' } },
                        ],
                        edges: [],
                    })}
                >
                    multi select
                </button>
                <button
                    data-testid="trigger-single-select"
                    onClick={() => onSelectionChange?.({
                        nodes: [{ id: 'node-001', position: { x: 100, y: 100 }, data: { label: 'Node A' } }],
                        edges: [],
                    })}
                >
                    single select
                </button>
                {/* CTX-6: connect */}
                <button
                    data-testid="trigger-connect"
                    onClick={() => onConnect?.({
                        source: 'node-001',
                        target: 'node-002',
                        sourceHandle: null,
                        targetHandle: null,
                    })}
                >
                    connect
                </button>
                {/* CTX-7: context menu */}
                <button
                    data-testid="trigger-node-context-menu"
                    onClick={(e) => onNodeContextMenu?.(e, {
                        id: 'node-001',
                        position: { x: 100, y: 100 },
                        data: { label: 'Node A' },
                    })}
                >
                    node context menu
                </button>
                <button
                    data-testid="trigger-edge-context-menu"
                    onClick={(e) => onEdgeContextMenu?.(e, {
                        id: 'edge-001',
                        source: 'node-001',
                        target: 'node-002',
                    })}
                >
                    edge context menu
                </button>
                <button
                    data-testid="trigger-pane-click"
                    onClick={(e) => onPaneClick?.(e)}
                >
                    pane click
                </button>
            </div>
        ),
        Background: () => null,
        Controls: () => null,
        applyNodeChanges: actual.applyNodeChanges,
        applyEdgeChanges: actual.applyEdgeChanges,
    }
})

import { GraphEditor } from '@/components/GraphEditor'

beforeEach(() => {
    vi.clearAllMocks()
})

// ─── CTX-2: onNodesChange / onEdgesChange ────────────────────────────────────

describe('GraphEditor: onNodesChange / onEdgesChange', () => {

    test('logic: remove タイプの NodeChange が渡されると setNodes が呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-remove-node').click() })
        expect(mockSetNodes).toHaveBeenCalledTimes(1)
        const updatedNodes = mockSetNodes.mock.calls[0][0] as Node<GraphNodeData>[]
        expect(updatedNodes.find((n) => n.id === 'node-001')).toBeUndefined()
    })

    test('logic: remove タイプの EdgeChange が渡されると setEdges が呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-remove-edge').click() })
        expect(mockSetEdges).toHaveBeenCalledTimes(1)
        const updatedEdges = mockSetEdges.mock.calls[0][0] as Edge[]
        expect(updatedEdges.find((e) => e.id === 'edge-001')).toBeUndefined()
    })

    test('logic: position タイプの NodeChange が渡されると setNodes がノード位置を更新する', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-move-node').click() })
        expect(mockSetNodes).toHaveBeenCalledTimes(1)
        const updatedNodes = mockSetNodes.mock.calls[0][0] as Node<GraphNodeData>[]
        const movedNode = updatedNodes.find((n) => n.id === 'node-001')
        expect(movedNode?.position).toEqual({ x: 300, y: 400 })
    })

})

// ─── CTX-5: onSelectionChange ─────────────────────────────────────────────────

describe('GraphEditor: [CTX-5] onSelectionChange', () => {

    test('logic: 複数ノード選択時に setSelectedNodeIds が ids 配列で呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-multi-select').click() })
        expect(mockSetSelectedNodeIds).toHaveBeenCalledOnce()
        expect(mockSetSelectedNodeIds).toHaveBeenCalledWith(['node-001', 'node-002'])
    })

    test('logic: 単一ノード選択時に setSelectedNodeIds が単一要素配列で呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-single-select').click() })
        expect(mockSetSelectedNodeIds).toHaveBeenCalledOnce()
        expect(mockSetSelectedNodeIds).toHaveBeenCalledWith(['node-001'])
    })

})

// ─── CTX-6: onConnect ────────────────────────────────────────────────────────

describe('GraphEditor: [CTX-6] onConnect', () => {

    test('logic: onConnect が呼ばれると addEdge が connection オブジェクトで呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-connect').click() })
        expect(mockAddEdge).toHaveBeenCalledOnce()
        expect(mockAddEdge).toHaveBeenCalledWith({
            source: 'node-001',
            target: 'node-002',
            sourceHandle: null,
            targetHandle: null,
        })
    })

})

// ─── CTX-7: Context Menu ─────────────────────────────────────────────────────

describe('GraphEditor: [CTX-7] Context Menu', () => {

    test('logic: ノード右クリックで context-menu が node タイプで表示される', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-node-context-menu').click() })
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-edit-label')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-delete')).toBeInTheDocument()
    })

    test('logic: エッジ右クリックで context-menu が edge タイプで表示される', async () => {
        render(<GraphEditor initStatus="ready" />)
        await act(async () => { screen.getByTestId('trigger-edge-context-menu').click() })
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
        expect(screen.queryByTestId('menu-item-edit-label')).not.toBeInTheDocument()
        expect(screen.getByTestId('menu-item-delete')).toBeInTheDocument()
    })

    test('logic: pane クリックで context-menu が閉じる', async () => {
        render(<GraphEditor initStatus="ready" />)
        // まずメニューを開く
        await act(async () => { screen.getByTestId('trigger-node-context-menu').click() })
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
        // pane クリックで閉じる
        await act(async () => { screen.getByTestId('trigger-pane-click').click() })
        expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument()
    })

    test('logic: Delete Node が実行されると onNodesChange(remove) 経由で setNodes が呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        // ノード右クリックでメニューを開く
        await act(async () => { screen.getByTestId('trigger-node-context-menu').click() })
        // Delete Node をクリック
        await act(async () => { screen.getByTestId('menu-item-delete').click() })
        expect(mockSetNodes).toHaveBeenCalledTimes(1)
        const updatedNodes = mockSetNodes.mock.calls[0][0] as Node<GraphNodeData>[]
        expect(updatedNodes.find((n) => n.id === 'node-001')).toBeUndefined()
    })

    test('logic: Delete Edge が実行されると onEdgesChange(remove) 経由で setEdges が呼ばれる', async () => {
        render(<GraphEditor initStatus="ready" />)
        // エッジ右クリックでメニューを開く
        await act(async () => { screen.getByTestId('trigger-edge-context-menu').click() })
        // Delete Edge をクリック
        await act(async () => { screen.getByTestId('menu-item-delete').click() })
        expect(mockSetEdges).toHaveBeenCalledTimes(1)
        const updatedEdges = mockSetEdges.mock.calls[0][0] as Edge[]
        expect(updatedEdges.find((e) => e.id === 'edge-001')).toBeUndefined()
    })

    test('logic: Edit Label が実行されると context-menu が閉じる', async () => {
        render(<GraphEditor initStatus="ready" />)
        // ノード右クリックでメニューを開く
        await act(async () => { screen.getByTestId('trigger-node-context-menu').click() })
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
        // Edit Label をクリック
        await act(async () => { screen.getByTestId('menu-item-edit-label').click() })
        // メニューが閉じる（editingNodeId がセットされ contextMenu が null になった証拠）
        expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument()
    })

})