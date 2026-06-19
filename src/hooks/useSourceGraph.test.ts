import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSourceGraph } from './useSourceGraph'

const { mockInvoke, mockSetSelectedFilePath, mockUseProjectDetailStore } = vi.hoisted(() => ({
    mockInvoke: vi.fn(),
    mockSetSelectedFilePath: vi.fn(),
    mockUseProjectDetailStore: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: mockUseProjectDetailStore,
}))

const MOCK_GRAPH = {
    id: 'graph:001',
    nodes: [
        { id: 'node:1', type: 'sourceNode', position: { x: 0, y: 0 }, data: { label: 'main.tsx', filePath: 'src/main.tsx', analyzed: 'fresh' } },
        { id: 'node:2', type: 'testNode', position: { x: 0, y: 0 }, data: { label: 'App.test.tsx', filePath: 'src/App.test.tsx', analyzed: 'fresh', nodeType: 'test' } },
    ],
    edges: [],
}

const defaultInvoke = (cmd: string) => {
    if (cmd === 'get_structure_graph') return Promise.resolve(MOCK_GRAPH)
    if (cmd === 'get_changed_files') return Promise.resolve([])
    return Promise.resolve(undefined)
}

beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation(defaultInvoke)
    mockUseProjectDetailStore.mockImplementation((selector: (s: any) => any) =>
        selector({
            selectedTestFilePath: null,
            setSelectedTestFilePath: mockSetSelectedFilePath,
        })
    )
})

describe('useSourceGraph', () => {
    it('マウント時に get_structure_graph / get_changed_files / analyze_tests が呼ばれる', async () => {
        renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('get_structure_graph', { projectId: 'proj-001' })
            expect(mockInvoke).toHaveBeenCalledWith('get_changed_files', { rootPath: '/projects/zizhou' })
            expect(mockInvoke).toHaveBeenCalledWith('analyze_tests', { projectId: 'proj-001' })
        })
    })

    it('structureGraph が返される', async () => {
        const { result } = renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))

        await waitFor(() => expect(result.current.structureGraph).not.toBeNull())
        expect(result.current.structureGraph?.id).toBe('graph:001')
    })

    it('analyzedFiles は structureGraph のノードの filePath の集合になる', async () => {
        const { result } = renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))

        await waitFor(() => expect(result.current.analyzedFiles.size).toBe(2))
        expect(result.current.analyzedFiles.has('src/main.tsx')).toBe(true)
        expect(result.current.analyzedFiles.has('src/App.test.tsx')).toBe(true)
    })

    it('staleFiles は changedFiles と analyzedFiles の積集合になる', async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === 'get_structure_graph') return Promise.resolve(MOCK_GRAPH)
            if (cmd === 'get_changed_files') return Promise.resolve(['src/main.tsx'])
            return Promise.resolve(undefined)
        })

        const { result } = renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))

        await waitFor(() => expect(result.current.staleFiles.size).toBe(1))
        expect(result.current.staleFiles.has('src/main.tsx')).toBe(true)
    })

    it('handleFileClick はテストファイルのみ setSelectedFilePath を呼ぶ', async () => {
        const { result } = renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))
        await waitFor(() => expect(result.current.structureGraph).not.toBeNull())

        await act(async () => {
            await result.current.handleFileClick('src/App.test.tsx')
        })
        expect(mockSetSelectedFilePath).toHaveBeenCalledWith('src/App.test.tsx')
    })

    it('handleFileClick はテストファイル以外では setSelectedFilePath を呼ばない', async () => {
        const { result } = renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))
        await waitFor(() => expect(result.current.structureGraph).not.toBeNull())

        await act(async () => {
            await result.current.handleFileClick('src/main.tsx')
        })
        expect(mockSetSelectedFilePath).not.toHaveBeenCalled()
    })

    it('handleReanalyzeAll は analyze_project / analyze_tests / get_structure_graph を呼ぶ', async () => {
        const { result } = renderHook(() => useSourceGraph('proj-001', '/projects/zizhou'))
        await waitFor(() => expect(result.current.structureGraph).not.toBeNull())

        await act(async () => {
            await result.current.handleReanalyzeAll()
        })

        expect(mockInvoke).toHaveBeenCalledWith('analyze_project', { projectId: 'proj-001' })
        expect(mockInvoke).toHaveBeenCalledWith('analyze_tests', { projectId: 'proj-001' })
    })
})