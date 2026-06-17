/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  useGraphLoad — SurrealDB ベースのグラフ読み込み hook（CTX-15 → CTX-21 改訂）
 * @bom      docs/bom/graph.ts (UseGraphLoadOptions / GraphStorage)
 * @story
 *   1. isDetailHydrated が true になり activeGraphId が設定されると
 *      storage.loadGraph(graphId) が呼ばれ、結果が onLoadGraphFn に渡される。
 *   2. storage.loadGraph が reject した場合は onResetGraph() が呼ばれ toast.error() が発火する。
 *   3. activeGraphId が null の場合は storage.loadGraph を呼ばない。
 *   4. setHydrated が false → true の順で呼ばれる。
 *   5. activeGraphId が変化するたびに再取得する。
 * @output   src/hooks/useGraphLoad.ts
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGraphLoad } from '@/hooks/useGraphLoad'
import type { GraphFile, GraphStorage } from '@/bom/graph'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const MOCK_GRAPH = 'graph-01'

const {
    mockToastError,
    mockUseProjectDetailStore,
    mockUseGraphStore,
} = vi.hoisted(() => ({
    mockToastError: vi.fn<() => void>(),
    mockUseProjectDetailStore: vi.fn(),
    mockUseGraphStore: vi.fn(),
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: mockUseProjectDetailStore,
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: mockUseGraphStore,
}))

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}))

const mockGraphFile: GraphFile = {
    id: MOCK_GRAPH,
    nodes: [
        {
            id: 'node-1',
            type: 'editableNode',
            position: { x: 100, y: 200 },
            data: { label: 'Test Node' },
        },
    ],
    edges: [],
}

/** テスト用 storage を生成する。loadGraph だけ差し替え可能。 */
const makeMockStorage = (
    loadGraph: GraphStorage['loadGraph'] = vi.fn<GraphStorage['loadGraph']>().mockResolvedValue(mockGraphFile),
): Pick<GraphStorage, 'loadGraph'> => ({ loadGraph })

type DetailStoreState = {
    activeGraphId: string | null
    isDetailHydrated: boolean
    setDetailHydrated: ReturnType<typeof vi.fn>
}

type GraphStoreState = {
    loadGraph: ReturnType<typeof vi.fn>
    resetGraph: ReturnType<typeof vi.fn>
}

const makeDetailState = (overrides: Partial<DetailStoreState> = {}): DetailStoreState => ({
    activeGraphId: MOCK_GRAPH,
    isDetailHydrated: true,
    setDetailHydrated: vi.fn(),
    ...overrides,
})

const makeGraphState = (overrides: Partial<GraphStoreState> = {}): GraphStoreState => ({
    loadGraph: vi.fn(),
    resetGraph: vi.fn(),
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()

    const detailState = makeDetailState()
    mockUseProjectDetailStore.mockImplementation(
        (selector: (s: DetailStoreState) => unknown) => selector(detailState),
    )

    const graphState = makeGraphState()
    mockUseGraphStore.mockImplementation(
        (selector: (s: GraphStoreState) => unknown) => selector(graphState),
    )
})

// =============================================================================
// Slot 4: 挙動の検証
// =============================================================================

describe('useGraphLoad: logic', () => {

    // ----------------------------------------------------------------
    // @story 1: activeGraphId が設定されると storage.loadGraph が呼ばれる
    // ----------------------------------------------------------------
    test('logic: activeGraphId があると storage.loadGraph が呼ばれ loadGraphFn に結果が渡される', async () => {
        const mockLoadGraph = vi.fn<GraphStorage['loadGraph']>().mockResolvedValue(mockGraphFile)
        const mockLoadGraphFn = vi.fn()

        renderHook(() =>
            useGraphLoad({
                storage: makeMockStorage(mockLoadGraph),
                onLoadGraphFn: mockLoadGraphFn,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockLoadGraph).toHaveBeenCalledWith(MOCK_GRAPH))
        await waitFor(() => expect(mockLoadGraphFn).toHaveBeenCalledWith(mockGraphFile))
    })

    // ----------------------------------------------------------------
    // @story 2: storage.loadGraph が reject した場合は resetGraph + toast.error
    // ----------------------------------------------------------------
    test('logic: storage.loadGraph が reject した場合は resetGraph と toast.error が呼ばれる', async () => {
        const mockLoadGraph = vi.fn<GraphStorage['loadGraph']>().mockRejectedValue(new Error('db error'))
        const mockResetGraph = vi.fn()

        renderHook(() =>
            useGraphLoad({
                storage: makeMockStorage(mockLoadGraph),
                onResetGraph: mockResetGraph,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockResetGraph).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1))
    })

    // ----------------------------------------------------------------
    // @story 3: activeGraphId が null の場合は storage.loadGraph を呼ばない
    // ----------------------------------------------------------------
    test('logic: activeGraphId が null の場合 storage.loadGraph を呼ばない', async () => {
        const mockLoadGraph = vi.fn<GraphStorage['loadGraph']>().mockResolvedValue(mockGraphFile)

        renderHook(() =>
            useGraphLoad({
                storage: makeMockStorage(mockLoadGraph),
                activeGraphId: null,
            })
        )

        // 少し待っても呼ばれない
        await new Promise((r) => setTimeout(r, 100))
        expect(mockLoadGraph).not.toHaveBeenCalled()
    })

    // ----------------------------------------------------------------
    // @story 4: setHydrated が false → true の順で呼ばれる
    // ----------------------------------------------------------------
    test('logic: setHydrated が false → true の順で呼ばれる', async () => {
        const mockLoadGraph = vi.fn<GraphStorage['loadGraph']>().mockResolvedValue(mockGraphFile)
        const mockSetHydrated = vi.fn()

        renderHook(() =>
            useGraphLoad({
                storage: makeMockStorage(mockLoadGraph),
                setHydrated: mockSetHydrated,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockSetHydrated).toHaveBeenCalledWith(true))
        expect(mockSetHydrated.mock.calls[0][0]).toBe(false)
        expect(mockSetHydrated.mock.calls[mockSetHydrated.mock.calls.length - 1][0]).toBe(true)
    })

    // ----------------------------------------------------------------
    // @story 5: activeGraphId が変化すると再取得する
    // ----------------------------------------------------------------
    test('logic: activeGraphId が変化するたびに storage.loadGraph を再呼び出しする', async () => {
        const mockLoadGraph = vi.fn<GraphStorage['loadGraph']>().mockResolvedValue(mockGraphFile)

        const { rerender } = renderHook(
            ({ graphId }: { graphId: string | null }) =>
                useGraphLoad({
                    storage: makeMockStorage(mockLoadGraph),
                    activeGraphId: graphId,
                }),
            { initialProps: { graphId: 'graph-01' } }
        )

        await waitFor(() => expect(mockLoadGraph).toHaveBeenCalledTimes(1))

        act(() => { rerender({ graphId: 'graph-02' }) })

        await waitFor(() => expect(mockLoadGraph).toHaveBeenCalledTimes(2))
        expect(mockLoadGraph).toHaveBeenLastCalledWith('graph-02')
    })

    // ----------------------------------------------------------------
    // パース失敗: GraphStorage.loadGraph が throw した場合は resetGraph + toast
    // (CTX-21 改訂: 旧「空グラフ fallback」を廃止し統一エラー処理に変更)
    // ----------------------------------------------------------------
    test('logic: storage.loadGraph が throw した場合は resetGraph + toast.error が呼ばれる', async () => {
        const mockLoadGraph = vi.fn<GraphStorage['loadGraph']>().mockRejectedValue(new Error('Zod parse error'))
        const mockResetGraph = vi.fn()

        renderHook(() =>
            useGraphLoad({
                storage: makeMockStorage(mockLoadGraph),
                onResetGraph: mockResetGraph,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockResetGraph).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1))
    })

})