/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context CTX-12: useProjectDetailLoad / useProjectDetailSave
 * @bom     docs/bom/graph.ts
 *
 * @story
 * 1. useProjectDetailLoad が invoke('list_graphs') でグラフ一覧を取得し、
 *    useProjectDetailStore に activeGraphId を注入する。
 * 2. グラフが存在しない場合、store を変更せずに完了する。
 * 3. 完了後に setDetailHydrated(true) を呼ぶ。
 * 4. invoke 失敗時に toast.error を呼ぶ。
 *
 * @note useProjectDetailSave は SurrealDB 移行に伴い再設計予定。
 *       現在のテストは保留中（skipped）。
 *
 * @output src/hooks/useProjectDetailLoad.ts
 * @output src/hooks/useProjectDetailSave.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProjectDetailLoad } from '@/hooks/useProjectDetailLoad'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const {
    mockToastError,
    mockSetActiveGraphId,
    mockSetDetailHydrated,
    mockActiveGraphId,
} = vi.hoisted(() => ({
    mockToastError: vi.fn<() => void>(),
    mockSetActiveGraphId: vi.fn<() => void>(),
    mockSetDetailHydrated: vi.fn<() => void>(),
    mockActiveGraphId: { current: null as string | null },
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: {
        getState: () => ({
            setActiveGraphId: mockSetActiveGraphId,
            setDetailHydrated: mockSetDetailHydrated,
            activeGraphId: mockActiveGraphId.current,
        }),
    },
}))

// =============================================================================
// Slot 4: useProjectDetailLoad
// =============================================================================

describe('useProjectDetailLoad: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockActiveGraphId.current = null
    })

    test('logic: グラフ一覧が返った場合、最初のグラフを activeGraphId にセットする', async () => {
        const mockListGraphs = vi.fn().mockResolvedValue([
            { id: 'graph-01', name: 'main' },
            { id: 'graph-02', name: 'feature-x' },
        ])

        const { result } = renderHook(() => useProjectDetailLoad(mockListGraphs))
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockListGraphs).toHaveBeenCalledWith('proj-001')
        expect(mockSetActiveGraphId).toHaveBeenCalledWith('graph-01')
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: グラフが存在しない場合、setActiveGraphId を呼ばずに完了する', async () => {
        const mockListGraphs = vi.fn().mockResolvedValue([])

        const { result } = renderHook(() => useProjectDetailLoad(mockListGraphs))
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: 完了後に setDetailHydrated(true) を呼ぶ', async () => {
        const mockListGraphs = vi.fn().mockResolvedValue([])

        const { result } = renderHook(() => useProjectDetailLoad(mockListGraphs))
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockSetDetailHydrated).toHaveBeenCalledWith(true)
    })

    test('logic: invoke 失敗時に toast.error を呼ぶ', async () => {
        const mockListGraphs = vi.fn().mockRejectedValue(new Error('db error'))

        const { result } = renderHook(() => useProjectDetailLoad(mockListGraphs))
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockToastError).toHaveBeenCalledTimes(1)
        expect(mockSetDetailHydrated).toHaveBeenCalledWith(true)
    })

    test('logic: 前回の activeGraphId がリストに存在する場合は上書きしない', async () => {
        mockActiveGraphId.current = 'graph-02' // 前回選択済み

        const mockListGraphs = vi.fn().mockResolvedValue([
            { id: 'graph-01', name: 'main' },
            { id: 'graph-02', name: 'feature-x' },
        ])

        const { result } = renderHook(() => useProjectDetailLoad(mockListGraphs))
        await act(() => result.current.loadProjectDetail('proj-001'))

        // graph-02 は存在するので上書きしない
        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
    })
})

// =============================================================================
// useProjectDetailSave: SurrealDB 移行に伴い再設計予定
// =============================================================================

describe.skip('useProjectDetailSave: logic', () => {
    test.todo('SurrealDB 移行後に再実装する')
})