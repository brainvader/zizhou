/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  useGraphFile — Tauri fs を使ったグラフ JSON の永続化 hook
 * @bom      docs/bom/graph.ts
 * @story
 *   1. GraphEditor がマウントされると useGraphFile が subscribe を開始する。
 *      ただし setHydrated(true) が呼ばれるまで保存はスキップされる。
 *   2. setHydrated(true) を呼び出した後に nodes[] / edges[] が変化すると、
 *      {projectRootPath}/graphs/{activeGraphId}.json に JSON が書き込まれる。
 *   3. activeGraphId / projectRootPath が未設定の場合は書き込みをスキップする。
 *   4. writeTextFile が失敗した場合は toast.error() でエラーを通知する。
 *      Store にエラー状態は持たない。
 * @output   src/hooks/useGraphFile.ts
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import { useGraphFile } from '@/hooks/useGraphFile'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const MOCK_ROOT = '/Users/user/projects/zizou-core'
const MOCK_GRAPH = 'graph-01'

/**
 * vi.hoisted() でモック変数をホイストと同タイミングに初期化する。
 * useProjectDetailStore は getState の返り値をテストごとに差し替えられるよう
 * mockGetState を経由する。
 */
const {
    mockWriteTextFile,
    mockToastError,
    mockSubscribe,
    mockGetState,
} = vi.hoisted(() => ({
    mockWriteTextFile: vi.fn<() => Promise<void>>(),
    mockToastError: vi.fn<() => void>(),
    mockSubscribe: vi.fn<
        (cb: (state: { nodes: Node<GraphNodeData>[]; edges: Edge[] }) => void) => () => void
    >(),
    mockGetState: vi.fn<() => { activeGraphId: string | null; projectRootPath: string }>(() => ({
        activeGraphId: MOCK_GRAPH,
        projectRootPath: MOCK_ROOT,
    })),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    writeTextFile: mockWriteTextFile,
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: { getState: mockGetState },
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: { subscribe: mockSubscribe },
}))

// ---- フィクスチャ ----

const fixtureNodes: Node<GraphNodeData>[] = [
    {
        id: 'node-1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
    },
]

const fixtureEdges: Edge[] = [
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
]

type SubscribeCallback = (state: { nodes: Node<GraphNodeData>[]; edges: Edge[] }) => void

beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockImplementation(() => () => { })
    mockGetState.mockReturnValue({ activeGraphId: MOCK_GRAPH, projectRootPath: MOCK_ROOT })
})

// =============================================================================
// Slot 4: 挙動の検証コード
// =============================================================================

// --- 1. AIの内省 (Logic Verification) ---

describe('useGraphFile: logic', () => {

    test('logic: マウント時に subscribe が呼ばれ、アンマウント時に unsubscribe が呼ばれる', async () => {
        const mockUnsubscribe = vi.fn()
        mockSubscribe.mockReturnValue(mockUnsubscribe)
        mockWriteTextFile.mockResolvedValue(undefined)

        const { unmount } = renderHook(() => useGraphFile())

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        unmount()
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })

    test('logic: setHydrated(true) 前は subscribe が発火しても writeTextFile を呼ばない', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })
        mockWriteTextFile.mockResolvedValue(undefined)

        renderHook(() => useGraphFile())

        // hydrated = false のまま発火
        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: setHydrated(true) 後に subscribe が発火すると正しいパスに writeTextFile を呼ぶ', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })
        mockWriteTextFile.mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphFile())

        act(() => result.current.setHydrated(true))

        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
        expect(mockWriteTextFile).toHaveBeenCalledWith(
            `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`,
            expect.stringContaining('"nodes"'),
        )
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: activeGraphId が null の場合は writeTextFile を呼ばない', async () => {
        mockGetState.mockReturnValue({ activeGraphId: null, projectRootPath: MOCK_ROOT })

        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))

        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: projectRootPath が空の場合は writeTextFile を呼ばない', async () => {
        mockGetState.mockReturnValue({ activeGraphId: MOCK_GRAPH, projectRootPath: '' })

        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))

        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: writeTextFile が失敗した場合は toast.error() を呼ぶ', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })
        mockWriteTextFile.mockRejectedValue(new Error('fs write failed'))

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))

        await act(async () => { cb?.({ nodes: fixtureNodes, edges: fixtureEdges }) })

        expect(mockToastError).toHaveBeenCalledTimes(1)
        expect(mockWriteTextFile).toHaveBeenCalledTimes(1) // 呼ばれたが失敗
    })

    test('logic: saveGraph を直接呼び出すと {projectRootPath}/graphs/{graphId}.json に保存する', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))  // ← 追加
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockWriteTextFile).toHaveBeenCalledWith(
            `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`,
            expect.stringContaining('"nodes"'),
        )
    })

    test('logic: saving.current が true のとき最新状態を pending に記憶して再実行する', async () => {
        let resolve: () => void
        mockWriteTextFile.mockImplementation(
            () => new Promise<void>((r) => { resolve = r })
        )

        const nodesV1: Node<GraphNodeData>[] = [
            { id: 'node-1', type: 'editableNode', position: { x: 0, y: 0 }, data: { label: 'v1' } },
        ]
        const nodesV2: Node<GraphNodeData>[] = [
            { id: 'node-1', type: 'editableNode', position: { x: 0, y: 0 }, data: { label: 'v1', status: 'done' } },
        ]

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))

        // 1回目（pending のまま）
        const first = act(() => result.current.saveGraph(nodesV1, fixtureEdges))
        // 2回目（saving.current === true なので pending に記憶）
        await act(() => result.current.saveGraph(nodesV2, fixtureEdges))

        resolve!()
        await first

        // pending の v2 が再実行されるため writeTextFile は2回呼ばれる
        await vi.waitFor(() => expect(mockWriteTextFile).toHaveBeenCalledTimes(2))

        // 2回目の呼び出しに status: done が含まれる
        expect(mockWriteTextFile).toHaveBeenLastCalledWith(
            `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`,
            expect.stringContaining('"status"'),
        )
    })

    test('logic: activeGraphId が null の場合 saveGraph は writeTextFile を呼ばない', async () => {
        mockGetState.mockReturnValue({ activeGraphId: null, projectRootPath: MOCK_ROOT })

        const { result } = renderHook(() => useGraphFile())
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: projectRootPath が空の場合 saveGraph は writeTextFile を呼ばない', async () => {
        mockGetState.mockReturnValue({ activeGraphId: MOCK_GRAPH, projectRootPath: '' })

        const { result } = renderHook(() => useGraphFile())
        await act(() => result.current.saveGraph(fixtureNodes, fixtureEdges))

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: status を含むノードを saveGraph すると status が JSON に含まれる', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)

        const nodesWithStatus: Node<GraphNodeData>[] = [
            {
                id: 'node-1',
                type: 'editableNode',
                position: { x: 100, y: 100 },
                data: { label: 'Test', status: 'done' },
            },
        ]

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(nodesWithStatus, []))

        expect(mockWriteTextFile).toHaveBeenCalledWith(
            `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`,
            expect.stringContaining('"status": "done"'),
        )
    })

    test('logic: nodeType を含むノードを saveGraph すると nodeType が JSON に含まれる', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)

        const nodesWithType: Node<GraphNodeData>[] = [
            {
                id: 'node-1',
                type: 'editableNode',
                position: { x: 100, y: 100 },
                data: { label: 'Test', nodeType: 'llm' },
            },
        ]

        const { result } = renderHook(() => useGraphFile())
        act(() => result.current.setHydrated(true))
        await act(() => result.current.saveGraph(nodesWithType, []))

        expect(mockWriteTextFile).toHaveBeenCalledWith(
            `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`,
            expect.stringContaining('"nodeType": "llm"'),
        )
    })

})

// --- 2. 監督へのプレゼン (Visual Story) ---
// Persist ロジックは純粋な hook のため E2E は graph-editor.e2e.spec.ts で検証する。