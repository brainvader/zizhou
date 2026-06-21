/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectLoad — 起動時に一度だけ SurrealDB から projects を読み込む hook
 * @bom docs/bom/project.ts
 * @story
 * 1. loadProjects が呼び出される。
 *    invoke('list_projects') が成功した場合、結果を Zustand の setProjects() に渡す。
 * 2. invoke が失敗した場合、setProjects([]) で空配列を初期化し toast.error() でエラーを通知する。
 * 3. 完了後に setHydrated(true) を呼ぶ。
 * @output src/hooks/useProjectLoad.ts
 * @note Tauri fs（projects.json）依存は SurrealDB 移行により廃止済み
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Project } from '@/bom/project'
import { useProjectLoad } from '@/hooks/useProjectLoad'

const {
    mockToastError,
    mockSetProjects,
    mockSetHydrated,
} = vi.hoisted(() => ({
    mockToastError: vi.fn<() => void>(),
    mockSetProjects: vi.fn<() => void>(),
    mockSetHydrated: vi.fn<() => void>(),
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
    { id: '1', name: '地蔵 Core', rootPath: '/projects/zizou-core', description: 'グラフベースのプロジェクト管理OS。' },
    { id: '2', name: 'Graph Renderer', rootPath: '/projects/graph-renderer', description: 'ノード・エッジの依存関係を可視化するビューエンジン。' },
]

describe('useProjectLoad: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('logic: invoke が成功した場合、結果を setProjects に渡す', async () => {
        const mockListProjects = vi.fn().mockResolvedValue(fixtureProjects)

        const { result } = renderHook(() => useProjectLoad(mockListProjects))
        await act(() => result.current.loadProjects())

        expect(mockListProjects).toHaveBeenCalledTimes(1)
        expect(mockSetProjects).toHaveBeenCalledWith(fixtureProjects)
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: invoke が空配列を返した場合、setProjects([]) を呼ぶ', async () => {
        const mockListProjects = vi.fn().mockResolvedValue([])

        const { result } = renderHook(() => useProjectLoad(mockListProjects))
        await act(() => result.current.loadProjects())

        expect(mockSetProjects).toHaveBeenCalledWith([])
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: invoke が失敗した場合、setProjects([]) にフォールバックし toast.error を呼ぶ', async () => {
        const mockListProjects = vi.fn().mockRejectedValue(new Error('db error'))

        const { result } = renderHook(() => useProjectLoad(mockListProjects))
        await act(() => result.current.loadProjects())

        expect(mockSetProjects).toHaveBeenCalledWith([])
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: 完了後に setHydrated(true) を呼ぶ', async () => {
        const mockListProjects = vi.fn().mockResolvedValue([])

        const { result } = renderHook(() => useProjectLoad(mockListProjects))
        await act(() => result.current.loadProjects())

        expect(mockSetHydrated).toHaveBeenCalledWith(true)
    })
})