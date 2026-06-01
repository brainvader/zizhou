/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  useGraphLoad — SurrealDB ベースのグラフ読み込み hook（CTX-15）
 * @bom      docs/bom/graph.ts (UseGraphLoadOptions)
 * @story
 *   1. isDetailHydrated が true になり activeGraphId が設定されると
 *      onLoadGraph(graphId) が呼ばれ、結果が onLoadGraphFn に渡される。
 *   2. onLoadGraph が reject した場合は onResetGraph() が呼ばれ toast.error() が発火する。
 *   3. activeGraphId が null の場合は onLoadGraph を呼ばない。
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
import type { GraphFile } from '@/bom/graph'

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
    // @story 1: activeGraphId が設定されると onLoadGraph が呼ばれる
    // ----------------------------------------------------------------
    test('logic: activeGraphId があると onLoadGraph が呼ばれ loadGraph に結果が渡される', async () => {
        const mockOnLoadGraph = vi.fn<(id: string) => Promise<GraphFile>>().mockResolvedValue(mockGraphFile)
        const mockLoadGraphFn = vi.fn()

        renderHook(() =>
            useGraphLoad({
                onLoadGraph: mockOnLoadGraph,
                onLoadGraphFn: mockLoadGraphFn,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockOnLoadGraph).toHaveBeenCalledWith(MOCK_GRAPH))
        await waitFor(() => expect(mockLoadGraphFn).toHaveBeenCalledWith(mockGraphFile))
    })

    // ----------------------------------------------------------------
    // @story 2: onLoadGraph が reject した場合は resetGraph + toast.error
    // ----------------------------------------------------------------
    test('logic: onLoadGraph が reject した場合は resetGraph と toast.error が呼ばれる', async () => {
        const mockOnLoadGraph = vi.fn<(id: string) => Promise<GraphFile>>().mockRejectedValue(new Error('db error'))
        const mockResetGraph = vi.fn()

        renderHook(() =>
            useGraphLoad({
                onLoadGraph: mockOnLoadGraph,
                onResetGraph: mockResetGraph,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockResetGraph).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1))
    })

    // ----------------------------------------------------------------
    // @story 3: activeGraphId が null の場合は onLoadGraph を呼ばない
    // ----------------------------------------------------------------
    test('logic: activeGraphId が null の場合 onLoadGraph を呼ばない', async () => {
        const mockOnLoadGraph = vi.fn<(id: string) => Promise<GraphFile>>().mockResolvedValue(mockGraphFile)

        renderHook(() =>
            useGraphLoad({
                onLoadGraph: mockOnLoadGraph,
                activeGraphId: null,
            })
        )

        // 少し待っても呼ばれない
        await new Promise((r) => setTimeout(r, 100))
        expect(mockOnLoadGraph).not.toHaveBeenCalled()
    })

    // ----------------------------------------------------------------
    // @story 4: setHydrated が false → true の順で呼ばれる
    // ----------------------------------------------------------------
    test('logic: setHydrated が false → true の順で呼ばれる', async () => {
        const mockOnLoadGraph = vi.fn<(id: string) => Promise<GraphFile>>().mockResolvedValue(mockGraphFile)
        const mockSetHydrated = vi.fn()

        renderHook(() =>
            useGraphLoad({
                onLoadGraph: mockOnLoadGraph,
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
    test('logic: activeGraphId が変化するたびに onLoadGraph を再呼び出しする', async () => {
        const mockOnLoadGraph = vi.fn<(id: string) => Promise<GraphFile>>().mockResolvedValue(mockGraphFile)

        const { rerender } = renderHook(
            ({ graphId }: { graphId: string | null }) =>
                useGraphLoad({
                    onLoadGraph: mockOnLoadGraph,
                    activeGraphId: graphId,
                }),
            { initialProps: { graphId: 'graph-01' } }
        )

        await waitFor(() => expect(mockOnLoadGraph).toHaveBeenCalledTimes(1))

        act(() => { rerender({ graphId: 'graph-02' }) })

        await waitFor(() => expect(mockOnLoadGraph).toHaveBeenCalledTimes(2))
        expect(mockOnLoadGraph).toHaveBeenLastCalledWith('graph-02')
    })

    // ----------------------------------------------------------------
    // パース失敗: Zod バリデーション失敗時は空グラフで loadGraph する
    // ----------------------------------------------------------------
    test('logic: Zod パース失敗時は空グラフで loadGraph を呼ぶ', async () => {
        const invalidData = { id: MOCK_GRAPH, nodes: 'invalid', edges: [] }
        const mockOnLoadGraph = vi.fn<(id: string) => Promise<unknown>>().mockResolvedValue(invalidData)
        const mockLoadGraphFn = vi.fn()

        renderHook(() =>
            useGraphLoad({
                onLoadGraph: mockOnLoadGraph as (id: string) => Promise<GraphFile>,
                onLoadGraphFn: mockLoadGraphFn,
                activeGraphId: MOCK_GRAPH,
            })
        )

        await waitFor(() => expect(mockLoadGraphFn).toHaveBeenCalledWith(
            expect.objectContaining({ id: MOCK_GRAPH, nodes: [], edges: [] })
        ))
    })

})