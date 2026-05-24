/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectLoad — 起動時に一度だけ projects.json を読み込む hook
 * @bom docs/bom/project.ts
 * @story
 * 1. loadProjects が呼び出される。
 *    AppData/projects.json が存在する場合、JSON をパースして Zustand の setProjects() に渡す。
 * 2. projects.json が存在しない場合、setProjects([]) で空配列を初期化する。
 *    エラーは発生しない。
 * 3. projects.json の JSON が不正な場合、setProjects([]) にフォールバックし、
 *    toast.error() でエラーを通知する。
 * 4. 完了後に setHydrated(true) を呼ぶ。
 * @output src/hooks/useProjectLoad.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Project } from '@/bom/project'
import { useProjectLoad } from '@/hooks/useProjectLoad'

const {
    mockReadTextFile,
    mockExists,
    mockToastError,
    mockSetProjects,
    mockSetHydrated,
} = vi.hoisted(() => ({
    mockReadTextFile: vi.fn<() => Promise<string>>(),
    mockExists: vi.fn<() => Promise<boolean>>(),
    mockToastError: vi.fn<() => void>(),
    mockSetProjects: vi.fn<() => void>(),
    mockSetHydrated: vi.fn<() => void>(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: mockReadTextFile,
    exists: mockExists,
    BaseDirectory: { AppData: 'AppData' },
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: {
        getState: () => ({
            setProjects: mockSetProjects,
            setHydrated: mockSetHydrated,
        }),
    },
}))

const fixtureProjects: Project[] = [
    { id: '1', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。', rootPath: '/Users/user/projects/zizou-core' },
    { id: '2', name: 'Graph Renderer', description: 'ノード・エッジの依存関係を可視化するビューエンジン。', rootPath: '/Users/user/projects/graph-renderer' },
]

describe('useProjectLoad: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('logic: projects.json が存在する場合、パースして setProjects に渡す', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(JSON.stringify(fixtureProjects))

        const { result } = renderHook(() => useProjectLoad())
        await act(() => result.current.loadProjects())

        expect(mockReadTextFile).toHaveBeenCalledWith(
            'projects.json',
            expect.objectContaining({ baseDir: 'AppData' })
        )
        expect(mockSetProjects).toHaveBeenCalledWith(fixtureProjects)
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: projects.json が存在しない場合、setProjects([]) を呼ぶ', async () => {
        mockExists.mockResolvedValue(false)

        const { result } = renderHook(() => useProjectLoad())
        await act(() => result.current.loadProjects())

        expect(mockReadTextFile).not.toHaveBeenCalled()
        expect(mockSetProjects).toHaveBeenCalledWith([])
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: projects.json の JSON が不正な場合、setProjects([]) にフォールバックし toast.error を呼ぶ', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue('{ invalid json }')

        const { result } = renderHook(() => useProjectLoad())
        await act(() => result.current.loadProjects())

        expect(mockSetProjects).toHaveBeenCalledWith([])
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: Zod バリデーション失敗の場合、setProjects([]) にフォールバックし toast.error を呼ぶ', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(JSON.stringify([
            { id: '1', name: '地蔵 Core' }
        ]))

        const { result } = renderHook(() => useProjectLoad())
        await act(() => result.current.loadProjects())

        expect(mockSetProjects).toHaveBeenCalledWith([])
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: 完了後に setHydrated(true) を呼ぶ', async () => {
        mockExists.mockResolvedValue(false)

        const { result } = renderHook(() => useProjectLoad())
        await act(() => result.current.loadProjects())

        expect(mockSetHydrated).toHaveBeenCalledWith(true)
    })
})