/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  useGraphSave — SurrealDB を使ったグラフ永続化 hook（CTX-15）
 * @bom      docs/bom/graph.ts (UseGraphSaveOptions / UseGraphSaveReturn)
 * @story
 *   1. GraphEditor がマウントされると useGraphSave が subscribe を開始する。
 *      ただし setHydrated(true) が呼ばれるまで保存はスキップされる。
 *   2. setHydrated(true) を呼び出した後に nodes[] / edges[] が変化すると、
 *      onSaveGraph(graphId, nodes, edges) が呼ばれる。
 *   3. activeGraphId が null の場合は onSaveGraph を呼ばない。
 *   4. onSaveGraph が失敗した場合は toast.error() でエラーを通知する。
 *      Store にエラー状態は持たない。
 *   5. 保存中に変化が来た場合は pending に積んで保存完了後に再実行する。
 * @output   src/hooks/useGraphSave.ts
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import { useGraphSave } from '@/hooks/useGraphSave'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const MOCK_GRAPH = 'graph-01'

const {
    mockToastError,
    mockSubscribe,
    mockGetState,
} = vi.hoisted(() => ({
    mockToastError: vi.fn<() => void>(),
    mockSubscribe: vi.fn<
        (cb: (state: { nodes: Node<GraphNodeData>[]; edges: Edge[] }) => void) => () => void
    >(),
    mockGetState: vi.fn<() => { activeGraphId: string | null }>(() => ({
        activeGraphId: MOCK_GRAPH,
    })),
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: {
        getState: () => mockGetState(),
    },
}))

type SubscribeCallback = (state: { nodes: Node<GraphNodeData>[]; edges: Edge[] }) => void

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: {
        subscribe: (cb: SubscribeCallback) => mockSubscribe(cb),
        getState: () => ({ nodes: [], edges: [] }),
    },
}))

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}))

const fixtureNodes: Node<GraphNodeData>[] = [
    {
        id: 'node-1',
        type: 'editableNode',
        position: { x: 100, y: 200 },
        data: { label: 'Test Node' },
    },
]
const fixtureEdges: Edge[] = []

beforeEach(() => {
    vi.clearAllMocks()
    mockGetState.mockReturnValue({ activeGraphId: MOCK_GRAPH })
    mockSubscribe.mockReturnValue(() => { })
})

// =============================================================================
// Slot 4: 挙動の検証
// =============================================================================

describe('useGraphSave: logic', () => {

    // ----------------------------------------------------------------
    // @story 1: setHydrated(true) 前は保存スキップ
    // ----------------------------------------------------------------
    test('logic: setHydrated(true) が呼ばれるまで onSaveGraph は呼ばれない', async () => {
        const mockOnSaveGraph = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        const { result } = renderHook(() => useGraphSave({ onSaveGraph: mockOnSaveGraph }))

        // setHydrated(true) を呼ばずに subscribe を発火
        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockOnSaveGraph).not.toHaveBeenCalled()
        void result
    })

    // ----------------------------------------------------------------
    // @story 2: setHydrated(true) 後に変化があると onSaveGraph が呼ばれる
    // ----------------------------------------------------------------
    test('logic: setHydrated(true) 後に subscribe が発火すると onSaveGraph を呼ぶ', async () => {
        const mockOnSaveGraph = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        const { result } = renderHook(() => useGraphSave({ onSaveGraph: mockOnSaveGraph }))

        act(() => result.current.setHydrated(true))

        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockOnSaveGraph).toHaveBeenCalledTimes(1)
        expect(mockOnSaveGraph).toHaveBeenCalledWith(
            MOCK_GRAPH,
            fixtureNodes,
            fixtureEdges,
        )
    })

    // ----------------------------------------------------------------
    // @story 2: saveGraph を直接呼んだ場合も onSaveGraph が呼ばれる
    // ----------------------------------------------------------------
    test('logic: saveGraph(nodes, edges) を呼ぶと onSaveGraph が発火する', async () => {
        const mockOnSaveGraph = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphSave({ onSaveGraph: mockOnSaveGraph }))

        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockOnSaveGraph).toHaveBeenCalledTimes(1)
        expect(mockOnSaveGraph).toHaveBeenCalledWith(MOCK_GRAPH, fixtureNodes, fixtureEdges)
    })

    // ----------------------------------------------------------------
    // @story 3: activeGraphId が null の場合はスキップ
    // ----------------------------------------------------------------
    test('logic: activeGraphId が null の場合 onSaveGraph を呼ばない', async () => {
        mockGetState.mockReturnValue({ activeGraphId: null })
        const mockOnSaveGraph = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphSave({ onSaveGraph: mockOnSaveGraph }))

        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockOnSaveGraph).not.toHaveBeenCalled()
    })

    // ----------------------------------------------------------------
    // @story 4: onSaveGraph が失敗した場合は toast.error() を呼ぶ
    // ----------------------------------------------------------------
    test('logic: onSaveGraph が reject した場合 toast.error() を呼ぶ', async () => {
        const mockOnSaveGraph = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('db error'))

        const { result } = renderHook(() => useGraphSave({ onSaveGraph: mockOnSaveGraph }))

        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    // ----------------------------------------------------------------
    // @story 5: 保存中に変化 → pending に積んで再実行
    // ----------------------------------------------------------------
    test('logic: 保存中に変化が来た場合は pending に積んで再実行する', async () => {
        let resolveFirst!: () => void
        const first = new Promise<void>((r) => { resolveFirst = r })

        const mockOnSaveGraph = vi.fn<() => Promise<void>>()
            .mockReturnValueOnce(first)
            .mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphSave({ onSaveGraph: mockOnSaveGraph }))
        act(() => result.current.setHydrated(true))

        // 1回目（解決待ち）
        const p1 = act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        // 保存中に2回目
        const updatedNodes: Node<GraphNodeData>[] = [
            { ...fixtureNodes[0], data: { label: 'Updated', status: 'done' } },
        ]
        void act(() => result.current.saveGraph(updatedNodes, fixtureEdges))

        // 1回目を解決
        resolveFirst()
        await p1

        // 2回目が pending として再実行される
        await vi.waitFor(() => expect(mockOnSaveGraph).toHaveBeenCalledTimes(2))

        expect(mockOnSaveGraph).toHaveBeenLastCalledWith(MOCK_GRAPH, updatedNodes, fixtureEdges)
    })

    // ----------------------------------------------------------------
    // unsubscribe: アンマウント時に subscribe が解除される
    // ----------------------------------------------------------------
    test('logic: アンマウント時に unsubscribe が呼ばれる', () => {
        const unsubscribe = vi.fn()
        mockSubscribe.mockReturnValue(unsubscribe)

        const { unmount } = renderHook(() => useGraphSave())
        unmount()

        expect(unsubscribe).toHaveBeenCalledTimes(1)
    })

})