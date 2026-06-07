/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  useGraphSave — SurrealDB を使ったグラフ永続化 hook（CTX-15 → CTX-21 改訂）
 * @bom      docs/bom/graph.ts (UseGraphSaveOptions / UseGraphSaveReturn / GraphStorage)
 * @story
 *   1. GraphEditor がマウントされると useGraphSave が subscribe を開始する。
 *      ただし setHydrated(true) が呼ばれるまで保存はスキップされる。
 *   2. setHydrated(true) を呼び出した後に nodes[] / edges[] が変化すると、
 *      storage.saveGraph(graphId, nodes, edges) が呼ばれる。
 *   3. activeGraphId が null の場合は storage.saveGraph を呼ばない。
 *   4. storage.saveGraph が失敗した場合は toast.error() でエラーを通知する。
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
import type { GraphNodeData, GraphStorage } from '@/bom/graph'
import { useGraphSave } from '@/hooks/useGraphSave'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const MOCK_GRAPH = 'graph-01'

type SubscribeCallback = (state: { nodes: Node<GraphNodeData>[]; edges: Edge[] }) => void
type GetStateReturn = { activeGraphId: string | null }

const {
    mockToastError,
    mockSubscribe,
    mockGetState,
} = vi.hoisted(() => ({
    mockToastError: vi.fn(),
    mockSubscribe: vi.fn<(cb: SubscribeCallback) => () => void>(),
    mockGetState: vi.fn<() => GetStateReturn>(() => ({
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

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: {
        subscribe: (cb: SubscribeCallback) => mockSubscribe(cb),
        getState: () => ({ nodes: [], edges: [] }),
    },
}))

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}))

/** テスト用 storage を生成する。saveGraph だけ差し替え可能。 */
const makeMockStorage = (
    saveGraph: GraphStorage['saveGraph'] = vi.fn<GraphStorage['saveGraph']>().mockResolvedValue(undefined),
): Pick<GraphStorage, 'saveGraph'> => ({ saveGraph })

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
    test('logic: setHydrated(true) が呼ばれるまで storage.saveGraph は呼ばれない', async () => {
        const mockSaveGraph = vi.fn<GraphStorage['saveGraph']>().mockResolvedValue(undefined)

        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        const { result } = renderHook(() => useGraphSave({ storage: makeMockStorage(mockSaveGraph) }))

        // setHydrated(true) を呼ばずに subscribe を発火
        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockSaveGraph).not.toHaveBeenCalled()
        void result
    })

    // ----------------------------------------------------------------
    // @story 2: setHydrated(true) 後に変化があると storage.saveGraph が呼ばれる
    // ----------------------------------------------------------------
    test('logic: setHydrated(true) 後に subscribe が発火すると storage.saveGraph を呼ぶ', async () => {
        const mockSaveGraph = vi.fn<GraphStorage['saveGraph']>().mockResolvedValue(undefined)

        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        const { result } = renderHook(() => useGraphSave({ storage: makeMockStorage(mockSaveGraph) }))

        act(() => result.current.setHydrated(true))

        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockSaveGraph).toHaveBeenCalledTimes(1)
        expect(mockSaveGraph).toHaveBeenCalledWith(
            MOCK_GRAPH,
            fixtureNodes,
            fixtureEdges,
        )
    })

    // ----------------------------------------------------------------
    // @story 2: saveGraph を直接呼んだ場合も storage.saveGraph が呼ばれる
    // ----------------------------------------------------------------
    test('logic: saveGraph(nodes, edges) を呼ぶと storage.saveGraph が発火する', async () => {
        const mockSaveGraph = vi.fn<GraphStorage['saveGraph']>().mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphSave({ storage: makeMockStorage(mockSaveGraph) }))

        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockSaveGraph).toHaveBeenCalledTimes(1)
        expect(mockSaveGraph).toHaveBeenCalledWith(MOCK_GRAPH, fixtureNodes, fixtureEdges)
    })

    // ----------------------------------------------------------------
    // @story 3: activeGraphId が null の場合はスキップ
    // ----------------------------------------------------------------
    test('logic: activeGraphId が null の場合 storage.saveGraph を呼ばない', async () => {
        mockGetState.mockReturnValue({ activeGraphId: null })
        const mockSaveGraph = vi.fn<GraphStorage['saveGraph']>().mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphSave({ storage: makeMockStorage(mockSaveGraph) }))

        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockSaveGraph).not.toHaveBeenCalled()
    })

    // ----------------------------------------------------------------
    // @story 4: storage.saveGraph が失敗した場合は toast.error() を呼ぶ
    // ----------------------------------------------------------------
    test('logic: storage.saveGraph が reject した場合 toast.error() を呼ぶ', async () => {
        const mockSaveGraph = vi.fn<GraphStorage['saveGraph']>().mockRejectedValue(new Error('db error'))

        const { result } = renderHook(() => useGraphSave({ storage: makeMockStorage(mockSaveGraph) }))

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

        const mockSaveGraph = vi.fn<GraphStorage['saveGraph']>()
            .mockReturnValueOnce(first)
            .mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphSave({ storage: makeMockStorage(mockSaveGraph) }))
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
        await vi.waitFor(() => expect(mockSaveGraph).toHaveBeenCalledTimes(2))

        expect(mockSaveGraph).toHaveBeenLastCalledWith(MOCK_GRAPH, updatedNodes, fixtureEdges)
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