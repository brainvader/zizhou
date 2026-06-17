import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGraphList } from './useGraphList'

const { mockInvoke, mockSetDetailHydrated, mockSetActiveGraphId, mockGetState, mockUseProjectDetailStore } = vi.hoisted(() => ({
    mockInvoke: vi.fn(),
    mockSetDetailHydrated: vi.fn(),
    mockSetActiveGraphId: vi.fn(),
    mockGetState: vi.fn(),
    mockUseProjectDetailStore: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: Object.assign(
        mockUseProjectDetailStore,
        { getState: mockGetState }
    ),
}))

beforeEach(() => {
    vi.clearAllMocks()
    mockUseProjectDetailStore.mockImplementation((selector: (s: any) => any) =>
        selector({ setDetailHydrated: mockSetDetailHydrated })
    )
    mockGetState.mockReturnValue({
        activeGraphId: null,
        setActiveGraphId: mockSetActiveGraphId,
    })
})

describe('useGraphList', () => {
    it('マウント時に list_graphs が呼ばれる', async () => {
        mockInvoke.mockResolvedValue([])
        renderHook(() => useGraphList('proj-001'))
        await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('list_graphs', { projectId: 'proj-001' }))
    })

    it('グラフが存在し activeGraphId が null のとき最初のグラフが setActiveGraphId に渡される', async () => {
        mockInvoke.mockResolvedValue([{ id: 'graph:001', name: 'Main' }])
        renderHook(() => useGraphList('proj-001'))
        await waitFor(() => expect(mockSetActiveGraphId).toHaveBeenCalledWith('graph:001'))
    })

    it('activeGraphId が既に設定されているとき setActiveGraphId は呼ばれない', async () => {
        mockGetState.mockReturnValue({
            activeGraphId: 'graph:existing',
            setActiveGraphId: mockSetActiveGraphId,
        })
        mockInvoke.mockResolvedValue([{ id: 'graph:001', name: 'Main' }])
        renderHook(() => useGraphList('proj-001'))
        await waitFor(() => expect(mockSetDetailHydrated).toHaveBeenCalledWith(true))
        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
    })

    it('グラフが空のとき setActiveGraphId は呼ばれない', async () => {
        mockInvoke.mockResolvedValue([])
        renderHook(() => useGraphList('proj-001'))
        await waitFor(() => expect(mockSetDetailHydrated).toHaveBeenCalledWith(true))
        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
    })

    it('完了後に setDetailHydrated(true) が呼ばれる', async () => {
        mockInvoke.mockResolvedValue([])
        renderHook(() => useGraphList('proj-001'))
        await waitFor(() => expect(mockSetDetailHydrated).toHaveBeenCalledWith(true))
    })

    it('list_graphs が失敗しても setDetailHydrated(true) が呼ばれる', async () => {
        mockInvoke.mockRejectedValue(new Error('db error'))
        renderHook(() => useGraphList('proj-001'))
        await waitFor(() => expect(mockSetDetailHydrated).toHaveBeenCalledWith(true))
    })
})